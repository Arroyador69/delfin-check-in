import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';
import {
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
} from '@/lib/public-owner-leads/constants';
import {
  fetchCaptacionDayStats,
  formatCaptacionWaveTelegram,
} from '@/lib/public-owner-leads/captacion-telegram';

/**
 * Cron ~21:00 Europe/Madrid (invierno: vercel `0 20 * * *`).
 * Telegram de cierre: acumulado tras oleadas 50×20 (tope 1000) vs meta 20 altas.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await fetchCaptacionDayStats();
    if (!stats) {
      return NextResponse.json({
        success: false,
        error: 'Tabla public_owner_leads ausente',
      });
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const newLeadsResult = await sql`
      SELECT email, name, source, created_at
      FROM waitlist
      WHERE created_at >= ${yesterday}
      ORDER BY created_at DESC
      LIMIT 20
    `;
    const totalResult = await sql`SELECT COUNT(*) as total FROM waitlist`;
    const waitlistNew = newLeadsResult.rows.length;
    const waitlistTotal = parseInt(String(totalResult.rows[0].total), 10);

    let message = formatCaptacionWaveTelegram({
      wave: 'day_end',
      stats,
      extraNote: `Tope día ${PUBLIC_OWNER_LEADS_DAILY_HARD_CAP} · 20×50 Zoho-safe · waitlist +${waitlistNew} (total ${waitlistTotal})`,
    });

    if (waitlistNew > 0) {
      message += `\n\n✨ <b>Waitlist recientes:</b>\n`;
      for (const [i, lead] of newLeadsResult.rows.slice(0, 10).entries()) {
        const name = lead.name || 'Sin nombre';
        message += `${i + 1}. ${name} · ${lead.email}\n`;
      }
    }

    const goalOk = stats.signedUp >= PUBLIC_OWNER_SIGNUPS_DAILY_GOAL;
    message += `\n\n🏁 <b>Cierre:</b> meta 20 onboardings (KPI legacy altas) <b>${goalOk ? 'CUMPLIDA' : 'NO cumplida'}</b>`;

    const sent = await sendTelegramMessage(message);
    if (!sent) throw new Error('Failed to send Telegram message');

    return NextResponse.json({
      success: true,
      when: '21:00 Madrid',
      outreach: stats,
      signupGoal: PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
      dailyCap: PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
