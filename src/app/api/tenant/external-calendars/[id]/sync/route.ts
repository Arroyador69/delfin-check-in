import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { parseICalFeed } from '@/app/api/cron/sync-calendars/route';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const { id: calendarId } = await params;

    const calendarIdNum = parseInt(calendarId);
    if (isNaN(calendarIdNum)) {
      return NextResponse.json({ success: false, error: 'ID de calendario inválido' }, { status: 400 });
    }

    const calendarResult = await sql`
      SELECT * FROM external_calendars
      WHERE id = ${calendarIdNum} AND tenant_id = ${tenantId} AND is_active = true
    `;

    if (calendarResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Calendario no encontrado o inactivo' }, { status: 404 });
    }

    const calendar = calendarResult.rows[0];

    if (!calendar.calendar_url) {
      return NextResponse.json({ success: false, error: 'URL del calendario no configurada' }, { status: 400 });
    }

    await sql`
      UPDATE external_calendars
      SET sync_status = 'syncing', last_sync_at = NOW()
      WHERE id = ${calendarIdNum}
    `;

    try {
      const response = await fetch(calendar.calendar_url, {
        headers: { 'User-Agent': 'Delfin-Checkin-CalSync/2.0' },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const icalData = await response.text();
      const events = parseICalFeed(icalData);

      await sql`
        DELETE FROM calendar_events WHERE external_calendar_id = ${calendar.id}
      `;

      let eventsAdded = 0;
      for (const ev of events) {
        try {
          await sql`
            INSERT INTO calendar_events (
              external_calendar_id, tenant_id, property_id,
              external_event_id, event_title, event_description,
              start_date, end_date, is_blocked, event_type,
              external_source
            ) VALUES (
              ${calendar.id}, ${calendar.tenant_id}, ${calendar.property_id},
              ${ev.uid}, ${ev.summary}, ${ev.description},
              ${ev.start_date}, ${ev.end_date}, true, 'reservation',
              ${calendar.calendar_type || 'ical'}
            )
            ON CONFLICT (external_calendar_id, external_event_id) DO UPDATE SET
              event_title = EXCLUDED.event_title,
              event_description = EXCLUDED.event_description,
              start_date = EXCLUDED.start_date,
              end_date = EXCLUDED.end_date,
              last_updated_at = NOW()
          `;
          eventsAdded++;
        } catch (eventError) {
          console.error('Error insertando evento:', eventError);
        }
      }

      await sql`
        UPDATE external_calendars
        SET sync_status = 'success', sync_error = NULL, last_sync_at = NOW()
        WHERE id = ${calendarIdNum}
      `;

      return NextResponse.json({
        success: true,
        message: 'Sincronización completada',
        result: {
          events_processed: events.length,
          events_added: eventsAdded,
          calendar_type: calendar.calendar_type,
          calendar_name: calendar.calendar_name,
        }
      });

    } catch (syncError) {
      const msg = syncError instanceof Error ? syncError.message : 'Error desconocido';
      await sql`
        UPDATE external_calendars
        SET sync_status = 'error', sync_error = ${msg}
        WHERE id = ${calendarIdNum}
      `;

      return NextResponse.json({
        success: false,
        error: 'Error en sincronización',
        details: msg
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[sync] Error:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}



