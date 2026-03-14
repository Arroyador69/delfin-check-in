import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

function escapeIcal(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function formatIcalDate(date: Date, time: string): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function addMinutes(date: Date, time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m + minutes, 0, 0);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const configResult = await sql`
      SELECT cc.*, r.name AS room_name, t.name AS tenant_name, t.email AS tenant_email
      FROM cleaning_config cc
      JOIN tenants t ON t.id = cc.tenant_id
      LEFT JOIN "Room" r ON r.id = cc.room_id
      WHERE cc.ical_token = ${token} AND cc.ical_enabled = true
      LIMIT 1
    `;

    if (configResult.rows.length === 0) {
      return new NextResponse('Calendar not found', { status: 404 });
    }

    const config = configResult.rows[0];
    const now = new Date();
    const pastDays = 30;
    const futureDays = 180;
    const fromDate = new Date(now.getTime() - pastDays * 86400000);
    const toDate = new Date(now.getTime() + futureDays * 86400000);

    const reservations = await sql`
      SELECT r.id, r.guest_name, r.check_in, r.check_out, r.guest_count, r.channel
      FROM reservations r
      WHERE r.room_id = ${config.room_id}
        AND r.tenant_id = ${config.tenant_id}::uuid
        AND r.status = 'confirmed'
        AND r.check_out >= ${fromDate.toISOString().slice(0, 10)}::date
        AND r.check_in  <= ${toDate.toISOString().slice(0, 10)}::date
      ORDER BY r.check_in ASC
    `;

    const reservationsList = reservations.rows;

    const ownerNotes = await sql`
      SELECT cleaning_date, note
      FROM cleaning_notes
      WHERE tenant_id = ${config.tenant_id}::uuid
        AND room_id = ${config.room_id}
        AND author_type = 'owner'
        AND cleaning_date >= ${fromDate.toISOString().slice(0, 10)}::date
        AND cleaning_date <= ${toDate.toISOString().slice(0, 10)}::date
      ORDER BY created_at DESC
    `;
    const notesByDate = new Map<string, string>();
    ownerNotes.rows.forEach((n: any) => {
      const key = new Date(n.cleaning_date).toISOString().slice(0, 10);
      if (!notesByDate.has(key)) notesByDate.set(key, n.note);
    });

    const roomName = config.room_name || `Room ${config.room_id}`;
    const checkoutTime = config.checkout_time?.slice(0, 5) || '11:00';
    const checkinTime = config.checkin_time?.slice(0, 5) || '16:00';
    const duration = config.cleaning_duration_minutes || 120;
    const trigger = config.cleaning_trigger || 'on_checkout';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com';
    const noteUrl = `${baseUrl}/api/cleaning/public/${token}/note`;

    let icalEvents = '';

    for (let i = 0; i < reservationsList.length; i++) {
      const res = reservationsList[i];
      const checkoutDate = new Date(res.check_out);
      const checkinDate = new Date(res.check_in);
      const guestName = res.guest_name || 'Huésped';
      const guestCount = res.guest_count || 1;
      const checkoutDateStr = checkoutDate.toISOString().slice(0, 10);

      const nextRes = reservationsList.find((r: any) => {
        const nextIn = new Date(r.check_in).toISOString().slice(0, 10);
        return nextIn === checkoutDateStr && r.id !== res.id;
      });

      const isSameDayTurnover = !!nextRes;
      const ownerNote = notesByDate.get(checkoutDateStr);

      const buildDescription = (cleaningDate: string): string => {
        let desc = `Checkout: ${guestName}\\n`;
        desc += `Personas: ${guestCount}\\n`;
        if (res.channel) desc += `Canal: ${res.channel}\\n`;
        if (isSameDayTurnover && config.same_day_alert && nextRes) {
          desc += `\\n⚡ TURNOVER MISMO DÍA\\n`;
          desc += `Próximo check-in: ${nextRes.guest_name} a las ${checkinTime}\\n`;
          desc += `Personas: ${nextRes.guest_count || 1}\\n`;
        } else if (nextRes) {
          desc += `\\nPróximo check-in: ${nextRes.guest_name}\\n`;
        }
        if (ownerNote) desc += `\\n📝 Nota: ${escapeIcal(ownerNote)}\\n`;
        desc += `\\n🔗 Dejar nota: ${noteUrl}?date=${cleaningDate}`;
        return desc;
      };

      if (trigger === 'on_checkout' || trigger === 'both') {
        const summary = isSameDayTurnover && config.same_day_alert
          ? `⚡ URGENTE - Limpieza ${roomName}`
          : `🧹 Limpieza ${roomName}`;

        icalEvents += [
          'BEGIN:VEVENT',
          `UID:clean-co-${res.id}@delfincheckin.com`,
          `DTSTART:${formatIcalDate(checkoutDate, checkoutTime)}`,
          `DTEND:${addMinutes(checkoutDate, checkoutTime, duration)}`,
          `SUMMARY:${escapeIcal(summary)}`,
          `DESCRIPTION:${buildDescription(checkoutDateStr)}`,
          `LOCATION:${escapeIcal(roomName)}`,
          'STATUS:CONFIRMED',
          `LAST-MODIFIED:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
          'END:VEVENT',
          ''
        ].join('\r\n');
      }

      if (trigger === 'day_before_checkin' || trigger === 'both') {
        const dayBefore = new Date(checkinDate.getTime() - 86400000);
        const dayBeforeStr = dayBefore.toISOString().slice(0, 10);
        if (dayBeforeStr !== checkoutDateStr) {
          icalEvents += [
            'BEGIN:VEVENT',
            `UID:clean-pre-${res.id}@delfincheckin.com`,
            `DTSTART:${formatIcalDate(dayBefore, checkoutTime)}`,
            `DTEND:${addMinutes(dayBefore, checkoutTime, duration)}`,
            `SUMMARY:${escapeIcal(`🧹 Pre-limpieza ${roomName}`)}`,
            `DESCRIPTION:Preparar para check-in de ${guestName} mañana a las ${checkinTime}\\nPersonas: ${guestCount}\\n\\n🔗 Dejar nota: ${noteUrl}?date=${dayBeforeStr}`,
            `LOCATION:${escapeIcal(roomName)}`,
            'STATUS:CONFIRMED',
            `LAST-MODIFIED:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
            'END:VEVENT',
            ''
          ].join('\r\n');
        }
      }
    }

    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Delfin Check-in//Cleaning Calendar//ES',
      `X-WR-CALNAME:Limpieza - ${roomName}`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-TIMEZONE:Europe/Madrid`,
      icalEvents,
      'END:VCALENDAR'
    ].join('\r\n');

    return new NextResponse(ical, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="limpieza-${roomName.replace(/\s+/g, '-').toLowerCase()}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[ical/cleaning] error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
