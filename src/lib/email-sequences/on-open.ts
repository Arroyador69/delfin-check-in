import { sql } from '@/lib/db';
import { LIFECYCLE_DAYS_AFTER_OPEN } from '@/lib/email-sequences/constants';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Acelera el siguiente envío cuando se detecta apertura de un mail lifecycle. */
export async function accelerateLifecycleOnEmailOpen(emailId: string): Promise<void> {
  try {
    const row = await sql`
      SELECT
        et.metadata,
        et.opened_at,
        et.clicked_at
      FROM email_tracking et
      WHERE et.id = ${emailId}::uuid
        AND et.metadata->>'lifecycle' = 'true'
      LIMIT 1
    `;
    if (!row.rows[0]) return;

    const meta = row.rows[0].metadata as {
      enrollment_id?: string;
      step_order?: number;
    } | null;
    const enrollmentId = meta?.enrollment_id;
    if (!enrollmentId) return;

    const openAt = row.rows[0].opened_at || row.rows[0].clicked_at || new Date();
    const nextAt = addDays(new Date(openAt), LIFECYCLE_DAYS_AFTER_OPEN);

    await sql`
      UPDATE email_sequence_enrollments
      SET
        next_send_at = CASE
          WHEN next_send_at IS NULL OR next_send_at > ${nextAt.toISOString()}::timestamptz
          THEN ${nextAt.toISOString()}::timestamptz
          ELSE next_send_at
        END,
        updated_at = NOW()
      WHERE id = ${enrollmentId}::uuid
        AND status = 'active'
    `;
  } catch (e) {
    console.warn('accelerateLifecycleOnEmailOpen:', e);
  }
}
