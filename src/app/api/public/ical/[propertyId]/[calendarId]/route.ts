import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { sqlTextArrayForAny } from '@/lib/pg-sql-params';
import { getAcceptableReservationIdsArrayForProperty } from '@/lib/cleaning-reservation-room-match';

function escapeICal(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toICalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ propertyId: string; calendarId: string }> }
) {
  try {
    const { propertyId } = await params;
    const propId = parseInt(propertyId);

    const propertyResult = await sql`
      SELECT id, tenant_id, property_name
      FROM tenant_properties
      WHERE id = ${propId}
    `;

    if (propertyResult.rows.length === 0) {
      return new NextResponse('Not found', { status: 404 });
    }

    const property = propertyResult.rows[0];
    const tenantId = property.tenant_id;

    // 1. Reservas directas (direct_reservations)
    const directRes = await sql`
      SELECT id, reservation_code, guest_name, check_in_date AS check_in, check_out_date AS check_out, 'direct' AS source
      FROM direct_reservations
      WHERE property_id = ${propId} AND tenant_id = ${tenantId} AND reservation_status = 'confirmed'
    `;

    // 2. Reservas operativas (mismo matching UUID/legacy que calendario y disponibilidad)
    let systemRes = { rows: [] as any[] };
    try {
      const acceptableResRoomIds = await getAcceptableReservationIdsArrayForProperty(
        String(tenantId),
        propId
      );
      if (acceptableResRoomIds.length === 0) {
        systemRes = { rows: [] };
      } else {
        systemRes = await sql`
          SELECT r.id, r.external_id AS reservation_code, r.guest_name, r.check_in, r.check_out, 'system' AS source
          FROM reservations r
          WHERE r.tenant_id = ${tenantId}::uuid
            AND r.status = 'confirmed'
            AND r.room_id = ANY(${sqlTextArrayForAny(acceptableResRoomIds)})
        `;
      }
    } catch {
      try {
        systemRes = await sql`
          SELECT r.id, r.external_id AS reservation_code, r.guest_name, r.check_in, r.check_out, 'system' AS source
          FROM reservations r
          WHERE r.tenant_id = ${tenantId}::uuid AND r.status = 'confirmed'
        `;
      } catch {}
    }

    const allReservations = [...directRes.rows, ...systemRes.rows];

    const seen = new Set<string>();
    const deduped = allReservations.filter(r => {
      const key = `${r.guest_name}-${new Date(r.check_in).toISOString().slice(0, 10)}-${new Date(r.check_out).toISOString().slice(0, 10)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const now = toICalDate(new Date()) + 'T000000Z';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Delfin Check-in//Calendar//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeICal(property.property_name)} - Delfin Check-in`,
      'X-WR-TIMEZONE:Europe/Madrid',
    ];

    for (const r of deduped) {
      const checkIn = new Date(r.check_in);
      const checkOut = new Date(r.check_out);
      const uid = `res-${r.source}-${r.id}@delfincheckin.com`;
      const name = r.guest_name || 'Reserved';
      const code = r.reservation_code || '';

      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART;VALUE=DATE:${toICalDate(checkIn)}`,
        `DTEND;VALUE=DATE:${toICalDate(checkOut)}`,
        `DTSTAMP:${now}`,
        `SUMMARY:${escapeICal(`Reserved - ${name}`)}`,
        `DESCRIPTION:${escapeICal(`Reservation${code ? ' ' + code : ''}\\nGuest: ${name}`)}`,
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT',
      );
    }

    lines.push('END:VCALENDAR');
    const ical = lines.join('\r\n');

    return new NextResponse(ical, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="delfin-${propertyId}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[ical-out] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

