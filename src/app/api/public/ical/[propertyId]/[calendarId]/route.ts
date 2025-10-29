// =====================================================
// API ENDPOINT: GENERAR iCal DEL SISTEMA
// =====================================================
// Este endpoint genera un feed iCal basado en las reservas directas
// de una propiedad específica. El calendarId es un UUID único que
// identifica el calendario del sistema para esa propiedad.

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(
  req: NextRequest,
  { params }: { params: { propertyId: string; calendarId: string } }
) {
  try {
    const { propertyId, calendarId } = params;
    
    console.log(`📅 Generando iCal para propiedad ${propertyId}, calendario ${calendarId}`);
    
    // Obtener información de la propiedad
    const propertyResult = await sql`
      SELECT id, tenant_id, property_name
      FROM tenant_properties
      WHERE id = ${parseInt(propertyId)}
    `;
    
    if (propertyResult.rows.length === 0) {
      return new NextResponse('Propiedad no encontrada', { status: 404 });
    }
    
    const property = propertyResult.rows[0];
    
    // Obtener reservas directas confirmadas para esta propiedad
    const reservationsResult = await sql`
      SELECT 
        id,
        reservation_code,
        guest_name,
        guest_email,
        check_in_date,
        check_out_date,
        reservation_status,
        created_at
      FROM direct_reservations
      WHERE property_id = ${parseInt(propertyId)}
        AND tenant_id = ${property.tenant_id}
        AND reservation_status = 'confirmed'
      ORDER BY check_in_date ASC
    `;
    
    const reservations = reservationsResult.rows;
    
    // Generar el contenido del iCal
    const icalLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Delfín Check-in//ES//',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${property.property_name} - Delfín Check-in`,
      `X-WR-CALDESC:Calendario de reservas para ${property.property_name}`,
      'X-WR-TIMEZONE:Europe/Madrid',
      ''
    ];
    
    // Función para formatear fechas en formato iCal (YYYYMMDDTHHmmss)
    const formatICalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };
    
    // Función para obtener inicio del día
    const startOfDay = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    
    // Función para obtener fin del día
    const endOfDay = (date: Date) => {
      const d = new Date(date);
      d.setHours(23, 59, 59, 999);
      return d;
    };
    
    // Agregar cada reserva como evento
    for (const reservation of reservations) {
      const checkIn = new Date(reservation.check_in_date);
      const checkOut = new Date(reservation.check_out_date);
      
      const dtStart = formatICalDate(startOfDay(checkIn));
      const dtEnd = formatICalDate(endOfDay(checkOut));
      
      // Generar UID único para el evento
      const eventUid = `reservation-${reservation.id}@delfincheckin.com`;
      
      // Escapar texto para iCal
      const escapeICal = (text: string) => {
        return text
          .replace(/\\/g, '\\\\')
          .replace(/;/g, '\\;')
          .replace(/,/g, '\\,')
          .replace(/\n/g, '\\n');
      };
      
      const summary = escapeICal(`Reserva ${reservation.reservation_code} - ${reservation.guest_name}`);
      const description = escapeICal(
        `Reserva confirmada\n` +
        `Código: ${reservation.reservation_code}\n` +
        `Huésped: ${reservation.guest_name}\n` +
        `Email: ${reservation.guest_email || 'N/A'}`
      );
      
      icalLines.push(
        'BEGIN:VEVENT',
        `UID:${eventUid}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `DTSTAMP:${formatICalDate(new Date())}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'TRANSP:OPAQUE',
        'END:VEVENT',
        ''
      );
    }
    
    icalLines.push('END:VCALENDAR');
    
    const icalContent = icalLines.join('\r\n');
    
    // Retornar como archivo iCal
    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="delfin-${propertyId}-${calendarId}.ics"`,
        'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
      },
    });
    
  } catch (error) {
    console.error('❌ Error generando iCal:', error);
    return new NextResponse('Error interno del servidor', { status: 500 });
  }
}

