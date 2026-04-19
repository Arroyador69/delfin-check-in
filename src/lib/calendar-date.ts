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

/** Suma días a un YYYY-MM-DD (calendario gregoriano civil, sin interpretación TZ). */
export function addCalendarDaysToYmd(ymd: string, deltaDays: number): string {
  const [y, mo, d] = ymd.split('-').map(Number);
  const base = new Date(Date.UTC(y, mo - 1, d));
  base.setUTCDate(base.getUTCDate() + deltaDays);
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(base.getUTCDate()).padStart(2, '0');
  return `${base.getUTCFullYear()}-${mm}-${dd}`;
}

/**
 * Instante UTC en el que el reloj de pared marca `timeHHmm` en el día civil `ymd` dentro de `timeZone`.
 * Evita depender de la TZ del servidor (p. ej. Vercel UTC) al combinar fecha de reserva + hora de limpieza.
 */
export function utcInstantFromCalendarDayAndWallClock(
  ymd: string,
  timeHHmm: string,
  timeZone: string
): Date {
  const [wantH, wantM] = timeHHmm.split(':').map(Number);
  const [y, mo, d] = ymd.split('-').map(Number);
  let ms = Date.UTC(y, mo - 1, d, wantH, wantM, 0, 0);

  for (let i = 0; i < 120; i++) {
    const guess = new Date(ms);
    const gotYmd = getYmdInTimeZone(guess, timeZone);
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(guess);
    const gh = Number(parts.find(p => p.type === 'hour')?.value ?? 0);
    const gm = Number(parts.find(p => p.type === 'minute')?.value ?? 0);

    if (gotYmd === ymd && gh === wantH && gm === wantM) {
      return guess;
    }

    if (gotYmd !== ymd) {
      const cmp = gotYmd < ymd ? 1 : -1;
      ms += cmp * 6 * 3600 * 1000;
      continue;
    }

    const diffMin = wantH * 60 + wantM - (gh * 60 + gm);
    ms += diffMin * 60 * 1000;
  }

  return new Date(ms);
}
