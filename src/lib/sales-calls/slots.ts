import {
  SALES_CALL_AFTERNOON,
  SALES_CALL_DURATION_MIN,
  SALES_CALL_MORNING,
  SALES_CALL_SLOT_STEP_MIN,
  SALES_CALL_TZ,
} from './constants';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Fecha YYYY-MM-DD en Europe/Madrid. */
export function madridDateKey(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SALES_CALL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function madridWeekday(dateKey: string): number {
  // noon UTC-ish via fixed offset parse: use formatter
  const probe = new Date(`${dateKey}T12:00:00+01:00`);
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: SALES_CALL_TZ,
    weekday: 'short',
  }).format(probe);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? 0;
}

/** Instant UTC for Madrid local wall time on dateKey. */
export function madridLocalToUtc(
  dateKey: string,
  hour: number,
  minute: number
): Date {
  // Try +01 then +02 and pick the one that formats back to the same wall time
  for (const offset of ['+01:00', '+02:00']) {
    const d = new Date(
      `${dateKey}T${pad(hour)}:${pad(minute)}:00${offset}`
    );
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: SALES_CALL_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
    const y = get('year');
    const m = get('month');
    const day = get('day');
    const h = get('hour');
    const min = get('minute');
    if (
      `${y}-${m}-${day}` === dateKey &&
      Number(h) === hour &&
      Number(min) === minute
    ) {
      return d;
    }
  }
  return new Date(`${dateKey}T${pad(hour)}:${pad(minute)}:00+01:00`);
}

type Window = { startHour: number; startMin: number; endHour: number; endMin: number };

function startsInWindow(dateKey: string, win: Window): Date[] {
  const out: Date[] = [];
  let h = win.startHour;
  let m = win.startMin;
  const endTotal = win.endHour * 60 + win.endMin;
  while (h * 60 + m + SALES_CALL_DURATION_MIN <= endTotal) {
    out.push(madridLocalToUtc(dateKey, h, m));
    m += SALES_CALL_SLOT_STEP_MIN;
    while (m >= 60) {
      m -= 60;
      h += 1;
    }
  }
  return out;
}

/** Genera inicios de hueco L–V en ventanas mañana/tarde. */
export function generateSlotStarts(opts: {
  fromDateKey: string;
  days?: number;
  now?: Date;
}): Date[] {
  const days = opts.days ?? 14;
  const now = opts.now ?? new Date();
  const leadMs = 60 * 60 * 1000; // mínimo 1h de antelación
  const slots: Date[] = [];

  let cursor = opts.fromDateKey;
  for (let i = 0; i < days; i++) {
    const wd = madridWeekday(cursor);
    if (wd >= 1 && wd <= 5) {
      for (const start of [
        ...startsInWindow(cursor, SALES_CALL_MORNING),
        ...startsInWindow(cursor, SALES_CALL_AFTERNOON),
      ]) {
        if (start.getTime() >= now.getTime() + leadMs) slots.push(start);
      }
    }
    // Avanzar exactamente 1 día calendario Madrid (NO +36h: saltaba días).
    const noon = madridLocalToUtc(cursor, 12, 0);
    const next = new Date(noon.getTime() + 24 * 3600 * 1000);
    cursor = madridDateKey(next);
  }
  return slots;
}

export function slotEnd(start: Date): Date {
  return new Date(start.getTime() + SALES_CALL_DURATION_MIN * 60_000);
}

export function formatSlotMadrid(start: Date): {
  dateLabel: string;
  timeLabel: string;
  dateKey: string;
} {
  const dateLabel = new Intl.DateTimeFormat('es-ES', {
    timeZone: SALES_CALL_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(start);
  const timeLabel = new Intl.DateTimeFormat('es-ES', {
    timeZone: SALES_CALL_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(start);
  return { dateLabel, timeLabel, dateKey: madridDateKey(start) };
}
