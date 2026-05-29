import { sql } from '@/lib/db';
import {
  SEQUENCE_KEY_PHASE_1,
  SEQUENCE_KEY_PHASE_2,
} from '@/lib/email-sequences/constants';
import {
  ensureEmailSequenceSchema,
  getSequenceByKey,
  seedEmailSequences,
} from '@/lib/email-sequences/schema';
import {
  isEmailUnsubscribed,
  loadAllTenantsForLifecycleSync,
  loadTenantLifecycleState,
  type TenantLifecycleState,
} from '@/lib/email-sequences/segment';
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
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
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
      AND (et.opened_at IS NOT NULL OR et.status IN ('opened', 'clicked'))
    LIMIT 1
  `;
  return r.rows.length > 0;
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
  startAt: Date
): Promise<boolean> {
  const existing = await sql`
    SELECT id, status FROM email_sequence_enrollments
    WHERE tenant_id = ${tenantId}::uuid AND sequence_id = ${sequenceId}::uuid
    LIMIT 1
  `;
  if (existing.rows.length > 0) {
    return false;
  }

  await sql`
    INSERT INTO email_sequence_enrollments (
      tenant_id, sequence_id, current_step, status, enrolled_at, next_send_at
    ) VALUES (
      ${tenantId}::uuid,
      ${sequenceId}::uuid,
      0,
      'active',
      NOW(),
      ${startAt.toISOString()}
    )
  `;
  return true;
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
      await enrollTenant(tenantId, phase2.id, new Date());
    }
  }

  return completed;
}

export async function syncLifecycleEnrollments(): Promise<{
  synced: number;
  enrolled_phase_1: number;
  enrolled_phase_2: number;
  completed: number;
}> {
  await seedEmailSequences();
  const phase1 = await getSequenceByKey(SEQUENCE_KEY_PHASE_1);
  const phase2 = await getSequenceByKey(SEQUENCE_KEY_PHASE_2);
  if (!phase1) throw new Error('Secuencia Fase 1 no encontrada');

  const tenants = await loadAllTenantsForLifecycleSync();
  let enrolledP1 = 0;
  let enrolledP2 = 0;
  let completed = 0;

  for (const state of tenants) {
    completed += await refreshEnrollmentGoals(state.tenant_id, state);

    if (state.is_unsubscribed) continue;
    if (state.phase_2_goal_met) continue;

    if (!state.phase_1_goal_met) {
      const ok = await enrollTenant(state.tenant_id, phase1.id, new Date());
      if (ok) enrolledP1++;
    }

    if (state.phase_1_goal_met && !state.phase_2_goal_met && phase2) {
      const existing = await sql`
        SELECT id FROM email_sequence_enrollments
        WHERE tenant_id = ${state.tenant_id}::uuid AND sequence_id = ${phase2.id}::uuid
        LIMIT 1
      `;
      if (existing.rows.length === 0) {
        const ok = await enrollTenant(state.tenant_id, phase2.id, new Date());
        if (ok) enrolledP2++;
      }
    }
  }

  return {
    synced: tenants.length,
    enrolled_phase_1: enrolledP1,
    enrolled_phase_2: enrolledP2,
    completed,
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
  }));
}

export async function processLifecycleEmailQueue(options?: {
  dryRun?: boolean;
  maxSends?: number;
}): Promise<ProcessResult> {
  await ensureEmailSequenceSchema();
  const sync = await syncLifecycleEnrollments();

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
      let stepIdx = enrollment.current_step;

      if (stepIdx >= steps.length) {
        await markEnrollmentCompleted(enrollment.id);
        result.completed++;
        continue;
      }

      let step = steps[stepIdx];
      const prevOpened = await previousStepWasOpened(
        state.tenant_id,
        enrollment.sequence_key,
        stepIdx
      );

      while (step && !stepMatchesConditions(step, state, prevOpened)) {
        stepIdx++;
        if (stepIdx >= steps.length) {
          await markEnrollmentCompleted(enrollment.id);
          result.completed++;
          step = undefined;
          break;
        }
        step = steps[stepIdx];
      }

      if (!step) {
        result.skipped++;
        continue;
      }

      if (options?.dryRun) {
        result.skipped++;
        continue;
      }

      const onboardingUrl = await resolveOnboardingUrlForTenant(state.email, state.tenant_id);
      const { billingUrl } = buildLifecycleUrls(state.tenant_id);

      const sendResult = await sendLifecycleEmail({
        tenantId: state.tenant_id,
        to: state.email,
        templateKey: step.template_key,
        sequenceKey: enrollment.sequence_key,
        stepOrder: step.step_order,
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

      const nextStepIndex = stepIdx + 1;
      const now = new Date();
      let nextSendAt: Date | null = null;

      if (nextStepIndex < steps.length) {
        nextSendAt = addDays(now, steps[nextStepIndex].delay_days);
      }

      await sql`
        UPDATE email_sequence_enrollments
        SET
          current_step = ${nextStepIndex},
          last_sent_at = NOW(),
          next_send_at = ${nextSendAt ? nextSendAt.toISOString() : null},
          status = ${nextStepIndex >= steps.length ? 'completed' : 'active'},
          completed_at = ${nextStepIndex >= steps.length ? new Date().toISOString() : null},
          updated_at = NOW()
        WHERE id = ${enrollment.id}::uuid
      `;

      if (nextStepIndex >= steps.length) result.completed++;
      result.sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.errors.push(`${enrollment.tenant_id}: ${msg}`);
    }
  }

  return result;
}
