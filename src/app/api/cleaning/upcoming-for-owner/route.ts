import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';
import { ensureCleaningPublicLinkTables } from '@/lib/ensure-cleaning-public-links-tables';
import {
  buildCleaningTasksForRoom,
  type CleaningTrigger,
  type ReservationRow,
} from '@/lib/cleaning-tasks';
import { getYmdInTimeZone } from '@/lib/calendar-date';
import { sqlTextArrayForAny } from '@/lib/pg-sql-params';
import {
  expandRoomIdsForReservationQuery,
  getAcceptableReservationRoomIdsByLinkedRoom,
  reservationRowMatchesLinkedRoom,
} from '@/lib/cleaning-reservation-room-match';

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  let tenantId = await getTenantId(req);
  if (!tenantId || tenantId.trim() === '') tenantId = req.headers.get('x-tenant-id');
  if (!tenantId || tenantId === 'default' || tenantId.trim() === '') return null;
  return tenantId;
}

/**
 * Próximas tareas de limpieza para el panel del propietario.
 * Solo incluye habitaciones que figuren en al menos un enlace público de limpieza
 * (misma visión agregada que si unieras las habitaciones de todos tus enlaces).
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No tenant' }, { status: 401 });
    }

    await ensureCleaningPublicLinkTables();

    const now = new Date();
    const pastDays = 30;
    const futureDays = 180;
    const fromDate = new Date(now.getTime() - pastDays * 86400000);
    const toDate = new Date(now.getTime() + futureDays * 86400000);
    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = toDate.toISOString().slice(0, 10);

    const linkedRows = await sql`
      SELECT DISTINCT clr.room_id::text AS room_id
      FROM cleaning_link_rooms clr
      WHERE clr.tenant_id = ${tenantId}::uuid
        AND BTRIM(clr.room_id::text) <> ''
    `;

    const roomIds: string[] = linkedRows.rows.map((r) =>
      String((r as Record<string, unknown>).room_id)
    );
    const hasCleaningLinks = roomIds.length > 0;

    if (!hasCleaningLinks) {
      const configCountEmpty = await sql`
        SELECT COUNT(*)::int AS c FROM cleaning_config WHERE tenant_id = ${tenantId}::uuid
      `;
      return NextResponse.json({
        success: true,
        tasks: [],
        configured_room_count: Number(configCountEmpty.rows[0]?.c ?? 0),
        has_cleaning_links: false,
        linked_room_count: 0,
      });
    }

    const configCount = await sql`
      SELECT COUNT(*)::int AS c
      FROM cleaning_config
      WHERE tenant_id = ${tenantId}::uuid
    `;
    const configuredRoomCount = Number(configCount.rows[0]?.c ?? 0);

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
      WHERE r.id::text = ANY(${sqlTextArrayForAny(roomIds)})
    `;

    const propertyByRoom = new Map<string, string>();
    try {
      const pr = await sql`
        SELECT prm.room_id::text AS room_id, tp.property_name
        FROM property_room_map prm
        JOIN tenant_properties tp ON tp.id = prm.property_id AND tp.tenant_id = prm.tenant_id
        WHERE prm.tenant_id = ${tenantId}::uuid
          AND prm.room_id = ANY(${sqlTextArrayForAny(roomIds)})
      `;
      for (const row of pr.rows) {
        propertyByRoom.set(row.room_id as string, row.property_name as string);
      }
    } catch {
      /* opcional */
    }

    const roomIdsForReservations = await expandRoomIdsForReservationQuery(tenantId, roomIds);
    const acceptableByLinkedRoom = await getAcceptableReservationRoomIdsByLinkedRoom(
      tenantId,
      roomIds
    );

    const reservations = await sql`
      SELECT id, guest_name, check_in, check_out, guest_count, channel, room_id
      FROM reservations
      WHERE tenant_id = ${tenantId}::uuid
        AND room_id = ANY(${sqlTextArrayForAny(roomIdsForReservations)})
        AND (status IS NULL OR LOWER(TRIM(status)) NOT IN ('cancelled', 'canceled'))
        AND check_out >= ${fromStr}::date
        AND check_in <= ${toStr}::date
      ORDER BY check_in ASC
    `;

    const ownerNotes = await sql`
      SELECT room_id, cleaning_date, note
      FROM cleaning_notes
      WHERE tenant_id = ${tenantId}::uuid
        AND room_id = ANY(${sqlTextArrayForAny(roomIdsForReservations)})
        AND author_type = 'owner'
        AND cleaning_date >= ${fromStr}::date
        AND cleaning_date <= ${toStr}::date
      ORDER BY created_at DESC
    `;

    const notesMap = new Map<string, string>();
    for (const n of ownerNotes.rows) {
      const key = `${n.room_id}|${new Date(n.cleaning_date as string).toISOString().slice(0, 10)}`;
      if (!notesMap.has(key)) notesMap.set(key, n.note as string);
    }

    type TaskOut = Record<string, unknown>;
    const allTasks: TaskOut[] = [];

    for (const row of roomsData.rows) {
      const roomId = row.room_id as string;
      const acceptable =
        acceptableByLinkedRoom.get(roomId) ?? new Set<string>([roomId]);
      const resForRoom = reservations.rows.filter((r) =>
        reservationRowMatchesLinkedRoom(
          (r as Record<string, unknown>).room_id,
          acceptable
        )
      );
      const notesByDate = new Map<string, string>();
      for (const [k, v] of notesMap) {
        const pipe = k.indexOf('|');
        if (pipe === -1) continue;
        const noteRid = k.slice(0, pipe);
        const d = k.slice(pipe + 1);
        if (reservationRowMatchesLinkedRoom(noteRid, acceptable)) {
          notesByDate.set(d, v);
        }
      }

      const notePathStub = (_rid: string, _date: string) => '';

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
        notePathStub
      );

      for (const task of tasks) {
        const { note_path: _np, ...rest } = task;
        allTasks.push(rest as TaskOut);
      }
    }

    allTasks.sort(
      (a, b) =>
        new Date(String(a.start_iso)).getTime() - new Date(String(b.start_iso)).getTime()
    );

    const todayMadrid = getYmdInTimeZone(new Date(), 'Europe/Madrid');
    const upcoming = allTasks.filter((t) => String(t.date) >= todayMadrid);

    return NextResponse.json({
      success: true,
      tasks: upcoming,
      configured_room_count: configuredRoomCount,
      has_cleaning_links: true,
      linked_room_count: roomIds.length,
    });
  } catch (error) {
    console.error('[cleaning/upcoming-for-owner] error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
