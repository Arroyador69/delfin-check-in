import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import {
  buildCleaningTasksForRoom,
  type CleaningTaskEvent,
  type CleaningTrigger,
  type ReservationRow,
} from '@/lib/cleaning-tasks';
import { getCleaningPublicBaseUrlFromRequest } from '@/lib/cleaning-public-base-url';
import { getYmdInTimeZone } from '@/lib/calendar-date';

type TaskJson = CleaningTaskEvent & { note_url: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const linkResult = await sql`
      SELECT id, tenant_id, label
      FROM cleaning_public_links
      WHERE public_token = ${token}
      LIMIT 1
    `;

    if (linkResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Enlace no válido' }, { status: 404 });
    }

    const link = linkResult.rows[0] as { id: string; tenant_id: string; label: string };
    const tenantId = link.tenant_id;

    const roomRows = await sql`
      SELECT room_id FROM cleaning_link_rooms
      WHERE link_id = ${link.id}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    const roomIds: string[] = roomRows.rows.map((r: { room_id: string }) => r.room_id);

    if (roomIds.length === 0) {
      return NextResponse.json({
        success: true,
        label: link.label,
        tenant_name: null,
        tasks: [] as unknown[],
      });
    }

    const tenantRow = await sql`
      SELECT name FROM tenants WHERE id = ${tenantId}::uuid LIMIT 1
    `;
    const tenantName = (tenantRow.rows[0]?.name as string) || null;

    const roomsData = await sql`
      SELECT r.id::text AS room_id, r.name AS room_name,
        COALESCE(cc.checkout_time, TIME '11:00') AS checkout_time,
        COALESCE(cc.checkin_time, TIME '16:00') AS checkin_time,
        COALESCE(cc.cleaning_duration_minutes, 120) AS cleaning_duration_minutes,
        COALESCE(cc.cleaning_trigger::text, 'on_checkout') AS cleaning_trigger,
        COALESCE(cc.same_day_alert, true) AS same_day_alert
      FROM "Room" r
      LEFT JOIN cleaning_config cc
        ON cc.tenant_id = ${tenantId}::uuid AND cc.room_id = r.id::text
      WHERE r.id::text = ANY(${roomIds})
    `;

    const propertyByRoom = new Map<string, string>();
    try {
      const pr = await sql`
        SELECT prm.room_id::text AS room_id, tp.property_name
        FROM property_room_map prm
        JOIN tenant_properties tp ON tp.id = prm.property_id AND tp.tenant_id = prm.tenant_id
        WHERE prm.tenant_id = ${tenantId}::uuid
          AND prm.room_id = ANY(${roomIds})
      `;
      for (const row of pr.rows) {
        propertyByRoom.set(row.room_id as string, row.property_name as string);
      }
    } catch {
      /* tabla opcional */
    }

    const now = new Date();
    const pastDays = 30;
    const futureDays = 180;
    const fromDate = new Date(now.getTime() - pastDays * 86400000);
    const toDate = new Date(now.getTime() + futureDays * 86400000);
    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = toDate.toISOString().slice(0, 10);

    const reservations = await sql`
      SELECT id, guest_name, check_in, check_out, guest_count, channel, room_id
      FROM reservations
      WHERE tenant_id = ${tenantId}::uuid
        AND room_id = ANY(${roomIds})
        AND (status IS NULL OR LOWER(TRIM(status)) NOT IN ('cancelled', 'canceled'))
        AND check_out >= ${fromStr}::date
        AND check_in <= ${toStr}::date
      ORDER BY check_in ASC
    `;

    const ownerNotes = await sql`
      SELECT room_id, cleaning_date, note
      FROM cleaning_notes
      WHERE tenant_id = ${tenantId}::uuid
        AND room_id = ANY(${roomIds})
        AND author_type = 'owner'
        AND cleaning_date >= ${fromStr}::date
        AND cleaning_date <= ${toStr}::date
      ORDER BY created_at DESC
    `;

    const notesMap = new Map<string, string>();
    for (const n of ownerNotes.rows) {
      const key = `${n.room_id}|${new Date(n.cleaning_date).toISOString().slice(0, 10)}`;
      if (!notesMap.has(key)) notesMap.set(key, n.note as string);
    }

    const baseUrl = getCleaningPublicBaseUrlFromRequest(req);
    const allTasks: TaskJson[] = [];

    for (const row of roomsData.rows) {
      const roomId = row.room_id as string;
      const resForRoom = reservations.rows.filter((r: { room_id: string }) => r.room_id === roomId);
      const notesByDate = new Map<string, string>();
      for (const [k, v] of notesMap) {
        if (k.startsWith(`${roomId}|`)) {
          const d = k.split('|')[1];
          notesByDate.set(d, v);
        }
      }

      const notePathFor = (rid: string, date: string) =>
        `/api/cleaning/public-link/${token}/note?room_id=${encodeURIComponent(rid)}&date=${encodeURIComponent(date)}`;

      const tasks = buildCleaningTasksForRoom(
        {
          room_id: roomId,
          room_name: (row.room_name as string) || `Habitación ${roomId}`,
          property_name: propertyByRoom.get(roomId) || null,
          checkout_time: String(row.checkout_time).slice(0, 5),
          checkin_time: String(row.checkin_time).slice(0, 5),
          cleaning_duration_minutes: Number(row.cleaning_duration_minutes),
          cleaning_trigger: row.cleaning_trigger as CleaningTrigger,
          same_day_alert: Boolean(row.same_day_alert),
        },
        resForRoom.map(
          (r: Record<string, unknown>): ReservationRow => ({
            id: String(r.id),
            guest_name: r.guest_name as string | null,
            check_in: r.check_in as Date,
            check_out: r.check_out as Date,
            guest_count: r.guest_count as number | null,
            channel: r.channel as string | null,
          })
        ),
        notesByDate,
        notePathFor
      );

      for (const t of tasks) {
        const rowTask: TaskJson = {
          ...t,
          note_url: `${baseUrl}${t.note_path}`,
        };
        allTasks.push(rowTask);
      }
    }

    allTasks.sort((a, b) => new Date(a.start_iso).getTime() - new Date(b.start_iso).getTime());

    /** Solo limpiezas desde hoy (Europa/Madrid): no mostrar meses pasados ya ejecutados. */
    const todayMadrid = getYmdInTimeZone(new Date(), 'Europe/Madrid');
    const upcoming = allTasks.filter(t => t.date >= todayMadrid);

    return NextResponse.json({
      success: true,
      label: link.label,
      tenant_name: tenantName,
      tasks: upcoming,
    });
  } catch (error: unknown) {
    const msg = (error as Error).message || '';
    if (msg.includes('cleaning_public_links') || msg.includes('does not exist')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Servicio no disponible: falta migración en base de datos.',
        },
        { status: 503 }
      );
    }
    console.error('[cleaning/public-view] error:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
