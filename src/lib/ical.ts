import ical from 'ical-generator';
import { supabase } from './supabase';
import { icalSyncQueue } from './redis';

// Función para descargar y parsear un calendario iCal
export async function fetchICalCalendar(url: string): Promise<any[]> {
  try {
    const response = await fetch(url);
    const icalData = await response.text();
    
    // Parsear el calendario iCal
    const events = parseICalData(icalData);
    return events;
  } catch (error) {
    console.error('Error descargando calendario iCal:', error);
    throw error;
  }
}

// Función para parsear datos iCal
function parseICalData(icalData: string): any[] {
  const events: any[] = [];
  const lines = icalData.split('\n');
  
  let currentEvent: any = {};
  let inEvent = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
    } else if (line === 'END:VEVENT') {
      inEvent = false;
      if (currentEvent.summary) {
        events.push(currentEvent);
      }
    } else if (inEvent && line.startsWith('SUMMARY:')) {
      currentEvent.summary = line.substring(8);
    } else if (inEvent && line.startsWith('DTSTART:')) {
      currentEvent.start = parseICalDate(line.substring(8));
    } else if (inEvent && line.startsWith('DTEND:')) {
      currentEvent.end = parseICalDate(line.substring(6));
    } else if (inEvent && line.startsWith('UID:')) {
      currentEvent.uid = line.substring(4);
    } else if (inEvent && line.startsWith('DESCRIPTION:')) {
      currentEvent.description = line.substring(12);
    }
  }
  
  return events;
}

// Función para parsear fechas iCal
function parseICalDate(dateString: string): Date {
  // Formato: 20231201T150000Z o 20231201
  if (dateString.includes('T')) {
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6)) - 1;
    const day = parseInt(dateString.substring(6, 8));
    const hour = parseInt(dateString.substring(9, 11));
    const minute = parseInt(dateString.substring(11, 13));
    const second = parseInt(dateString.substring(13, 15));
    
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  } else {
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6)) - 1;
    const day = parseInt(dateString.substring(6, 8));
    
    return new Date(year, month, day);
  }
}

// Función para generar calendario iCal de salida
export async function generateOutgoingICal(roomId: string): Promise<string> {
  try {
    // Obtener bloqueos y tareas de limpieza para esta habitación
    const { data: cleaningTasks } = await supabase
      .from('cleaning_tasks')
      .select('*')
      .eq('room_id', roomId)
      .eq('status', 'pending');
    
    // Crear calendario iCal
    const calendar = ical({
      name: `Delfín Check-in - Habitación ${roomId}`,
      description: 'Bloqueos automáticos para limpieza'
    });
    
    // Agregar eventos de limpieza como bloqueos
    cleaningTasks?.forEach(task => {
      calendar.createEvent({
        start: new Date(task.date),
        end: new Date(new Date(task.date).getTime() + 2 * 60 * 60 * 1000), // 2 horas
        summary: 'Limpieza - Habitación Bloqueada',
        description: 'Habitación bloqueada para limpieza',
        uid: `cleaning-${task.id}`
      });
    });
    
    return calendar.toString();
  } catch (error) {
    console.error('Error generando iCal de salida:', error);
    throw error;
  }
}

// Función para sincronizar calendarios de una habitación
export async function syncRoomCalendars(roomId: string) {
  try {
    // Obtener información de la habitación
    const { data: room } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (!room) {
      throw new Error('Habitación no encontrada');
    }
    
    const events: any[] = [];
    
    // Sincronizar desde Airbnb si existe URL
    if (room.ical_in_airbnb_url) {
      const airbnbEvents = await fetchICalCalendar(room.ical_in_airbnb_url);
      events.push(...airbnbEvents.map(event => ({ ...event, source: 'airbnb' })));
    }
    
    // Sincronizar desde Booking si existe URL
    if (room.ical_in_booking_url) {
      const bookingEvents = await fetchICalCalendar(room.ical_in_booking_url);
      events.push(...bookingEvents.map(event => ({ ...event, source: 'booking' })));
    }
    
    // Procesar eventos y guardar reservas
    for (const event of events) {
      await processCalendarEvent(event, roomId);
    }
    
    return { success: true, eventsProcessed: events.length };
  } catch (error) {
    console.error('Error sincronizando calendarios:', error);
    throw error;
  }
}

// Función para procesar un evento del calendario
async function processCalendarEvent(event: any, roomId: string) {
  try {
    // Verificar si la reserva ya existe
    const { data: existingReservation } = await supabase
      .from('reservations')
      .select('*')
      .eq('external_id', event.uid)
      .single();
    
    if (existingReservation) {
      // Actualizar reserva existente
      await supabase
        .from('reservations')
        .update({
          guest_name: event.summary || 'Sin nombre',
          check_in: event.start.toISOString(),
          check_out: event.end.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingReservation.id);
    } else {
      // Crear nueva reserva
      const { data: newReservation } = await supabase
        .from('reservations')
        .insert({
          external_id: event.uid,
          room_id: roomId,
          guest_name: event.summary || 'Sin nombre',
          guest_email: event.description || '',
          check_in: event.start.toISOString(),
          check_out: event.end.toISOString(),
          channel: event.source || 'manual',
          total_price: 0, // Se calculará después
          status: 'confirmed'
        })
        .select()
        .single();
      
      // Encolar notificación de nueva reserva
      if (newReservation) {
        await icalSyncQueue.add('new-reservation-notification', {
          reservationId: newReservation.id,
          roomId,
          guestName: newReservation.guest_name,
          checkIn: newReservation.check_in
        });
      }
    }
  } catch (error) {
    console.error('Error procesando evento del calendario:', error);
    throw error;
  }
}

// Función para programar sincronización periódica
export async function scheduleICalSync(roomId: string, intervalMinutes: number = 10) {
  await icalSyncQueue.add('periodic-sync', { roomId }, {
    repeat: {
      every: intervalMinutes * 60 * 1000 // Convertir a milisegundos
    }
  });
}
