import { getRooms, getReservations } from './storage';

// Generar iCal para Airbnb/Booking.com
export function generateICalForRoom(roomId: string): string {
  const rooms = getRooms();
  const reservations = getReservations();
  
  const room = rooms.find(r => r.id === roomId);
  if (!room) {
    throw new Error('Habitación no encontrada');
  }
  
  // Filtrar reservas de esta habitación
  const roomReservations = reservations.filter(r => r.room_id === roomId && r.status === 'confirmed');
  
  // Generar eventos iCal
  const events = roomReservations.map(reservation => {
    const startDate = formatDateForICal(new Date(reservation.check_in));
    const endDate = formatDateForICal(new Date(reservation.check_out));
    
    return `BEGIN:VEVENT
UID:${reservation.id}@delfin-checkin.com
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${room.name} - ${reservation.guest_name}
DESCRIPTION:Reserva confirmada para ${reservation.guest_name}
STATUS:CONFIRMED
END:VEVENT`;
  }).join('\n');
  
  // Generar calendario completo
  const ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Delfín Check-in//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
${events}
END:VCALENDAR`;
  
  return ical;
}

// Formatear fecha para iCal
function formatDateForICal(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Generar URL pública para el iCal
export function generateICalUrl(roomId: string): string {
  // En producción, esto sería una URL real
  // Por ahora, generamos una URL local
  return `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ical/${roomId}`;
}

// Función para sincronizar con iCal externo (Airbnb/Booking)
export async function syncWithExternalICal(roomId: string, icalUrl: string): Promise<void> {
  try {
    // Aquí implementarías la lógica para:
    // 1. Descargar el iCal de Airbnb/Booking
    // 2. Parsear los eventos
    // 3. Crear/actualizar reservas en tu sistema
    
    console.log(`Sincronizando habitación ${roomId} con ${icalUrl}`);
    
    // Por ahora, solo simulamos la sincronización
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`Sincronización completada para habitación ${roomId}`);
  } catch (error) {
    console.error('Error en sincronización iCal:', error);
    throw error;
  }
}

// Función para parsear iCal externo
export function parseExternalICal(icalContent: string): Array<{
  start: Date;
  end: Date;
  summary: string;
  description?: string;
}> {
  const events: Array<{
    start: Date;
    end: Date;
    summary: string;
    description?: string;
  }> = [];
  
  const lines = icalContent.split('\n');
  let currentEvent: any = {};
  let inEvent = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
    } else if (trimmedLine === 'END:VEVENT') {
      if (inEvent && currentEvent.start && currentEvent.end) {
        events.push({
          start: new Date(currentEvent.start),
          end: new Date(currentEvent.end),
          summary: currentEvent.summary || 'Reserva',
          description: currentEvent.description,
        });
      }
      inEvent = false;
    } else if (inEvent) {
      if (trimmedLine.startsWith('DTSTART')) {
        const dateStr = trimmedLine.substring(8);
        currentEvent.start = parseICalDate(dateStr);
      } else if (trimmedLine.startsWith('DTEND')) {
        const dateStr = trimmedLine.substring(6);
        currentEvent.end = parseICalDate(dateStr);
      } else if (trimmedLine.startsWith('SUMMARY:')) {
        currentEvent.summary = trimmedLine.substring(8);
      } else if (trimmedLine.startsWith('DESCRIPTION:')) {
        currentEvent.description = trimmedLine.substring(12);
      }
    }
  }
  return events;
}

// Parsear fecha de iCal
function parseICalDate(dateStr: string): Date {
  // Manejar diferentes formatos de fecha
  if (dateStr.includes('VALUE=DATE:')) {
    // Formato: VALUE=DATE:YYYYMMDD
    const datePart = dateStr.split('VALUE=DATE:')[1];
    const year = datePart.substring(0, 4);
    const month = datePart.substring(4, 6);
    const day = datePart.substring(6, 8);
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  } else if (dateStr.includes(':')) {
    // Formato: YYYYMMDDTHHMMSSZ
    const datePart = dateStr.split(':')[1];
    const year = datePart.substring(0, 4);
    const month = datePart.substring(4, 6);
    const day = datePart.substring(6, 8);
    const hour = datePart.substring(9, 11) || '00';
    const minute = datePart.substring(11, 13) || '00';
    const second = datePart.substring(13, 15) || '00';
    
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  } else {
    // Formato: YYYYMMDDTHHMMSSZ (sin prefijo)
    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);
    const hour = dateStr.substring(9, 11) || '00';
    const minute = dateStr.substring(11, 13) || '00';
    const second = dateStr.substring(13, 15) || '00';
    
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
  }
}

// Función para crear reserva desde evento iCal
export function createReservationFromICalEvent(
  event: {
    start: Date;
    end: Date;
    summary: string;
    description?: string;
  },
  roomId: string,
  channel: 'airbnb' | 'booking' | 'manual'
): void {
  // Extraer nombre del huésped del summary
  const guestName = event.summary.split(' - ')[1] || 'Huésped';
  
  const reservation = {
    external_id: `ical_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    room_id: roomId,
    guest_name: guestName,
    guest_email: '',
    check_in: event.start.toISOString(),
    check_out: event.end.toISOString(),
    channel,
    total_price: 0,
    guest_paid: 0,
    platform_commission: 0,
    net_income: 0,
    currency: 'EUR',
    status: 'confirmed' as const,
  };

  // Guardar directamente en el almacenamiento del servidor
  if (typeof global.serverStorage !== 'undefined') {
    if (!global.serverStorage.reservations) {
      global.serverStorage.reservations = [];
    }
    
    const newReservation = {
      ...reservation,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    global.serverStorage.reservations.push(newReservation);
  }
}
