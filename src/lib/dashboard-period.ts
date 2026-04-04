/**
 * Lógica de períodos del dashboard: fechas locales, solapes de estancias,
 * prorrateo por noches (facturación/comisiones) y días del período.
 */

export type DashboardFilterPeriod =
  | 'total'
  | 'annual'
  | 'today'
  | 'thisWeek'
  | 'last7Days'
  | 'thisMonth'
  | 'last30Days'
  | 'custom';

export function localTodayYMD(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYMD(s: string): Date {
  const [y, mo, da] = s.split('-').map(Number);
  return new Date(y, mo - 1, da);
}

/** YYYY-MM-DD en zona local desde ISO o Date */
export function toLocalYMD(value: string | Date): string {
  const dt = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(dt.getTime())) return localTodayYMD();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ymdFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function mondayOfWeekContaining(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getDateRangeForFilter(
  period: DashboardFilterPeriod,
  custom: { from: string; to: string }
): { from: string; to: string } {
  const today = new Date();
  const todayStr = localTodayYMD();

  switch (period) {
    case 'total':
      return { from: '2020-01-01', to: todayStr };
    case 'annual':
      return {
        from: `${today.getFullYear()}-01-01`,
        to: `${today.getFullYear()}-12-31`,
      };
    case 'today':
      return { from: todayStr, to: todayStr };
    case 'thisWeek': {
      const monday = mondayOfWeekContaining(today);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: ymdFromDate(monday), to: ymdFromDate(sunday) };
    }
    case 'last7Days': {
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      return { from: ymdFromDate(from), to: todayStr };
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: ymdFromDate(start), to: ymdFromDate(end) };
    }
    case 'last30Days': {
      const from = new Date(today);
      from.setDate(today.getDate() - 29);
      return { from: ymdFromDate(from), to: todayStr };
    }
    case 'custom':
      return custom;
    default:
      return { from: '2020-01-01', to: todayStr };
  }
}

/** Para KPIs: no contar días futuros en el denominador ni prorrateos. */
export function clipMetricRangeToToday(from: string, to: string): { from: string; to: string } {
  const t = localTodayYMD();
  if (to <= t) return { from, to };
  if (from > t) return { from: t, to: t };
  return { from, to: t };
}

export function inclusiveDaysBetween(from: string, to: string): number {
  const a = parseYMD(from);
  const b = parseYMD(to);
  if (b < a) return 0;
  return Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
}

/**
 * Noches de estancia: día de salida no cuenta como noche (check-out por la mañana).
 * Misma fecha entrada/salida = 1 noche para prorrateo.
 */
export function stayNights(checkInRaw: string, checkOutRaw: string): number {
  const ci = toLocalYMD(checkInRaw);
  const co = toLocalYMD(checkOutRaw);
  const ciD = parseYMD(ci);
  const coD = parseYMD(co);
  const diff = Math.round((coD.getTime() - ciD.getTime()) / 86400000);
  return Math.max(1, diff);
}

/**
 * Noches de la estancia que caen en [periodFrom, periodTo] (inclusive).
 */
export function overlapNights(
  checkInRaw: string,
  checkOutRaw: string,
  periodFrom: string,
  periodTo: string
): number {
  const ciD = parseYMD(toLocalYMD(checkInRaw));
  const coD = parseYMD(toLocalYMD(checkOutRaw));
  const pfD = parseYMD(periodFrom);
  const ptD = parseYMD(periodTo);

  const diffDays = Math.round((coD.getTime() - ciD.getTime()) / 86400000);
  let lastNight: Date;
  if (diffDays <= 0) {
    lastNight = new Date(ciD);
  } else {
    lastNight = new Date(coD);
    lastNight.setDate(lastNight.getDate() - 1);
  }

  const start = new Date(Math.max(ciD.getTime(), pfD.getTime()));
  const end = new Date(Math.min(lastNight.getTime(), ptD.getTime()));
  if (start > end) return 0;
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

export function prorationFactor(
  checkInRaw: string,
  checkOutRaw: string,
  periodFrom: string,
  periodTo: string
): number {
  const denom = stayNights(checkInRaw, checkOutRaw);
  const num = overlapNights(checkInRaw, checkOutRaw, periodFrom, periodTo);
  if (denom <= 0) return 0;
  return Math.min(1, num / denom);
}

export function reservationOverlapsPeriod(
  checkInRaw: string,
  checkOutRaw: string,
  periodFrom: string,
  periodTo: string
): boolean {
  return overlapNights(checkInRaw, checkOutRaw, periodFrom, periodTo) > 0;
}

export function safeNum(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = parseFloat(String(value));
  return Number.isNaN(n) ? 0 : n;
}

export function safeGuestCount(r: { guest_count?: unknown }): number {
  const n = parseInt(String(r.guest_count ?? '1'), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
