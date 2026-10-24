import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendTelegramMessage, formatDailyReport } from '@/lib/telegram';
import {
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
} from '@/lib/public-owner-leads/constants';

/**
 * Cron ~19:00 Europe/Madrid (17:00 UTC en CEST):
 * Repaso Telegram de captación del día (meta 20 altas).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const newLeadsResult = await sql`
      SELECT email, name, source, created_at
      FROM waitlist
      WHERE created_at >= ${yesterday}
      ORDER BY created_at DESC
    `;
    const totalResult = await sql`SELECT COUNT(*) as total FROM waitlist`;
    const newLeads = newLeadsResult.rows.length;
    const totalLeads = parseInt(String(totalResult.rows[0].total), 10);

    let outreach = null;
    const meta = await sql`SELECT to_regclass('public.public_owner_leads') AS reg`;
    if (meta.rows[0]?.reg) {
      const o = await sql`
        SELECT
          COUNT(*) FILTER (
            WHERE status = 'sent'
              AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
                AT TIME ZONE 'Europe/Madrid'
          )::int AS sent,
          COUNT(*) FILTER (
            WHERE opened_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
              AT TIME ZONE 'Europe/Madrid'
          )::int AS opened,
          COUNT(*) FILTER (
            WHERE clicked_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
              AT TIME ZONE 'Europe/Madrid'
          )::int AS clicked,
          COUNT(*) FILTER (
            WHERE status = 'bounced'
              AND updated_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
                AT TIME ZONE 'Europe/Madrid'
          )::int AS bounced,
          COUNT(*) FILTER (
            WHERE signed_up_at >= date_trunc('day', NOW() AT TIME ZONE 'Europe/Madrid')
              AT TIME ZONE 'Europe/Madrid'
          )::int AS signed_up
        FROM public_owner_leads
      `;
      const row = o.rows[0] || {};
      outreach = {
        sent: Number(row.sent || 0),
        opened: Number(row.opened || 0),
        clicked: Number(row.clicked || 0),
        bounced: Number(row.bounced || 0),
        signedUp: Number(row.signed_up || 0),
        dailyCap: PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
        signupGoal: PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
      };
    }

    let message = formatDailyReport({
      newLeads,
      totalLeads,
      newLeadsList: newLeadsResult.rows.map((row) => ({
        email: row.email,
        name: row.name,
        source: row.source,
        created_at: row.created_at,
      })),
      outreach,
    });
    message = message.replace(
      'Informe diario 11:00',
      'Repaso captación 19:00'
    );
    if (outreach) {
      const ok = outreach.signedUp >= PUBLIC_OWNER_SIGNUPS_DAILY_GOAL;
      message += `\n\n🎯 Meta 20 altas: <b>${ok ? 'CUMPLIDA' : 'pendiente'}</b> (${outreach.signedUp}/${PUBLIC_OWNER_SIGNUPS_DAILY_GOAL})`;
    }

    const sent = await sendTelegramMessage(message);
    if (!sent) throw new Error('Failed to send Telegram message');

    return NextResponse.json({ success: true, when: '19:00 Madrid', outreach });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
