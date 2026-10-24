import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendTelegramMessage, formatDailyReport } from '@/lib/telegram';
import {
  PUBLIC_OWNER_LEADS_DAILY_TARGET,
  PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
} from '@/lib/public-owner-leads/constants';

/**
 * Cron informe diario Telegram ~11:00 Europe/Madrid (09:00 UTC en CEST).
 * Incluye captación outreach (enviados / abiertos / clicks / bounce / altas) + waitlist.
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕐 [DAILY REPORT] Informe 11:00 Madrid…');

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const newLeadsResult = await sql`
      SELECT email, name, source, created_at
      FROM waitlist
      WHERE created_at >= ${yesterday}
      ORDER BY created_at DESC
    `;

    const totalResult = await sql`
      SELECT COUNT(*) as total
      FROM waitlist
    `;

    const newLeads = newLeadsResult.rows.length;
    const totalLeads = parseInt(String(totalResult.rows[0].total), 10);
    const newLeadsList = newLeadsResult.rows.map((row) => ({
      email: row.email,
      name: row.name,
      source: row.source,
      created_at: row.created_at,
    }));

    let outreach = null;
    try {
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
          dailyCap: PUBLIC_OWNER_LEADS_DAILY_TARGET,
          signupGoal: PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
        };
      }
    } catch (e) {
      console.warn('[DAILY REPORT] outreach stats skip', e);
    }

    const message = formatDailyReport({
      newLeads,
      totalLeads,
      newLeadsList,
      outreach,
    });

    const sent = await sendTelegramMessage(message);
    if (!sent) {
      throw new Error('Failed to send Telegram message');
    }

    console.log('✅ [DAILY REPORT] Enviado', { newLeads, totalLeads, outreach });

    return NextResponse.json({
      success: true,
      message: 'Daily report sent (11:00 Madrid)',
      stats: { newLeads, totalLeads, outreach },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('❌ [DAILY REPORT] Error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
