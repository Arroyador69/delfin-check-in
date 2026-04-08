import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    const isVercelCron = req.headers.get('x-vercel-cron') === '1';
    if (!isVercelCron) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const calendars = await sql`
      SELECT id, tenant_id, property_id, calendar_name, calendar_type, calendar_url
      FROM external_calendars
      WHERE is_active = true
        AND calendar_url IS NOT NULL
        AND calendar_url != ''
      ORDER BY last_sync_at ASC NULLS FIRST
      LIMIT 50
    `;

    let synced = 0;
    let errors = 0;

    for (const cal of calendars.rows) {
      try {
        await sql`
          UPDATE external_calendars
          SET sync_status = 'syncing', last_sync_at = NOW()
          WHERE id = ${cal.id}
        `;

        const response = await fetch(cal.calendar_url, {
          headers: { 'User-Agent': 'Delfin-Checkin-CalSync/2.0' },
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const icalData = await response.text();
        const events = parseICalFeed(icalData);

        await sql`
          DELETE FROM calendar_events
          WHERE external_calendar_id = ${cal.id}
        `;

        for (const ev of events) {
          try {
            await sql`
              INSERT INTO calendar_events (
                external_calendar_id, tenant_id, property_id,
                external_event_id, event_title, event_description,
                start_date, end_date, is_blocked, event_type,
                external_source
              ) VALUES (
                ${cal.id}, ${cal.tenant_id}, ${cal.property_id},
                ${ev.uid}, ${ev.summary}, ${ev.description},
                ${ev.start_date}, ${ev.end_date}, true, 'reservation',
                ${cal.calendar_type || 'ical'}
              )
              ON CONFLICT (external_calendar_id, external_event_id) DO UPDATE SET
                event_title = EXCLUDED.event_title,
                event_description = EXCLUDED.event_description,
                start_date = EXCLUDED.start_date,
                end_date = EXCLUDED.end_date,
                last_updated_at = NOW()
            `;
          } catch {}
        }

        await sql`
          UPDATE external_calendars
          SET sync_status = 'success', sync_error = NULL, last_sync_at = NOW()
          WHERE id = ${cal.id}
        `;
        synced++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        await sql`
          UPDATE external_calendars
          SET sync_status = 'error', sync_error = ${msg}
          WHERE id = ${cal.id}
        `;
        errors++;
        console.error(`[sync-calendars] Error cal #${cal.id} (${cal.calendar_name}):`, msg);
      }
    }

    console.log(`[sync-calendars] Done: ${synced} synced, ${errors} errors, ${calendars.rows.length} total`);

    return NextResponse.json({
      success: true,
      synced,
      errors,
      total: calendars.rows.length,
    });
  } catch (error) {
    console.error('[sync-calendars] Fatal:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

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

function parseICalDate(raw: string): string {
  const clean = raw.replace(/[^0-9T]/g, '').replace('T', '');
  if (clean.length >= 8) {
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
  }
  return new Date().toISOString().slice(0, 10);
}

function extractDateValue(line: string): string {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return '';
  return line.slice(colonIdx + 1).trim();
}

function parseICalFeed(icalData: string) {
  const lines = unfoldICalLines(icalData);
  const events: Array<{ uid: string; summary: string; description: string; start_date: string; end_date: string }> = [];
  let cur: any = null;

  for (const line of lines) {
    const upper = line.toUpperCase();

    if (upper === 'BEGIN:VEVENT') {
      cur = { uid: '', summary: '', description: '', start_date: '', end_date: '' };
    } else if (upper === 'END:VEVENT') {
      if (cur && cur.uid && cur.start_date && cur.end_date) {
        if (!cur.summary) cur.summary = 'Reserved';
        events.push(cur);
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
        cur.start_date = parseICalDate(extractDateValue(line));
      } else if (upper.startsWith('DTEND')) {
        cur.end_date = parseICalDate(extractDateValue(line));
      }
    }
  }

  return events;
}
