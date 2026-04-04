/** Fecha calendario YYYY-MM-DD en una zona horaria concreta (p. ej. Europe/Madrid). */
export function getYmdInTimeZone(date: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const y = parts.find(p => p.type === 'year')?.value;
  const m = parts.find(p => p.type === 'month')?.value;
  const d = parts.find(p => p.type === 'day')?.value;
  if (!y || !m || !d) return date.toISOString().slice(0, 10);
  return `${y}-${m}-${d}`;
}
