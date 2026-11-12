/** Llamadas comerciales · Europe/Madrid · L–V */

export const SALES_CALL_PROJECT = 'delfin' as const;
export const SALES_CALL_DURATION_MIN = 15;
/** Separación entre inicios de hueco (≥30 min para no pillar dedos). */
export const SALES_CALL_SLOT_STEP_MIN = 30;
export const SALES_CALL_TZ = 'Europe/Madrid';

/** Mañana: 09:00–14:00 (último inicio 13:30 → fin 13:45). */
export const SALES_CALL_MORNING = { startHour: 9, startMin: 0, endHour: 14, endMin: 0 };
/** Tarde: 16:00–19:00 (último inicio 18:30 → fin 18:45). */
export const SALES_CALL_AFTERNOON = { startHour: 16, startMin: 0, endHour: 19, endMin: 0 };

export const SALES_CALL_BOOKING_PATH = '/es/reserva-llamada';

export function salesCallPublicBase(): string {
  return String(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://admin.delfincheckin.com'
  ).replace(/\/+$/, '');
}

export function salesCallBookingUrl(opts?: {
  email?: string;
  source?: string;
}): string {
  const u = new URL(`${salesCallPublicBase()}${SALES_CALL_BOOKING_PATH}`);
  if (opts?.email) u.searchParams.set('email', opts.email.trim().toLowerCase());
  if (opts?.source) u.searchParams.set('src', opts.source);
  return u.toString();
}

export function salesCallMeetingUrl(): string {
  return String(
    process.env.SALES_CALL_MEETING_URL ||
      process.env.NEXT_PUBLIC_SALES_CALL_MEETING_URL ||
      ''
  ).trim();
}
