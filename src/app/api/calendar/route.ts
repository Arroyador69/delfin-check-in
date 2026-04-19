import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { sqlTextArrayForAny } from '@/lib/pg-sql-params'
import {
  getTenantRoomContext,
  resolveReservationRoomIdToCanonicalRoomId,
  getAcceptableReservationIdsArrayForProperty,
  reservationRowMatchesLinkedRoom,
} from '@/lib/cleaning-reservation-room-match'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenant_id')
    const propertyId = searchParams.get('property_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'tenant_id es requerido' }, { status: 400 })
    }

    console.log('[calendar] params:', { tenantId, propertyId, from, to })

    // Rango por defecto: hoy hasta +60 días
    const fromDate = from ? new Date(from) : new Date()
    const toDate = to ? new Date(to) : new Date(Date.now() + 60 * 24 * 3600 * 1000)

    // Availability (bloqueos por día)
    let availability: any = { rows: [] as any[] }
    try {
      const params: any[] = [tenantId, fromDate.toISOString().slice(0,10), toDate.toISOString().slice(0,10)]
      let text = `
      SELECT pa.property_id, pa.date, pa.available, pa.blocked_reason
      FROM property_availability pa
      JOIN tenant_properties tp ON tp.id = pa.property_id
        WHERE tp.tenant_id = $1::uuid
          AND pa.date >= $2::date
          AND pa.date <  $3::date
      `
      if (propertyId) {
        params.push(parseInt(propertyId))
        text += ` AND pa.property_id = $4`
      }
      text += ` ORDER BY pa.date ASC`
      availability = await sql.query(text, params)
    } catch (e: any) {
      console.error('[calendar] availability error:', e?.message || e)
    }

    // Eventos internos
    let events: any = { rows: [] as any[] }
    try {
      const params: any[] = [tenantId, toDate.toISOString().slice(0,10), fromDate.toISOString().slice(0,10)]
      let text = `
      SELECT tenant_id, property_id, event_title, event_description, start_date, end_date, is_blocked, event_type
      FROM calendar_events
        WHERE tenant_id = $1::uuid
          AND start_date < $2::date
          AND end_date   > $3::date
      `
      if (propertyId) {
        params.push(parseInt(propertyId))
        text += ` AND property_id = $4`
      }
      text += ` ORDER BY start_date ASC`
      events = await sql.query(text, params)
    } catch (e: any) {
      console.error('[calendar] events error:', e?.message || e)
    }

    // Reservas operativas: mismo matching UUID + legacy que limpieza / slots
    const roomCtx = await getTenantRoomContext(tenantId)
    const { orderedRoomIds, roomNameById } = roomCtx

    let filterAcceptableIds: string[] | null = null
    if (propertyId) {
      filterAcceptableIds = await getAcceptableReservationIdsArrayForProperty(
        tenantId,
        parseInt(propertyId, 10)
      )
    }

    let reservations
    try {
      if (propertyId) {
        if (!filterAcceptableIds || filterAcceptableIds.length === 0) {
          reservations = { rows: [] as any[] }
        } else {
          const acc = filterAcceptableIds
          reservations = await sql`
            SELECT r.id, r.tenant_id, r.room_id, r.guest_name, r.check_in, r.check_out, r.channel, r.guest_count
            FROM reservations r
            WHERE r.tenant_id = ${tenantId}::uuid
              AND r.check_in  < ${toDate.toISOString().slice(0, 10)}::date
              AND r.check_out > ${fromDate.toISOString().slice(0, 10)}::date
              AND r.room_id = ANY(${sqlTextArrayForAny(acc)})
            ORDER BY r.check_in ASC
          `
        }
      } else {
        reservations = await sql`
          SELECT r.id, r.tenant_id, r.room_id, r.guest_name, r.check_in, r.check_out, r.channel, r.guest_count
          FROM reservations r
          WHERE r.tenant_id = ${tenantId}::uuid
            AND r.check_in  < ${toDate.toISOString().slice(0, 10)}::date
            AND r.check_out > ${fromDate.toISOString().slice(0, 10)}::date
          ORDER BY r.check_in ASC
        `
      }
    } catch (e) {
      console.warn('[calendar] reservations primary query error, falling back:', (e as any)?.message)
      reservations = await sql`
        SELECT r.id, r.tenant_id, r.room_id, r.guest_name, r.check_in, r.check_out, r.channel, r.guest_count
        FROM reservations r
        WHERE r.tenant_id = ${tenantId}::uuid
          AND r.check_in  < ${toDate.toISOString().slice(0, 10)}::date
          AND r.check_out > ${fromDate.toISOString().slice(0, 10)}::date
        ORDER BY r.check_in ASC
      `
      if (propertyId) {
        if (!filterAcceptableIds || filterAcceptableIds.length === 0) {
          reservations = { rows: [] as any[] }
        } else {
          const acc = new Set(filterAcceptableIds)
          reservations = {
            rows: (reservations.rows as any[]).filter((r) =>
              reservationRowMatchesLinkedRoom(r.room_id, acc)
            ),
          }
        }
      }
    }

    const reservationEvents = reservations.rows.map((r: any) => {
      const canonical = resolveReservationRoomIdToCanonicalRoomId(r.room_id, orderedRoomIds)
      const displayRoomId = canonical ?? String(r.room_id)
      const room_name =
        (canonical ? roomNameById.get(canonical) : null) ??
        roomNameById.get(String(r.room_id)) ??
        null
      return {
        reservation_id: r.id,
        tenant_id: r.tenant_id,
        property_id: propertyId ? parseInt(propertyId) : null,
        event_title: `Reserva ${r.guest_name}`,
        event_description: null,
        start_date: r.check_in,
        end_date: r.check_out,
        is_blocked: true,
        event_type: 'reservation',
        room_id: displayRoomId,
        room_name,
        guest_name: r.guest_name,
        channel: r.channel || null,
        guest_count: r.guest_count || null,
      }
    })

    const calendarOnlyEvents = events.rows.filter(
      (ev: any) => ev.event_type !== 'reservation'
    )

    const allEvents = [...calendarOnlyEvents, ...reservationEvents]
    const seen = new Set<string>()
    const dedupedEvents = allEvents.filter((ev: any) => {
      if (!ev.reservation_id) return true
      const key = String(ev.reservation_id)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({
      success: true,
      range: { from: fromDate.toISOString().slice(0,10), to: toDate.toISOString().slice(0,10) },
      availability: availability.rows,
      events: dedupedEvents
    })
  } catch (e: any) {
    console.error('[calendar] fatal error:', e?.message || e)
    return NextResponse.json({ success: false, error: e?.message || 'unknown' }, { status: 500 })
  }
}


