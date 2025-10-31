// =====================================================
// API ENDPOINT: SINCRONIZACIÓN DE CALENDARIOS EXTERNOS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || 'default';
    const { searchParams } = new URL(req.url);
    const calendarId = searchParams.get('id');

    if (!calendarId) {
      return NextResponse.json({
        success: false,
        error: 'ID de calendario es obligatorio'
      }, { status: 400 });
    }

    console.log('🔄 Iniciando sincronización de calendario:', calendarId);

    // Verificar que el calendario pertenece al tenant
    const calendarResult = await sql`
      SELECT * FROM external_calendars
      WHERE id = ${calendarId} AND tenant_id = ${tenantId} AND is_active = true
    `;

    if (calendarResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Calendario no encontrado o inactivo'
      }, { status: 404 });
    }

    const calendar = calendarResult.rows[0];

    // Actualizar estado a sincronizando
    await sql`
      UPDATE external_calendars
      SET sync_status = 'syncing', last_sync_at = NOW()
      WHERE id = ${calendarId}
    `;

    try {
      // Simular sincronización según el tipo de calendario
      let syncResult;
      
      switch (calendar.calendar_type) {
        case 'ical':
          syncResult = await syncICalCalendar(calendar);
          break;
        case 'google':
          syncResult = await syncGoogleCalendar(calendar);
          break;
        case 'airbnb':
          syncResult = await syncAirbnbCalendar(calendar);
          break;
        case 'booking':
          syncResult = await syncBookingCalendar(calendar);
          break;
        default:
          throw new Error(`Tipo de calendario no soportado: ${calendar.calendar_type}`);
      }

      // Actualizar estado a exitoso
      await sql`
        UPDATE external_calendars
        SET 
          sync_status = 'success',
          sync_error = NULL,
          last_sync_at = NOW()
        WHERE id = ${calendarId}
      `;

      console.log('✅ Sincronización completada:', syncResult);

      return NextResponse.json({
        success: true,
        message: 'Sincronización completada exitosamente',
        result: syncResult
      });

    } catch (syncError) {
      // Actualizar estado a error
      await sql`
        UPDATE external_calendars
        SET 
          sync_status = 'error',
          sync_error = ${syncError instanceof Error ? syncError.message : 'Error desconocido'}
        WHERE id = ${calendarId}
      `;

      console.error('❌ Error en sincronización:', syncError);

      return NextResponse.json({
        success: false,
        error: 'Error en sincronización',
        details: syncError instanceof Error ? syncError.message : 'Error desconocido'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error procesando sincronización:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función para sincronizar calendario iCal
async function syncICalCalendar(calendar: any) {
  console.log('📅 Sincronizando calendario iCal:', calendar.calendar_name);
  
  if (!calendar.calendar_url) {
    throw new Error('URL del calendario iCal no configurada');
  }

  try {
    // Hacer petición al feed iCal
    const response = await fetch(calendar.calendar_url, {
      headers: {
        'User-Agent': 'Delfin Check-in Calendar Sync/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Error obteniendo feed iCal: ${response.status} ${response.statusText}`);
    }

    const icalData = await response.text();
    
    // Parsear eventos iCal (simplificado)
    const events = parseICalEvents(icalData);
    
    // Limpiar eventos anteriores de este calendario
    await sql`
      DELETE FROM calendar_events 
      WHERE external_calendar_id = ${calendar.id}
    `;

    // Insertar nuevos eventos
    let eventsAdded = 0;
    for (const event of events) {
      try {
        await sql`
          INSERT INTO calendar_events (
            external_calendar_id, tenant_id, property_id,
            external_event_id, event_title, event_description,
            start_date, end_date, is_blocked, event_type,
            external_source
          ) VALUES (
            ${calendar.id}, ${calendar.tenant_id}, ${calendar.property_id},
            ${event.uid}, ${event.summary}, ${event.description},
            ${event.start_date}, ${event.end_date}, true, 'reservation',
            'ical'
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

    return {
      events_processed: events.length,
      events_added: eventsAdded,
      calendar_type: 'ical',
      calendar_name: calendar.calendar_name
    };

  } catch (error) {
    console.error('Error sincronizando iCal:', error);
    throw error;
  }
}

// Función para sincronizar Google Calendar
async function syncGoogleCalendar(calendar: any) {
  console.log('🔵 Sincronizando Google Calendar:', calendar.calendar_name);
  
  // TODO: Implementar integración con Google Calendar API
  // Por ahora, simular sincronización exitosa
  
  return {
    events_processed: 0,
    events_added: 0,
    calendar_type: 'google',
    calendar_name: calendar.calendar_name,
    message: 'Integración con Google Calendar pendiente de implementación'
  };
}

// Función para sincronizar Airbnb
async function syncAirbnbCalendar(calendar: any) {
  console.log('🏠 Sincronizando Airbnb Calendar:', calendar.calendar_name);
  
  // TODO: Implementar integración con Airbnb API
  // Por ahora, simular sincronización exitosa
  
  return {
    events_processed: 0,
    events_added: 0,
    calendar_type: 'airbnb',
    calendar_name: calendar.calendar_name,
    message: 'Integración con Airbnb pendiente de implementación'
  };
}

// Función para sincronizar Booking.com
async function syncBookingCalendar(calendar: any) {
  console.log('📖 Sincronizando Booking.com Calendar:', calendar.calendar_name);
  
  // TODO: Implementar integración con Booking.com API
  // Por ahora, simular sincronización exitosa
  
  return {
    events_processed: 0,
    events_added: 0,
    calendar_type: 'booking',
    calendar_name: calendar.calendar_name,
    message: 'Integración con Booking.com pendiente de implementación'
  };
}

// Función para parsear eventos iCal (simplificada)
function parseICalEvents(icalData: string) {
  const events = [];
  const lines = icalData.split('\n');
  let currentEvent: any = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.uid && currentEvent.start_date && currentEvent.end_date) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      if (line.startsWith('UID:')) {
        currentEvent.uid = line.substring(4);
      } else if (line.startsWith('SUMMARY:')) {
        currentEvent.summary = line.substring(8);
      } else if (line.startsWith('DESCRIPTION:')) {
        currentEvent.description = line.substring(12);
      } else if (line.startsWith('DTSTART:')) {
        const dateStr = line.substring(8);
        currentEvent.start_date = parseICalDate(dateStr);
      } else if (line.startsWith('DTEND:')) {
        const dateStr = line.substring(6);
        currentEvent.end_date = parseICalDate(dateStr);
      }
    }
  }
  
  return events;
}

// Función para parsear fechas iCal
function parseICalDate(dateStr: string): string {
  // Formato iCal: YYYYMMDDTHHMMSSZ o YYYYMMDD
  if (dateStr.length === 8) {
    // Solo fecha: YYYYMMDD
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
  } else if (dateStr.length >= 15) {
    // Fecha y hora: YYYYMMDDTHHMMSSZ
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
  
  return new Date().toISOString().split('T')[0]; // Fallback a fecha actual
}







