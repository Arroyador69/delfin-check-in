/**
 * Horario de oleadas Zoho-safe: 50 mails × 20 slots ≈ 1000/día.
 * Ventana Europe/Madrid ~08:00–17:30 (cada 30 min).
 * Vercel cron UTC invierno (CET): `0,30 7-16 * * *`.
 *
 * Telegram: solo 3/día → 12:00 progreso · 16:00 progreso · 21:00 cierre.
 */

import {
  PUBLIC_OWNER_LEADS_WAVE_MAX,
  PUBLIC_OWNER_LEADS_WAVES_PER_DAY,
  PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
  PUBLIC_OWNER_LEADS_TG_MORNING_SLOT,
  PUBLIC_OWNER_LEADS_TG_AFTERNOON_SLOT,
} from './constants';

type SendWave = 'morning' | 'afternoon' | 'evening' | 'night';

/** Primer slot: 08:00 Madrid. */
const FIRST_HOUR_MADRID = 8;
const FIRST_MINUTE_MADRID = 0;

/**
 * Minutos desde medianoche Madrid → índice de slot 0..19, o null fuera de ventana.
 */
export function madridHalfHourSlot(now = new Date()): number | null {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? NaN);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? NaN);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  const mins = hour * 60 + minute;
  const start = FIRST_HOUR_MADRID * 60 + FIRST_MINUTE_MADRID;
  const endExclusive = start + PUBLIC_OWNER_LEADS_WAVES_PER_DAY * 30; // 20×30 = 600 → 18:00
  if (mins < start || mins >= endExclusive) return null;

  const offset = mins - start;
  return Math.floor(offset / 30);
}

/**
 * Mapea slot 0–19 → oleada legacy (rotación provincias / Flujo C).
 * 0–4 morning · 5–9 afternoon · 10–14 evening · 15–19 night
 */
export function waveFromSlot(slot: number): SendWave {
  if (slot >= 15) return 'night';
  if (slot >= 10) return 'evening';
  if (slot >= 5) return 'afternoon';
  return 'morning';
}

/** Offset OSM distinto por slot (rota lugares todo el día). */
export function osmOffsetFromSlot(slot: number): number {
  return Math.max(0, Math.floor(slot));
}

/** ¿Esta oleada debe disparar uno de los 2 Telegram de progreso? */
export function isProgressTelegramSlot(
  slot: number | null
): 'morning' | 'afternoon' | null {
  if (slot == null) return null;
  if (slot === PUBLIC_OWNER_LEADS_TG_MORNING_SLOT) return 'morning';
  if (slot === PUBLIC_OWNER_LEADS_TG_AFTERNOON_SLOT) return 'afternoon';
  return null;
}

export function waveScheduleSummary(): {
  waveMax: number;
  wavesPerDay: number;
  dailyHardCap: number;
  windowMadrid: string;
  cronUtcHint: string;
  telegramDay: string;
} {
  return {
    waveMax: PUBLIC_OWNER_LEADS_WAVE_MAX,
    wavesPerDay: PUBLIC_OWNER_LEADS_WAVES_PER_DAY,
    dailyHardCap: PUBLIC_OWNER_LEADS_DAILY_HARD_CAP,
    windowMadrid: '08:00–17:30 cada 30 min',
    cronUtcHint: '0,30 7-16 * * * (CET invierno ≈ Madrid)',
    telegramDay: '12:00 progreso · 16:00 progreso · 21:00 cierre (3/día)',
  };
}
