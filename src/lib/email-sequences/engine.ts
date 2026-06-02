import { sql } from '@/lib/db';
import {
  SEQUENCE_KEY_PHASE_1,
  SEQUENCE_KEY_PHASE_2,
  LIFECYCLE_DAYS_AFTER_OPEN,
  LIFECYCLE_DAYS_WITHOUT_OPEN_RETRY,
  LIFECYCLE_MAX_RETRIES_PER_STEP,
  LIFECYCLE_SLOW_RETRY_DAYS,
} from '@/lib/email-sequences/constants';
import {
  ensureEmailSequenceSchema,
  getSequenceByKey,
  seedEmailSequences,
} from '@/lib/email-sequences/schema';
import {
  inferPhase1StartStep,
  isEmailUnsubscribed,
  loadAllTenantsForLifecycleSync,
  loadTenantLifecycleState,
  type TenantLifecycleState,
} from '@/lib/email-sequences/segment';
import { reconcileLifecycleEngagement } from '@/lib/email-sequences/engagement-reconcile';
import { sendLifecycleEmail, buildLifecycleUrls } from '@/lib/email-sequences/send';
import {
  buildOnboardingUrl,
  findOnboardingOwnerByEmail,
  issueFreshOnboardingToken,
} from '@/lib/onboarding-magic-link';

export interface ProcessResult {
  synced: number;
  enrolled_phase_1: number;
  enrolled_phase_2: number;
  completed: number;
  sent: number;
  skipped: number;
  errors: string[];
}

type StepRow = {
  id: string;
  step_order: number;
  template_key: string;
  delay_days: number;
  condition_json: Record<string, unknown> | null;
};

type EnrollmentRow = {
  id: string;
  tenant_id: string;
  sequence_id: string;
  sequence_key: string;
  current_step: number;
  status: string;
  next_send_at: Date | string | null;
  last_sent_at: Date | string | null;
  metadata: Record<string, unknown> | null;
};

type StepEmailState = {
  has_any_send: boolean;
  has_opened: boolean;
  latest_sent_at: Date | null;
  first_opened_at: Date | null;
  send_count: number;
};

function parseMetadata(raw: unknown): { step_retry_count: number } {
  if (!raw || typeof raw !== 'object') return { step_retry_count: 0 };
  const m = raw as { step_retry_count?: number };
  return { step_retry_count: Number(m.step_retry_count || 0) };
}

async function getStepEmailState(
  enrollmentId: string,
  stepOrder: number
): Promise<StepEmailState> {
  const r = await sql`
    SELECT
      COUNT(*)::int AS send_count,
      MAX(created_at) AS latest_sent_at,
      MIN(opened_at) FILTER (WHERE opened_at IS NOT NULL) AS first_opened_at,
      MIN(clicked_at) FILTER (WHERE clicked_at IS NOT NULL) AS first_clicked_at,
      BOOL_OR(
        opened_at IS NOT NULL
        OR status IN ('opened', 'clicked')
        OR COALESCE(opened_count, 0) > 0
      ) AS has_opened
    FROM email_tracking
    WHERE (
        metadata @> '{"lifecycle":true}'::jsonb
        OR metadata->>'lifecycle' = 'true'
      )
      AND metadata->>'enrollment_id' = ${enrollmentId}
      AND (metadata->>'step_order')::int = ${stepOrder}
  `;
  const row = r.rows[0];
  const sendCount = Number(row?.send_count || 0);
  const opened =
    Boolean(row?.has_opened) ||
    Boolean(row?.first_opened_at) ||
    Boolean(row?.first_clicked_at);
  const openAt = row?.first_opened_at || row?.first_clicked_at;
  return {
    has_any_send: sendCount > 0,
    has_opened: opened,
    latest_sent_at: row?.latest_sent_at ? new Date(row.latest_sent_at) : null,
    first_opened_at: openAt ? new Date(openAt) : null,
    send_count: sendCount,
  };
}

async function updateEnrollmentSchedule(
  enrollmentId: string,
  patch: {
    current_step?: number;
    next_send_at: Date | null;
    status?: string;
    completed_at?: Date | null;
    metadata?: Record<string, unknown>;
    touch_last_sent?: boolean;
  }
): Promise<void> {
  const metaJson = patch.metadata ? JSON.stringify(patch.metadata) : null;
  await sql`
    UPDATE email_sequence_enrollments
    SET
      current_step = COALESCE(${patch.current_step ?? null}, current_step),
      last_sent_at = CASE WHEN ${patch.touch_last_sent === true} THEN NOW() ELSE last_sent_at END,
      next_send_at = ${patch.next_send_at ? patch.next_send_at.toISOString() : null},
      status = COALESCE(${patch.status ?? null}, status),
      completed_at = ${patch.completed_at ? patch.completed_at.toISOString() : null},
      metadata = COALESCE(${metaJson}::jsonb, metadata),
      updated_at = NOW()
    WHERE id = ${enrollmentId}::uuid
  `;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Envío inmediato en el siguiente cron / run manual. */
function immediateSendAt(): Date {
  return new Date(Date.now() - 60_000);
}

function parseCondition(json: Record<string, unknown> | null): {
  onboarding_status_in?: string[];
  require_not_opened_previous?: boolean;
} {
  if (!json || typeof json !== 'object') return {};
  return json as {
    onboarding_status_in?: string[];
    require_not_opened_previous?: boolean;
  };
}

async function getStepsForSequence(sequenceId: string): Promise<StepRow[]> {
  const r = await sql`
    SELECT id, step_order, template_key, delay_days, condition_json
    FROM email_sequence_steps
    WHERE sequence_id = ${sequenceId}::uuid AND active = true
    ORDER BY step_order ASC
  `;
  return r.rows.map((row) => ({
    id: String(row.id),
    step_order: Number(row.step_order),
    template_key: String(row.template_key),
    delay_days: Number(row.delay_days),
    condition_json: row.condition_json as Record<string, unknown> | null,
  }));
}

async function resolveOnboardingUrlForTenant(
  email: string,
  tenantId: string
): Promise<string> {
  const { onboardingUrl: fallback } = buildLifecycleUrls(tenantId);
  try {
    const owner = await findOnboardingOwnerByEmail(email);
    if (!owner?.user_id) return fallback;
    const { token } = await issueFreshOnboardingToken(owner.user_id);
    return buildOnboardingUrl(token, 'es');
  } catch (e) {
    console.warn('resolveOnboardingUrlForTenant:', e);
    return fallback;
  }
}

async function previousStepWasOpened(
  tenantId: string,
  sequenceKey: string,
  stepOrder: number
): Promise<boolean> {
  if (stepOrder <= 0) return true;
  const r = await sql`
    SELECT 1 FROM email_tracking et
    WHERE et.tenant_id = ${tenantId}::uuid
      AND et.metadata->>'sequence_key' = ${sequenceKey}
      AND (et.metadata->>'step_order')::int = ${stepOrder - 1}
      AND (et.opened_at IS NOT NULL OR et.clicked_at IS NOT NULL OR et.status IN ('opened', 'clicked'))
    LIMIT 1
  `;
  return r.rows.length > 0;
}

/** Encuentra el índice del primer paso aplicable desde `fromIndex`. */
async function resolveApplicableStepIndex(
  steps: StepRow[],
  fromIndex: number,
  state: TenantLifecycleState,
  sequenceKey: string
): Promise<number> {
  let idx = fromIndex;
  while (idx < steps.length) {
    const prevOpened = await previousStepWasOpened(state.tenant_id, sequenceKey, idx);
    if (stepMatchesConditions(steps[idx], state, prevOpened)) return idx;
    idx++;
  }
  return idx;
}

function stepMatchesConditions(
  step: StepRow,
  state: TenantLifecycleState,
  previousOpened: boolean
): boolean {
  const cond = parseCondition(step.condition_json);
  if (cond.onboarding_status_in?.length) {
    const st = state.onboarding_status || 'pending';
    if (!cond.onboarding_status_in.includes(st)) return false;
  }
  if (cond.require_not_opened_previous && previousOpened) return false;
  return true;
}

async function enrollTenant(
  tenantId: string,
  sequenceId: string,
  sequenceKey: string,
  startAt: Date,
  state: TenantLifecycleState
): Promise<boolean> {
  const existing = await sql`
    SELECT id, status FROM email_sequence_enrollments
    WHERE tenant_id = ${tenantId}::uuid AND sequence_id = ${sequenceId}::uuid
    LIMIT 1
  `;
  if (existing.rows.length > 0) {
    return false;
  }

  const steps = await getStepsForSequence(sequenceId);
  let startStep = 0;
  if (sequenceKey === SEQUENCE_KEY_PHASE_1) {
    const inferred = inferPhase1StartStep(state);
    startStep = await resolveApplicableStepIndex(steps, inferred, state, sequenceKey);
  }

  await sql`
    INSERT INTO email_sequence_enrollments (
      tenant_id, sequence_id, current_step, status, enrolled_at, next_send_at
    ) VALUES (
      ${tenantId}::uuid,
      ${sequenceId}::uuid,
      ${startStep},
      'active',
      NOW(),
      ${startAt.toISOString()}
    )
  `;
  return true;
}

/** Sin envíos lifecycle aún: ajusta paso según onboarding y deja listo para enviar. */
async function bootstrapEnrollmentIfNeeded(
  enrollmentId: string,
  tenantId: string,
  sequenceId: string,
  sequenceKey: string,
  currentStep: number
): Promise<boolean> {
  const sent = await sql`
    SELECT 1 FROM email_tracking
    WHERE (
        metadata @> '{"lifecycle":true}'::jsonb
        OR metadata->>'lifecycle' = 'true'
      )
      AND metadata->>'enrollment_id' = ${enrollmentId}
    LIMIT 1
  `;
  if (sent.rows.length > 0) return false;

  const state = await loadTenantLifecycleState(tenantId);
  if (!state) return false;

  const steps = await getStepsForSequence(sequenceId);
  let targetStep = currentStep;
  if (sequenceKey === SEQUENCE_KEY_PHASE_1) {
    const inferred = inferPhase1StartStep(state);
    targetStep = await resolveApplicableStepIndex(
      steps,
      Math.max(currentStep, inferred),
      state,
      sequenceKey
    );
  }

  await sql`
    UPDATE email_sequence_enrollments
    SET
      current_step = ${targetStep},
      next_send_at = ${immediateSendAt().toISOString()},
      updated_at = NOW()
    WHERE id = ${enrollmentId}::uuid
      AND status = 'active'
  `;
  return targetStep !== currentStep;
}

/** Sin ningún envío lifecycle: deja la inscripción lista para el cron o «Activar». */
async function queueEnrollmentForFirstSend(enrollmentId: string): Promise<void> {
  await sql`
    UPDATE email_sequence_enrollments
    SET next_send_at = ${immediateSendAt().toISOString()}, updated_at = NOW()
    WHERE id = ${enrollmentId}::uuid
      AND status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM email_tracking et
        WHERE (
        et.metadata @> '{"lifecycle":true}'::jsonb
        OR et.metadata->>'lifecycle' = 'true'
      )
          AND et.metadata->>'enrollment_id' = ${enrollmentId}
      )
  `;
}

async function markEnrollmentCompleted(enrollmentId: string): Promise<void> {
  await sql`
    UPDATE email_sequence_enrollments
    SET status = 'completed', completed_at = NOW(), next_send_at = NULL, updated_at = NOW()
    WHERE id = ${enrollmentId}::uuid
  `;
}

async function refreshEnrollmentGoals(
  tenantId: string,
  state: TenantLifecycleState
): Promise<number> {
  let completed = 0;

  const phase1 = await getSequenceByKey(SEQUENCE_KEY_PHASE_1);
  if (phase1 && state.phase_1_goal_met) {
    const r = await sql`
      UPDATE email_sequence_enrollments
      SET status = 'completed', completed_at = NOW(), next_send_at = NULL, updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid
        AND sequence_id = ${phase1.id}::uuid
        AND status = 'active'
      RETURNING id
    `;
    completed += r.rows.length;
  }

  const phase2 = await getSequenceByKey(SEQUENCE_KEY_PHASE_2);
  if (phase2 && state.phase_2_goal_met) {
    const r = await sql`
      UPDATE email_sequence_enrollments
      SET status = 'completed', completed_at = NOW(), next_send_at = NULL, updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid
        AND sequence_id = ${phase2.id}::uuid
        AND status = 'active'
      RETURNING id
    `;
    completed += r.rows.length;
  }

  if (state.phase_1_goal_met && phase2 && !state.is_unsubscribed && !state.phase_2_goal_met) {
    const already = await sql`
      SELECT id FROM email_sequence_enrollments
      WHERE tenant_id = ${tenantId}::uuid AND sequence_id = ${phase2.id}::uuid
      LIMIT 1
    `;
    if (already.rows.length === 0) {
      const st = await loadTenantLifecycleState(tenantId);
      if (st) await enrollTenant(tenantId, phase2.id, SEQUENCE_KEY_PHASE_2, immediateSendAt(), st);
    }
  }

  return completed;
}

export async function syncLifecycleEnrollments(): Promise<{
  synced: number;
  enrolled_phase_1: number;
  enrolled_phase_2: number;
  completed: number;
  bootstrapped: number;
  due_now: number;
  eligible_phase_1: number;
  eligible_phase_2: number;
  skipped_unsubscribed: number;
  skipped_paid: number;
}> {
  await ensureEmailSequenceSchema();
  await seedEmailSequences();
  const phase1 = await getSequenceByKey(SEQUENCE_KEY_PHASE_1);
  const phase2 = await getSequenceByKey(SEQUENCE_KEY_PHASE_2);
  if (!phase1) throw new Error('Secuencia Fase 1 no encontrada');

  const tenants = await loadAllTenantsForLifecycleSync();
  let enrolledP1 = 0;
  let enrolledP2 = 0;
  let completed = 0;
  let bootstrapped = 0;
  let eligibleP1 = 0;
  let eligibleP2 = 0;
  let skippedUnsub = 0;
  let skippedPaid = 0;

  for (const state of tenants) {
    completed += await refreshEnrollmentGoals(state.tenant_id, state);

    if (state.is_unsubscribed) {
      skippedUnsub++;
      continue;
    }
    if (state.phase_2_goal_met) {
      skippedPaid++;
      continue;
    }

    if (!state.phase_1_goal_met) {
      eligibleP1++;
      const ok = await enrollTenant(
        state.tenant_id,
        phase1.id,
        SEQUENCE_KEY_PHASE_1,
        immediateSendAt(),
        state
      );
      if (ok) enrolledP1++;
    }

    if (state.phase_1_goal_met && !state.phase_2_goal_met && phase2) {
      eligibleP2++;
      const existing = await sql`
        SELECT id FROM email_sequence_enrollments
        WHERE tenant_id = ${state.tenant_id}::uuid AND sequence_id = ${phase2.id}::uuid
        LIMIT 1
      `;
      if (existing.rows.length === 0) {
        const ok = await enrollTenant(
          state.tenant_id,
          phase2.id,
          SEQUENCE_KEY_PHASE_2,
          immediateSendAt(),
          state
        );
        if (ok) enrolledP2++;
      }
    }
  }

  const activeEnrollments = await sql`
    SELECT
      e.id,
      e.tenant_id,
      e.sequence_id,
      e.current_step,
      s.key AS sequence_key
    FROM email_sequence_enrollments e
    JOIN email_sequences s ON s.id = e.sequence_id
    WHERE e.status = 'active'
  `;

  for (const row of activeEnrollments.rows) {
    const id = String(row.id);
    const changed = await bootstrapEnrollmentIfNeeded(
      id,
      String(row.tenant_id),
      String(row.sequence_id),
      String(row.sequence_key),
      Number(row.current_step)
    );
    if (changed) bootstrapped++;
    await queueEnrollmentForFirstSend(id);
  }

  const dueR = await sql`
    SELECT COUNT(*)::int AS c FROM email_sequence_enrollments
    WHERE status = 'active' AND next_send_at IS NOT NULL AND next_send_at <= NOW()
  `;

  return {
    synced: tenants.length,
    enrolled_phase_1: enrolledP1,
    enrolled_phase_2: enrolledP2,
    completed,
    bootstrapped,
    due_now: Number(dueR.rows[0]?.c || 0),
    eligible_phase_1: eligibleP1,
    eligible_phase_2: eligibleP2,
    skipped_unsubscribed: skippedUnsub,
    skipped_paid: skippedPaid,
  };
}

async function loadDueEnrollments(limit = 50): Promise<EnrollmentRow[]> {
  const r = await sql`
    SELECT
      e.id,
      e.tenant_id,
      e.sequence_id,
      e.current_step,
      e.status,
      e.next_send_at,
      e.last_sent_at,
      e.metadata,
      s.key AS sequence_key
    FROM email_sequence_enrollments e
    JOIN email_sequences s ON s.id = e.sequence_id
    WHERE e.status = 'active'
      AND e.next_send_at IS NOT NULL
      AND e.next_send_at <= NOW()
    ORDER BY e.next_send_at ASC
    LIMIT ${limit}
  `;
  return r.rows.map((row) => ({
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    sequence_id: String(row.sequence_id),
    sequence_key: String(row.sequence_key),
    current_step: Number(row.current_step),
    status: String(row.status),
    next_send_at: row.next_send_at,
    last_sent_at: row.last_sent_at,
    metadata: row.metadata as Record<string, unknown> | null,
  }));
}

export async function processLifecycleEmailQueue(options?: {
  dryRun?: boolean;
  maxSends?: number;
  skipReconcile?: boolean;
}): Promise<ProcessResult> {
  await ensureEmailSequenceSchema();
  const sync = await syncLifecycleEnrollments();
  if (!options?.skipReconcile && !options?.dryRun) {
    await reconcileLifecycleEngagement();
  }

  const result: ProcessResult = {
    synced: sync.synced,
    enrolled_phase_1: sync.enrolled_phase_1,
    enrolled_phase_2: sync.enrolled_phase_2,
    completed: sync.completed,
    sent: 0,
    skipped: 0,
    errors: [],
  };

  const maxSends = options?.maxSends ?? 40;
  const due = await loadDueEnrollments(maxSends);

  for (const enrollment of due) {
    if (result.sent >= maxSends) break;

    try {
      const state = await loadTenantLifecycleState(enrollment.tenant_id);
      if (!state || !state.email) {
        result.skipped++;
        continue;
      }

      if (await isEmailUnsubscribed(state.email)) {
        await sql`
          UPDATE email_sequence_enrollments SET status = 'paused', updated_at = NOW()
          WHERE id = ${enrollment.id}::uuid
        `;
        result.skipped++;
        continue;
      }

      const goalMet =
        enrollment.sequence_key === SEQUENCE_KEY_PHASE_1
          ? state.phase_1_goal_met
          : state.phase_2_goal_met;

      if (goalMet) {
        await markEnrollmentCompleted(enrollment.id);
        result.completed++;
        continue;
      }

      const steps = await getStepsForSequence(enrollment.sequence_id);
      let stepIdx = await resolveApplicableStepIndex(
        steps,
        enrollment.current_step,
        state,
        enrollment.sequence_key
      );

      if (stepIdx >= steps.length) {
        await markEnrollmentCompleted(enrollment.id);
        result.completed++;
        continue;
      }

      if (stepIdx !== enrollment.current_step) {
        await sql`
          UPDATE email_sequence_enrollments
          SET current_step = ${stepIdx}, updated_at = NOW()
          WHERE id = ${enrollment.id}::uuid
        `;
      }

      const step = steps[stepIdx];
      const meta = parseMetadata(enrollment.metadata);
      const emailState = await getStepEmailState(enrollment.id, step.step_order);
      const now = new Date();

      if (options?.dryRun) {
        result.skipped++;
        continue;
      }

      const onboardingUrl = await resolveOnboardingUrlForTenant(state.email, state.tenant_id);
      const { billingUrl } = buildLifecycleUrls(state.tenant_id);

      const sendStep = async (isRetry: boolean, retryNumber: number) => {
        return sendLifecycleEmail({
          tenantId: state.tenant_id,
          to: state.email,
          templateKey: step.template_key,
          sequenceKey: enrollment.sequence_key,
          stepOrder: step.step_order,
          enrollmentId: enrollment.id,
          isRetry,
          retryNumber,
          templateParams: {
            ownerName: state.name,
            onboardingUrl,
            billingUrl,
            onboardingStatus: state.onboarding_status,
          },
        });
      };

      // --- Sin envío aún en este paso: primer mail del paso ---
      if (!emailState.has_any_send) {
        const sendResult = await sendStep(false, 0);
        if (!sendResult.success) {
          result.errors.push(`${state.email}: ${sendResult.error || 'send failed'}`);
          continue;
        }
        await updateEnrollmentSchedule(enrollment.id, {
          next_send_at: addDays(now, LIFECYCLE_DAYS_WITHOUT_OPEN_RETRY),
          metadata: { ...meta, step_retry_count: 0 },
          touch_last_sent: true,
        });
        result.sent++;
        continue;
      }

      // --- Abrió (o clic): al día siguiente, siguiente paso ---
      if (emailState.has_opened && emailState.first_opened_at) {
        const sendNextAt = addDays(emailState.first_opened_at, LIFECYCLE_DAYS_AFTER_OPEN);
        if (now < sendNextAt) {
          await updateEnrollmentSchedule(enrollment.id, {
            next_send_at: sendNextAt,
            metadata: { step_retry_count: 0 },
          });
          result.skipped++;
          continue;
        }

        const nextIdx = await resolveApplicableStepIndex(
          steps,
          stepIdx + 1,
          state,
          enrollment.sequence_key
        );

        if (nextIdx >= steps.length) {
          await markEnrollmentCompleted(enrollment.id);
          result.completed++;
          continue;
        }

        const nextStep = steps[nextIdx];
        const sendResult = await sendLifecycleEmail({
          tenantId: state.tenant_id,
          to: state.email,
          templateKey: nextStep.template_key,
          sequenceKey: enrollment.sequence_key,
          stepOrder: nextStep.step_order,
          enrollmentId: enrollment.id,
          templateParams: {
            ownerName: state.name,
            onboardingUrl,
            billingUrl,
            onboardingStatus: state.onboarding_status,
          },
        });
        if (!sendResult.success) {
          result.errors.push(`${state.email}: ${sendResult.error || 'send failed'}`);
          continue;
        }

        await sql`
          UPDATE email_sequence_enrollments
          SET
            current_step = ${nextIdx},
            last_sent_at = NOW(),
            next_send_at = ${addDays(now, LIFECYCLE_DAYS_WITHOUT_OPEN_RETRY).toISOString()},
            metadata = ${JSON.stringify({ step_retry_count: 0 })}::jsonb,
            updated_at = NOW()
          WHERE id = ${enrollment.id}::uuid
        `;
        result.sent++;
        continue;
      }

      // --- No abrió: reintentar tras N días (mismo paso) ---
      const lastSent = emailState.latest_sent_at || now;
      const retryDelay =
        meta.step_retry_count >= LIFECYCLE_MAX_RETRIES_PER_STEP
          ? LIFECYCLE_SLOW_RETRY_DAYS
          : LIFECYCLE_DAYS_WITHOUT_OPEN_RETRY;
      const retryAt = addDays(lastSent, retryDelay);

      if (now < retryAt) {
        await updateEnrollmentSchedule(enrollment.id, {
          next_send_at: retryAt,
          metadata: meta,
        });
        result.skipped++;
        continue;
      }

      const retryNum = meta.step_retry_count + 1;
      const sendResult = await sendStep(true, retryNum);
      if (!sendResult.success) {
        result.errors.push(`${state.email}: ${sendResult.error || 'send failed'}`);
        continue;
      }

      await updateEnrollmentSchedule(enrollment.id, {
        next_send_at: addDays(now, retryDelay),
        metadata: { step_retry_count: retryNum },
        touch_last_sent: true,
      });
      result.sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`${enrollment.tenant_id}: ${msg}`);
    }
  }

  return result;
}

/** Inscribe un tenant recién creado en Fase 1 si aplica (no lanza errores). */
export async function maybeEnrollNewTenantInLifecycle(tenantId: string): Promise<void> {
  try {
    await seedEmailSequences();
    const phase1 = await getSequenceByKey(SEQUENCE_KEY_PHASE_1);
    if (!phase1) return;

    const state = await loadTenantLifecycleState(tenantId);
    if (!state || state.is_unsubscribed || state.phase_1_goal_met || state.phase_2_goal_met) return;

    await enrollTenant(
      tenantId,
      phase1.id,
      SEQUENCE_KEY_PHASE_1,
      immediateSendAt(),
      state
    );
  } catch (e) {
    console.warn('maybeEnrollNewTenantInLifecycle:', e);
  }
}
