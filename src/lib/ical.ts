// TODO: Implementar con storage local
// import ical from 'ical-generator';
// import { supabase } from './supabase';
// import { icalSyncQueue } from './redis';

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
    // TODO: Implementar con storage local
    console.log('Generating iCal for room:', roomId);
    return '';
  } catch (error) {
    console.error('Error generando iCal de salida:', error);
    throw error;
  }
}

// Función para sincronizar calendarios de una habitación
export async function syncRoomCalendars(roomId: string) {
  try {
    // TODO: Implementar con storage local
    console.log('Syncing calendars for room:', roomId);
    return { success: true, eventsProcessed: 0 };
  } catch (error) {
    console.error('Error sincronizando calendarios:', error);
    throw error;
  }
}

// Función para procesar un evento del calendario
async function processCalendarEvent(event: any, roomId: string) {
  try {
    // TODO: Implementar con storage local
    console.log('Processing calendar event:', event, 'for room:', roomId);
  } catch (error) {
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
