/** Fechas calendario en hora local (evita desfase de un día con toISOString/UTC). */

export function formatDateYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYmd(s: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

/** Noches de hotel: check-out exclusivo (misma convención que SQL generate_series). */
export function nightsBetweenYmd(checkIn: string, checkOut: string): number {
  const a = parseYmd(checkIn);
  const b = parseYmd(checkOut);
  if (!a || !b) return 0;
  const t1 = Date.UTC(a.y, a.m - 1, a.d);
  const t2 = Date.UTC(b.y, b.m - 1, b.d);
  const diff = (t2 - t1) / 86400000;
  return diff > 0 ? diff : 0;
}

export function ymdTodayLocal(): string {
  return formatDateYmdLocal(new Date());
}

export function isYmdBeforeToday(ymd: string): boolean {
  return ymd < ymdTodayLocal();
}
