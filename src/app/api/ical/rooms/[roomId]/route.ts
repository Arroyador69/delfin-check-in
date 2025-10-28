import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// Configuración para evitar caché
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    
    console.log(`🏨 Generando iCal para habitación: ${roomId}`);
    
    // Obtener reservas de una habitación específica
    const reservations = await sql`
      SELECT *
      FROM reservations
      WHERE room_id = ${roomId}
      ORDER BY check_in DESC
    `;
    
    console.log(`✅ Generando iCal para ${reservations.rows.length} reservas de la habitación ${roomId}`);

    // Generar contenido iCal
    const icalContent = generateRoomICalContent(roomId, reservations.rows);

    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="habitacion-${roomId}-delfin.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'ETag': `"habitacion-${roomId}-${Date.now()}"`,
        'Last-Modified': new Date().toUTCString(),
        'X-WR-RELCALID': `habitacion-${roomId}-${Date.now()}`,
        'X-WR-TIMEZONE': 'Europe/Madrid',
      },
    });

  } catch (error) {
    console.error('Error generating room iCal:', error);
    return NextResponse.json(
      { error: 'Error al generar el calendario de la habitación' },
      { status: 500 }
    );
  }
}

function generateRoomICalContent(roomId: string, reservations: any[]): string {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Delfín Check-in//Habitación ${roomId}//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Habitación ${roomId} - Delfín Check-in 🐬
X-WR-CALDESC:Ocupación actualizada automáticamente - ${reservations.length} reservas
X-WR-TIMEZONE:Europe/Madrid
X-WR-RELCALID:habitacion-${roomId}-${now}
X-PUBLISHED-TTL:PT15M
REFRESH-INTERVAL;VALUE=DURATION:PT15M
`;

  reservations.forEach((reservation) => {
    const startDate = formatDateForICal(reservation.check_in, false); // false = check-in
    const endDate = formatDateForICal(reservation.check_out, true); // true = check-out
    const uid = `habitacion-${roomId}-${reservation.id}@delfincheckin.com`;
    const summary = `🏨 ${reservation.guest_name} - Habitación ${roomId}`;
    const description = `Huésped: ${reservation.guest_name}
Email: ${reservation.guest_email || 'No especificado'}
Teléfono: ${reservation.guest_phone || 'No especificado'}
Número de personas: ${reservation.guest_count || 1}
Estado: ${getStatusText(reservation.status)}
Canal: ${getChannelText(reservation.channel)}
Precio: €${Number(reservation.guest_paid || 0).toFixed(2)}
Ganancia: €${Number(reservation.net_income || 0).toFixed(2)}
NOTA: Verificar limpieza antes de la llegada`;

    ical += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${summary}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:Habitación ${roomId} - Delfín Check-in
STATUS:${reservation.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}
TRANSP:OPAQUE
CATEGORIES:HOTEL,ROOM,OCCUPANCY
X-MICROSOFT-CDO-BUSYSTATUS:BUSY
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
