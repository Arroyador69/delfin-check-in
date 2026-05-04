import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { fetchICalText, parseICalFeed } from '@/lib/ical';

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
      SELECT id, tenant_id, property_id, calendar_name, calendar_type, calendar_url, sync_frequency, sync_error, updated_at
      FROM external_calendars
      WHERE is_active = true
        AND calendar_url IS NOT NULL
        AND calendar_url != ''
        AND (
          last_sync_at IS NULL
          OR last_sync_at <= NOW() - make_interval(mins => GREATEST(5, COALESCE(sync_frequency, 15)))
        )
        AND NOT (
          sync_status = 'error'
          AND sync_error LIKE 'HTTP 4%'
          AND updated_at >= NOW() - interval '6 hours'
        )
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

        const icalData = await fetchICalText(cal.calendar_url, 20000);
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
        const rawMsg = err instanceof Error ? err.message : 'Unknown error';
        const isClientHttpError = /^HTTP 4\d\d\b/.test(rawMsg);
        const msg = isClientHttpError
          ? `${rawMsg} · Revisa URL iCal (expirada/incorrecta) o permisos del calendario externo`
          : rawMsg;
        await sql`
          UPDATE external_calendars
          SET sync_status = 'error', sync_error = ${msg}
          WHERE id = ${cal.id}
        `;
        errors++;
        if (isClientHttpError) {
          console.warn(`[sync-calendars] Calendario requiere revisión #${cal.id} (${cal.calendar_name}):`, msg);
        } else {
          console.error(`[sync-calendars] Error cal #${cal.id} (${cal.calendar_name}):`, msg);
        }
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
