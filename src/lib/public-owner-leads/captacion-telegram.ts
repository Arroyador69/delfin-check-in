/**
 * Telegram tras cada oleada de captación + cierre del día.
 * Siempre muestra totales ACUMULADOS del día (Europe/Madrid) vs meta 20 altas.
 */

import { sql } from '@/lib/db';
import { sendTelegramMessage } from '@/lib/telegram';
import {
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
} from './constants';

export type CaptacionWaveLabel =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'night'
  | 'prepare'
  | 'day_end';

export type CaptacionDayStats = {
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  signedUp: number;
  queued: number;
  dailyCap: number;
  signupGoal: number;
};

const WAVE_TITLE: Record<CaptacionWaveLabel, string> = {
  morning: 'Oleada mañana (~09:00)',
  afternoon: 'Oleada tarde (~15:00)',
  evening: 'Oleada noche (~18:00)',
  night: 'Oleada cierre (~20:00)',
  prepare: 'Prepare (solo cola)',
  day_end: 'Cierre del día',
};

export async function fetchCaptacionDayStats(): Promise<CaptacionDayStats | null> {
  const meta = await sql`SELECT to_regclass('public.public_owner_leads') AS reg`;
  if (!meta.rows[0]?.reg) return null;

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
      )::int AS signed_up,
      COUNT(*) FILTER (WHERE status = 'queued' AND opted_out = false)::int AS queued
    FROM public_owner_leads
  `;
  const row = o.rows[0] || {};
  return {
    sent: Number(row.sent || 0),
    opened: Number(row.opened || 0),
    clicked: Number(row.clicked || 0),
    bounced: Number(row.bounced || 0),
    signedUp: Number(row.signed_up || 0),
    queued: Number(row.queued || 0),
    dailyCap: PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
    signupGoal: PUBLIC_OWNER_SIGNUPS_DAILY_GOAL,
  };
}

export function formatCaptacionWaveTelegram(opts: {
  wave: CaptacionWaveLabel;
  waveSent?: number;
  waveFailed?: number;
  skippedBecauseGoalMet?: boolean;
  stats: CaptacionDayStats;
  extraNote?: string;
}): string {
  const { wave, stats } = opts;
  const fecha = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Madrid',
  });
  const hora = new Date().toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  });

  const goalOk = stats.signedUp >= stats.signupGoal;
  const sendPct = Math.min(100, Math.round((stats.sent / Math.max(stats.dailyCap, 1)) * 100));

  let msg = `🐬 <b>Captación · ${WAVE_TITLE[wave]}</b>\n`;
  msg += `📅 ${fecha} · ${hora}\n\n`;

  if (opts.skippedBecauseGoalMet) {
    msg += `✅ Meta de altas ya cumplida → esta oleada <b>no envía</b>.\n\n`;
  } else if (typeof opts.waveSent === 'number') {
    msg += `📤 Esta oleada: <b>+${opts.waveSent}</b> enviados`;
    if (opts.waveFailed) msg += ` · ${opts.waveFailed} fallidos`;
    msg += `\n\n`;
  }

  msg += `📊 <b>Acumulado del día</b>\n`;
  msg += `• Enviados: <b>${stats.sent}</b> / ${stats.dailyCap} (${sendPct}%)\n`;
  msg += `• Abiertos: <b>${stats.opened}</b>\n`;
  msg += `• Clicks: <b>${stats.clicked}</b>\n`;
  msg += `• Undelivered: <b>${stats.bounced}</b>\n`;
  msg += `• Cola lista: <b>${stats.queued}</b>\n\n`;

  msg += `🎯 <b>Objetivo altas: ${stats.signedUp}/${stats.signupGoal}</b> — ${
    goalOk ? 'CUMPLIDA ✅' : 'pendiente ⚠️'
  }\n`;

  if (opts.extraNote) {
    msg += `\nℹ️ ${opts.extraNote}\n`;
  }

  msg += `\n━━━━━━━━━━━━━━━━━━\n`;
  msg += `🔗 <a href="https://admin.delfincheckin.com/superadmin/public-owner-leads">Panel captación</a>`;

  return msg;
}

/**
 * Envía Telegram con stats acumuladas del día. No lanza: falla en soft.
 */
export async function notifyCaptacionWave(opts: {
  wave: CaptacionWaveLabel;
  waveSent?: number;
  waveFailed?: number;
  skippedBecauseGoalMet?: boolean;
  extraNote?: string;
}): Promise<{ ok: boolean; stats: CaptacionDayStats | null }> {
  try {
    const stats = await fetchCaptacionDayStats();
    if (!stats) {
      return { ok: false, stats: null };
    }
    const text = formatCaptacionWaveTelegram({ ...opts, stats });
    const ok = await sendTelegramMessage(text);
    return { ok, stats };
  } catch (e) {
    console.error('[captacion-telegram]', e);
    return { ok: false, stats: null };
  }
}
