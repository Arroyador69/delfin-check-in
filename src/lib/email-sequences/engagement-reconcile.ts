import { sql } from '@/lib/db';
import {
  LIFECYCLE_DAYS_AFTER_OPEN,
  LIFECYCLE_DAYS_WITHOUT_OPEN_RETRY,
  LIFECYCLE_MAX_RETRIES_PER_STEP,
  LIFECYCLE_SLOW_RETRY_DAYS,
} from '@/lib/email-sequences/constants';
import { accelerateLifecycleOnEmailOpen } from '@/lib/email-sequences/on-open';

export interface ReconcileEngagementResult {
  enrollments_scanned: number;
  schedules_corrected: number;
  opens_inferred: number;
  due_now_after: number;
  details: string[];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function parseRetryCount(metadata: unknown): number {
  if (!metadata || typeof metadata !== 'object') return 0;
  return Number((metadata as { step_retry_count?: number }).step_retry_count || 0);
}

type PendingRow = {
  enrollment_id: string;
  tenant_id: string;
  current_step: number;
  metadata: unknown;
  step_order: number;
  latest_sent_at: Date;
  tracking_id: string;
  tracking_metadata: unknown;
  has_open: boolean;
};

async function tenantHadEngagementAfter(
  tenantId: string,
  after: Date
): Promise<{ ok: boolean; reason: string }> {
  const afterIso = after.toISOString();

  const login = await sql`
    SELECT 1 FROM user_activity
    WHERE tenant_id = ${tenantId}::uuid
      AND activity_type = 'login'
      AND created_at > ${afterIso}::timestamptz
    LIMIT 1
  `;
  if (login.rows.length > 0) {
    return { ok: true, reason: 'login_after_send' };
  }

  const progress = await sql`
    SELECT 1 FROM user_activity
    WHERE tenant_id = ${tenantId}::uuid
      AND activity_type IN (
        'property_created',
        'reservation_created',
        'xml_sent',
        'checkin'
      )
      AND created_at > ${afterIso}::timestamptz
    LIMIT 1
  `;
  if (progress.rows.length > 0) {
    return { ok: true, reason: 'product_activity_after_send' };
  }

  return { ok: false, reason: '' };
}

async function inferOpenOnTracking(
  trackingId: string,
  reason: string,
  inferredAt: Date
): Promise<boolean> {
  const at = inferredAt.toISOString();
  const patch = JSON.stringify({
    inferred_open: true,
    inferred_reason: reason,
    inferred_at: at,
  });

  const updated = await sql`
    UPDATE email_tracking
    SET
      status = CASE WHEN status = 'clicked' THEN status ELSE 'opened' END,
      opened_at = COALESCE(opened_at, ${at}::timestamptz),
      opened_count = COALESCE(opened_count, 0) + 1,
      metadata = COALESCE(metadata, '{}'::jsonb) || ${patch}::jsonb,
      updated_at = NOW()
    WHERE id = ${trackingId}::uuid
      AND opened_at IS NULL
      AND status NOT IN ('opened', 'clicked')
    RETURNING id
  `;

  if (!updated.rows.length) return false;

  await accelerateLifecycleOnEmailOpen(trackingId);
  return true;
}

/**
 * Alinea calendarios y recupera aperturas «perdidas» en mails ya enviados (pixel antiguo).
 * - Sin apertura registrada + envío hace ≥4 días → next_send_at listo para reintento (cron / Enviar pendientes).
 * - Sin apertura + actividad real en la app tras el envío → inferir apertura y programar siguiente paso (+1 día).
 */
export async function reconcileLifecycleEngagement(options?: {
  dryRun?: boolean;
  maxInferences?: number;
}): Promise<ReconcileEngagementResult> {
  const dryRun = Boolean(options?.dryRun);
  const maxInferences = options?.maxInferences ?? 200;
  const now = new Date();
  const details: string[] = [];
  let schedulesCorrected = 0;
  let opensInferred = 0;

  const rows = await sql`
    SELECT
      e.id AS enrollment_id,
      e.tenant_id,
      e.current_step,
      e.metadata,
      e.next_send_at,
      (et.metadata->>'step_order')::int AS step_order,
      et.id AS tracking_id,
      et.metadata AS tracking_metadata,
      et.created_at AS latest_sent_at,
      (
        et.opened_at IS NOT NULL
        OR et.clicked_at IS NOT NULL
        OR et.status IN ('opened', 'clicked')
        OR COALESCE(et.opened_count, 0) > 0
      ) AS has_open
    FROM email_sequence_enrollments e
    JOIN LATERAL (
      SELECT et.*
      FROM email_tracking et
      WHERE (
          et.metadata @> '{"lifecycle":true}'::jsonb
          OR et.metadata->>'lifecycle' = 'true'
        )
        AND et.metadata->>'enrollment_id' = e.id::text
        AND (et.metadata->>'step_order')::int = e.current_step
      ORDER BY et.created_at DESC
      LIMIT 1
    ) et ON true
    WHERE e.status = 'active'
  `;

  const pending: PendingRow[] = rows.rows.map((r) => ({
    enrollment_id: String(r.enrollment_id),
    tenant_id: String(r.tenant_id),
    current_step: Number(r.current_step),
    metadata: r.metadata,
    step_order: Number(r.step_order),
    latest_sent_at: new Date(r.latest_sent_at),
    tracking_id: String(r.tracking_id),
    tracking_metadata: r.tracking_metadata,
    has_open: Boolean(r.has_open),
  }));

  for (const row of pending) {
    const retryCount = parseRetryCount(row.metadata);
    const retryDelay =
      retryCount >= LIFECYCLE_MAX_RETRIES_PER_STEP
        ? LIFECYCLE_SLOW_RETRY_DAYS
        : LIFECYCLE_DAYS_WITHOUT_OPEN_RETRY;
    const retryAt = addDays(row.latest_sent_at, retryDelay);

    if (!row.has_open) {
      // Si entró en la app tras el envío (aunque el pixel no cargara), cuenta como apertura.
      if (opensInferred < maxInferences) {
        const engagement = await tenantHadEngagementAfter(
          row.tenant_id,
          row.latest_sent_at
        );
        if (engagement.ok) {
          if (!dryRun) {
            const ok = await inferOpenOnTracking(
              row.tracking_id,
              engagement.reason,
              now
            );
            if (ok) {
              opensInferred++;
              const nextAt = addDays(now, LIFECYCLE_DAYS_AFTER_OPEN);
              await sql`
                UPDATE email_sequence_enrollments
                SET
                  next_send_at = ${nextAt.toISOString()}::timestamptz,
                  metadata = COALESCE(metadata, '{}'::jsonb) || '{"step_retry_count":0}'::jsonb,
                  updated_at = NOW()
                WHERE id = ${row.enrollment_id}::uuid
              `;
              schedulesCorrected++;
              details.push(
                `infer_open:${row.enrollment_id.slice(0, 8)} (${engagement.reason})`
              );
            }
          } else {
            opensInferred++;
          }
          continue;
        }
      }

      const targetNext =
        now >= retryAt ? new Date(now.getTime() - 60_000) : retryAt;

      if (!dryRun) {
        await sql`
          UPDATE email_sequence_enrollments
          SET next_send_at = ${targetNext.toISOString()}::timestamptz, updated_at = NOW()
          WHERE id = ${row.enrollment_id}::uuid
            AND status = 'active'
            AND (
              next_send_at IS NULL
              OR next_send_at > ${targetNext.toISOString()}::timestamptz
            )
        `;
      }
      schedulesCorrected++;
    } else {
      const openNext = addDays(row.latest_sent_at, LIFECYCLE_DAYS_AFTER_OPEN);
      const targetNext = now >= openNext ? new Date(now.getTime() - 60_000) : openNext;
      if (!dryRun && now >= openNext) {
        await sql`
          UPDATE email_sequence_enrollments
          SET next_send_at = ${targetNext.toISOString()}::timestamptz, updated_at = NOW()
          WHERE id = ${row.enrollment_id}::uuid
            AND status = 'active'
            AND (next_send_at IS NULL OR next_send_at > NOW())
        `;
        schedulesCorrected++;
      }
    }
  }

  const dueR = await sql`
    SELECT COUNT(*)::int AS c FROM email_sequence_enrollments
    WHERE status = 'active' AND next_send_at IS NOT NULL AND next_send_at <= NOW()
  `;

  return {
    enrollments_scanned: pending.length,
    schedules_corrected: schedulesCorrected,
    opens_inferred: opensInferred,
    due_now_after: Number(dueR.rows[0]?.c || 0),
    details: details.slice(0, 30),
  };
}
