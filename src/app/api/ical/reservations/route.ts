import { NextResponse } from 'next/server';
import { getReservations } from '@/lib/db';

// Configuración para evitar caché
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    console.log('📅 Generando archivo iCal para reservas...');
    
    // Obtener todas las reservas
    const reservations = await getReservations();
    console.log(`✅ Generando iCal para ${reservations.length} reservas`);

    // Generar contenido iCal
    const icalContent = generateICalContent(reservations);

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'attachment; filename="reservas-delfin.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Error generating iCal:', error);
    return NextResponse.json(
      { error: 'Error al generar el calendario' },
      { status: 500 }
    );
  }
}

function generateICalContent(reservations: any[]): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Delfín Check-in//Reservas//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Reservas Delfín Check-in
X-WR-CALDESC:Calendario de reservas del hotel
X-WR-TIMEZONE:Europe/Madrid
`;

  reservations.forEach((reservation, index) => {
    const startDate = formatDateForICal(reservation.check_in, false); // false = check-in
    const endDate = formatDateForICal(reservation.check_out, true); // true = check-out
    const uid = `reserva-${reservation.id}@delfincheckin.com`;
    const summary = `🏨 ${reservation.guest_name} - Habitación ${reservation.room_id}`;
    const description = `Huésped: ${reservation.guest_name}
Email: ${reservation.guest_email || 'No especificado'}
Teléfono: ${reservation.guest_phone || 'No especificado'}
Número de personas: ${reservation.guest_count || 1}
Habitación: ${reservation.room_id}
Estado: ${getStatusText(reservation.status)}
Canal: ${getChannelText(reservation.channel)}
Precio: €${Number(reservation.guest_paid || 0).toFixed(2)}
Comisión: €${Number(reservation.platform_commission || 0).toFixed(2)}
Ganancia: €${Number(reservation.net_income || 0).toFixed(2)}`;

    ical += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${summary}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:Delfín Check-in Hotel
STATUS:${reservation.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}
TRANSP:OPAQUE
CATEGORIES:HOTEL,RESERVATION
X-MICROSOFT-CDO-BUSYSTATUS:${reservation.status === 'confirmed' ? 'BUSY' : 'FREE'}
END:VEVENT
`;
  });

  ical += 'END:VCALENDAR';
  
  return ical;
}

function formatDateForICal(dateString: string, isCheckOut: boolean = false): string {
  const date = new Date(dateString);
  
  // Configurar horarios automáticos:
  // - Check-in: 16:00h (4:00 PM)
  // - Check-out: 12:00h (12:00 PM)
  if (isCheckOut) {
    date.setHours(12, 0, 0, 0); // 12:00 PM para salida
  } else {
    date.setHours(16, 0, 0, 0); // 4:00 PM para entrada
  }
  
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function getStatusText(status: string): string {
  switch (status) {
    case 'confirmed': return 'Confirmada';
    case 'cancelled': return 'Cancelada';
    case 'completed': return 'Completada';
    default: return status;
  }
}

function getChannelText(channel: string): string {
  switch (channel) {
    case 'airbnb': return 'Airbnb';
    case 'booking': return 'Booking.com';
    case 'manual': return 'Manual';
    default: return channel;
  }
}
