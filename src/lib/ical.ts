/**
 * Parser iCal (VEVENT) para sincronización de calendarios externos.
 * Soporta DTSTART/DTEND en formato fecha u hora; si falta DTEND en eventos solo-fecha, usa fin exclusivo al día siguiente.
 */

export type ParsedICalEvent = {
  uid: string;
  summary: string;
  description: string;
  start_date: string;
  end_date: string;
};

function unfoldICalLines(raw: string): string[] {
  const lines: string[] = [];
  for (const line of raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (lines.length > 0) {
        lines[lines.length - 1] += line.slice(1);
      }
    } else {
      lines.push(line);
    }
  }
  return lines;
}

/** YYYY-MM-DD desde valor iCal (YYYYMMDD o YYYYMMDDTHHMMSSZ, etc.) */
export function parseICalDate(raw: string): string {
  const clean = raw.replace(/[^0-9T]/g, '').replace('T', '');
  if (clean.length >= 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  return new Date().toISOString().slice(0, 10);
}

function extractDateValue(line: string): string {
  const colonIdx = line.lastIndexOf(':');
  if (colonIdx === -1) return '';
  return line.slice(colonIdx + 1).trim();
}

function addCalendarDay(yyyyMmDd: string, days: number): string {
  const d = new Date(`${yyyyMmDd}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Petición del .ics con cabeceras razonables (algunos hosts bloquean user-agents genéricos). */
export async function fetchICalText(url: string, timeoutMs = 20000): Promise<string> {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      Accept: 'text/calendar,text/plain;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return response.text();
}

export function parseICalFeed(icalData: string): ParsedICalEvent[] {
  const lines = unfoldICalLines(icalData);
  const events: ParsedICalEvent[] = [];
  let cur: Partial<ParsedICalEvent> | null = null;

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (upper === 'BEGIN:VEVENT') {
      cur = { uid: '', summary: '', description: '', start_date: '', end_date: '' };
    } else if (upper === 'END:VEVENT') {
      if (cur && cur.start_date) {
        let end = cur.end_date || '';
        if (!end && cur.start_date) {
          end = addCalendarDay(cur.start_date, 1);
        }
        if (!cur.uid || cur.uid.trim() === '') {
          cur.uid = `gen-${cur.start_date}-${events.length}`;
        }
        if (!cur.summary) cur.summary = 'Reserved';
        if (end) {
          events.push({
            uid: cur.uid,
            summary: cur.summary,
            description: cur.description || '',
            start_date: cur.start_date,
            end_date: end,
          });
        }
      }
      cur = null;
    } else if (cur) {
      if (upper.startsWith('UID')) {
        cur.uid = extractDateValue(line);
      } else if (upper.startsWith('SUMMARY')) {
        cur.summary = extractDateValue(line);
      } else if (upper.startsWith('DESCRIPTION')) {
        cur.description = extractDateValue(line);
      } else if (upper.startsWith('DTSTART')) {
        const v = extractDateValue(line);
        cur._dtstartRaw = line;
        cur.start_date = parseICalDate(v);
      } else if (upper.startsWith('DTEND')) {
        const v = extractDateValue(line);
        cur._dtendRaw = line;
        cur.end_date = parseICalDate(v);
      }
    }
  }

  return events;
}
