import { NextRequest, NextResponse } from 'next/server';
import { authorizeCronSecret } from '@/lib/cron-auth';
import { notifyCaptacionWave } from '@/lib/public-owner-leads/captacion-telegram';

export const maxDuration = 60;

/**
 * Telegram de progreso captación — independiente de la oleada (no se pierde si el send/refill timeout).
 *
 * Vercel UTC (cubre CET invierno y CEST verano):
 *   `5 10,11,14,15 * * *` → :05 en horas candidatas
 * Solo actúa si Europe/Madrid es 12:00 o 16:00.
 *
 * Manual: `?force=morning|afternoon` (con CRON_SECRET).
 */
function madridHourMinute(now = new Date()): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  return {
    hour: Number(parts.find((p) => p.type === 'hour')?.value ?? NaN),
    minute: Number(parts.find((p) => p.type === 'minute')?.value ?? NaN),
  };
}

export async function GET(req: NextRequest) {
  if (!authorizeCronSecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const force = String(req.nextUrl.searchParams.get('force') || '')
    .trim()
    .toLowerCase();
  const { hour, minute } = madridHourMinute();

  let kind: 'morning' | 'afternoon' | null = null;
  if (force === 'morning' || force === 'noon' || force === '12') {
    kind = 'morning';
  } else if (force === 'afternoon' || force === '16') {
    kind = 'afternoon';
  } else if (hour === 12) {
    kind = 'morning';
  } else if (hour === 16) {
    kind = 'afternoon';
  }

  if (!kind) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'not_progress_hour_madrid',
      madrid: { hour, minute },
      hint: 'Solo 12:00 o 16:00 Europe/Madrid (o ?force=morning|afternoon)',
    });
  }

  const telegram = await notifyCaptacionWave({
    wave: 'progress',
    extraNote:
      kind === 'morning'
        ? 'Progreso fin de mañana (12:00) · 1/2 del día · cierre a las 21:00'
        : 'Progreso media tarde (16:00) · 2/2 del día · cierre a las 21:00',
  });

  return NextResponse.json({
    success: Boolean(telegram.ok),
    kind,
    madrid: { hour, minute },
    forced: Boolean(force),
    telegram,
  });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
