/**
 * Columnas recovery (opens exhausted sin alta).
 * Best-effort: si falla, el resto del outreach sigue.
 */
import { sql } from '@/lib/db';

let ensured = false;

export async function ensureOpenRecoverySchema(): Promise<boolean> {
  if (ensured) return true;
  try {
    await sql`
      ALTER TABLE public_owner_leads
        ADD COLUMN IF NOT EXISTS recovery_touch_count INTEGER DEFAULT 0
    `;
    await sql`
      ALTER TABLE public_owner_leads
        ADD COLUMN IF NOT EXISTS recovery_status VARCHAR(32)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_pol_recovery_due
        ON public_owner_leads (next_touch_at)
        WHERE next_touch_kind = 'fu_recovery'
          AND COALESCE(recovery_status, '') = 'active'
    `;
    ensured = true;
    return true;
  } catch (e) {
    console.warn(
      '[open-recovery] schema:',
      e instanceof Error ? e.message : e
    );
    return false;
  }
}
