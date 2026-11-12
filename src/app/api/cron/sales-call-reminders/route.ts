import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import { sql } from '@/lib/db';
import { SALES_CALL_PROJECT } from '@/lib/sales-calls/constants';
import { sendSalesCallReminderEmail } from '@/lib/sales-calls/guest-email';
import { ensureSalesCallBookingsSchema } from '@/lib/sales-calls/schema';
import { formatSlotMadrid } from '@/lib/sales-calls/slots';
import { notifySalesCallReminder } from '@/lib/sales-calls/telegram-notify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Recordatorio ~1 h antes: email al cliente + Telegram al equipo.
 * Ventana: start_at entre ahora+50min y ahora+70min.
 */
export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSalesCallBookingsSchema();
  const dryRun = req.nextUrl.searchParams.get('dryRun') === '1';
  const now = Date.now();
  const fromIso = new Date(now + 50 * 60_000).toISOString();
  const toIso = new Date(now + 70 * 60_000).toISOString();

  const r = await sql`
    SELECT id::text AS id, name, email, meeting_url, manage_token,
      start_at AT TIME ZONE 'UTC' AS start_at
    FROM sales_call_bookings
    WHERE status = 'confirmed'
      AND project = ${SALES_CALL_PROJECT}
      AND reminder_sent_at IS NULL
      AND manage_token IS NOT NULL
      AND start_at >= ${fromIso}::timestamptz
      AND start_at <= ${toIso}::timestamptz
    ORDER BY start_at ASC
    LIMIT 40
  `;

  let sent = 0;
  const errors: string[] = [];

  for (const row of r.rows) {
    const start = new Date(String(row.start_at));
    const fmt = formatSlotMadrid(start);
    const id = String(row.id);
    const email = String(row.email);
    const name = String(row.name);
    const meetingUrl = String(row.meeting_url || '');
    const manageToken = String(row.manage_token || '');

    if (dryRun) {
      sent += 1;
      continue;
    }

    try {
      const ok = await sendSalesCallReminderEmail({
        to: email,
        name,
        dateLabel: fmt.dateLabel,
        timeLabel: fmt.timeLabel,
        meetingUrl,
        manageToken,
      });
      void notifySalesCallReminder({
        name,
        email,
        dateLabel: fmt.dateLabel,
        timeLabel: fmt.timeLabel,
        meetingUrl,
      });
      if (ok) {
        await sql`
          UPDATE sales_call_bookings
          SET reminder_sent_at = NOW(), updated_at = NOW()
          WHERE id = ${id}::uuid AND reminder_sent_at IS NULL
        `;
        sent += 1;
      } else {
        // Marcar igual para no spamear si SMTP falla de forma rara;
        // Telegram al equipo ya salió.
        await sql`
          UPDATE sales_call_bookings
          SET reminder_sent_at = NOW(), updated_at = NOW()
          WHERE id = ${id}::uuid AND reminder_sent_at IS NULL
        `;
        errors.push(`${email}:email_failed`);
        sent += 1;
      }
    } catch (e) {
      errors.push(`${email}:${e instanceof Error ? e.message : 'err'}`);
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    candidates: r.rows.length,
    sent,
    errors: errors.slice(0, 10),
  });
}
