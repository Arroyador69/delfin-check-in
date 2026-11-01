/**
 * Programa recovery R1 para opens que agotaron FU A/B/C sin alta.
 * Drip: batch por ejecución (prepare / oleada), prioriza click > open reciente.
 */
import { sql } from '@/lib/db';
import {
  POL_RECOVERY_BACKFILL_BATCH,
  POL_RECOVERY_COOLDOWN_HOURS,
} from './constants';
import { ensureOpenRecoverySchema } from './ensure-recovery-schema';

export interface BackfillOpenRecoveryResult {
  dryRun: boolean;
  eligible: number;
  scheduled: number;
  schemaOk: boolean;
}

export async function backfillOpenRecovery(opts?: {
  dryRun?: boolean;
  limit?: number;
  cooldownHours?: number;
}): Promise<BackfillOpenRecoveryResult> {
  const dryRun = Boolean(opts?.dryRun);
  const limit = Math.max(1, Math.min(2000, opts?.limit ?? POL_RECOVERY_BACKFILL_BATCH));
  const cooldownH = Math.max(0, opts?.cooldownHours ?? POL_RECOVERY_COOLDOWN_HOURS);

  const schemaOk = await ensureOpenRecoverySchema();
  if (!schemaOk) {
    return { dryRun, eligible: 0, scheduled: 0, schemaOk: false };
  }

  const eligibleR = await sql`
    SELECT COUNT(*)::int AS n
    FROM public_owner_leads
    WHERE status = 'sent'
      AND opted_out = false
      AND signed_up_at IS NULL
      AND opened_at IS NOT NULL
      AND sequence_status = 'exhausted'
      AND COALESCE(recovery_status, '') = ''
      AND COALESCE(last_touch_at, sent_at, opened_at) <= NOW() - (${cooldownH}::int * INTERVAL '1 hour')
      AND NOT EXISTS (
        SELECT 1 FROM email_unsubscribes u
        WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(public_owner_leads.email))
      )
  `;
  const eligible = Number(eligibleR.rows[0]?.n || 0);

  if (dryRun || eligible === 0) {
    return { dryRun, eligible, scheduled: 0, schemaOk: true };
  }

  // Stagger: los 100 primeros due ya; el resto +1…+4 días (drip suave).
  const upd = await sql`
    WITH candidates AS (
      SELECT id,
        ROW_NUMBER() OVER (
          ORDER BY
            CASE WHEN clicked_at IS NOT NULL THEN 0 ELSE 1 END ASC,
            opened_at DESC NULLS LAST
        ) AS rn
      FROM public_owner_leads
      WHERE status = 'sent'
        AND opted_out = false
        AND signed_up_at IS NULL
        AND opened_at IS NOT NULL
        AND sequence_status = 'exhausted'
        AND COALESCE(recovery_status, '') = ''
        AND COALESCE(last_touch_at, sent_at, opened_at) <= NOW() - (${cooldownH}::int * INTERVAL '1 hour')
        AND NOT EXISTS (
          SELECT 1 FROM email_unsubscribes u
          WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(public_owner_leads.email))
        )
      ORDER BY
        CASE WHEN clicked_at IS NOT NULL THEN 0 ELSE 1 END ASC,
        opened_at DESC NULLS LAST
      LIMIT ${limit}
    )
    UPDATE public_owner_leads l
    SET
      recovery_status = 'active',
      recovery_touch_count = 0,
      sequence_status = 'active',
      next_touch_kind = 'fu_recovery',
      next_touch_at = CASE
        WHEN c.rn <= 100 THEN NOW()
        ELSE NOW() + ((LEAST(c.rn / 80, 4))::int * INTERVAL '1 day')
      END,
      notes = COALESCE(notes, '') || ${` | open_recovery_sched:${new Date().toISOString().slice(0, 10)}`},
      updated_at = NOW()
    FROM candidates c
    WHERE l.id = c.id
    RETURNING l.id
  `;

  return {
    dryRun,
    eligible,
    scheduled: upd.rows.length,
    schemaOk: true,
  };
}

/** Contadores panel / Telegram. */
export async function openRecoveryCounts(): Promise<{
  due: number;
  scheduled: number;
  exhausted: number;
  eligibleBacklog: number;
}> {
  const ok = await ensureOpenRecoverySchema();
  if (!ok) {
    return { due: 0, scheduled: 0, exhausted: 0, eligibleBacklog: 0 };
  }
  const r = await sql`
    SELECT
      COUNT(*) FILTER (
        WHERE recovery_status = 'active'
          AND next_touch_kind = 'fu_recovery'
          AND next_touch_at IS NOT NULL
          AND next_touch_at <= NOW()
          AND signed_up_at IS NULL
          AND opted_out = false
      )::int AS due,
      COUNT(*) FILTER (
        WHERE recovery_status = 'active'
          AND next_touch_kind = 'fu_recovery'
          AND next_touch_at IS NOT NULL
          AND next_touch_at > NOW()
          AND signed_up_at IS NULL
          AND opted_out = false
      )::int AS scheduled,
      COUNT(*) FILTER (WHERE recovery_status = 'exhausted')::int AS exhausted,
      COUNT(*) FILTER (
        WHERE sequence_status = 'exhausted'
          AND opened_at IS NOT NULL
          AND signed_up_at IS NULL
          AND opted_out = false
          AND COALESCE(recovery_status, '') = ''
      )::int AS eligible_backlog
    FROM public_owner_leads
    WHERE status = 'sent'
  `;
  const row = r.rows[0] || {};
  return {
    due: Number(row.due || 0),
    scheduled: Number(row.scheduled || 0),
    exhausted: Number(row.exhausted || 0),
    eligibleBacklog: Number(row.eligible_backlog || 0),
  };
}
