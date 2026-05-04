import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { fetchICalText, parseICalFeed } from '@/lib/ical';
import { getTenantId } from '@/lib/tenant';

function trunc(s: string, max: number): string {
  if (typeof s !== 'string') return '';
  return s.length <= max ? s : s.slice(0, max);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    let tenantId = req.headers.get('x-tenant-id');
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      tenantId = (await getTenantId(req)) || '';
    }
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      return NextResponse.json({ success: false, error: 'No se pudo identificar el tenant' }, { status: 401 });
    }

    const { id: calendarId } = await params;

    const calendarIdNum = parseInt(calendarId, 10);
    if (isNaN(calendarIdNum)) {
      return NextResponse.json({ success: false, error: 'ID de calendario inválido' }, { status: 400 });
    }

    const calendarResult = await sql`
      SELECT * FROM external_calendars
      WHERE id = ${calendarIdNum} AND tenant_id = ${tenantId}::uuid AND is_active = true
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
      const icalData = await fetchICalText(String(calendar.calendar_url), 20000);

      if (!icalData || (!icalData.includes('VCALENDAR') && !icalData.includes('VEVENT'))) {
        throw new Error('La URL no devolvió un iCal válido');
      }

      const events = parseICalFeed(icalData);

      await sql`
        DELETE FROM calendar_events WHERE external_calendar_id = ${calendar.id}
      `;

      let eventsAdded = 0;
      for (const ev of events) {
        try {
          const uid = trunc(ev.uid, 255);
          const summary = trunc(ev.summary, 255);
          await sql`
            INSERT INTO calendar_events (
              external_calendar_id, tenant_id, property_id,
              external_event_id, event_title, event_description,
              start_date, end_date, is_blocked, event_type,
              external_source
            ) VALUES (
              ${calendar.id}, ${calendar.tenant_id}, ${calendar.property_id},
              ${uid}, ${summary}, ${ev.description},
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
          console.error('[external-calendars/sync] Error insertando evento:', eventError);
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
        },
      });
    } catch (syncError) {
      const msg = syncError instanceof Error ? syncError.message : 'Error desconocido';
      const isClientHttpError = /^HTTP 4\d\d\b/.test(msg);
      await sql`
        UPDATE external_calendars
        SET sync_status = 'error', sync_error = ${msg}
        WHERE id = ${calendarIdNum}
      `;

      return NextResponse.json(
        {
          success: false,
          error: 'Error en sincronización',
          details: isClientHttpError
            ? `${msg}. Revisa la URL iCal y que siga siendo pública/válida en Booking.`
            : msg,
        },
        { status: isClientHttpError ? 400 : 502 }
      );
    }
  } catch (error) {
    console.error('[external-calendars/sync] Error:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
