import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

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
      availability = await sql`
        SELECT pa.property_id, pa.date, pa.available, pa.blocked_reason
        FROM property_availability pa
        JOIN tenant_properties tp ON tp.id = pa.property_id
        WHERE tp.tenant_id = ${tenantId}::uuid
          ${propertyId ? sql`AND pa.property_id = ${parseInt(propertyId)}` : sql``}
          AND pa.date >= ${fromDate.toISOString().slice(0,10)}::date
          AND pa.date <  ${toDate.toISOString().slice(0,10)}::date
        ORDER BY pa.date ASC
      `
    } catch (e: any) {
      console.error('[calendar] availability error:', e?.message || e)
    }

    // Eventos internos
    let events: any = { rows: [] as any[] }
    try {
      events = await sql`
        SELECT tenant_id, property_id, event_title, event_description, start_date, end_date, is_blocked, event_type
        FROM calendar_events
        WHERE tenant_id = ${tenantId}::uuid
          ${propertyId ? sql`AND property_id = ${parseInt(propertyId)}` : sql``}
          AND start_date < ${toDate.toISOString().slice(0,10)}::date
          AND end_date   > ${fromDate.toISOString().slice(0,10)}::date
        ORDER BY start_date ASC
      `
    } catch (e: any) {
      console.error('[calendar] events error:', e?.message || e)
    }

    // Reservas operativas como eventos
    let filterRoomId: string | null = null
    if (propertyId) {
      const mapRow = await sql`
        SELECT room_id FROM property_room_map
        WHERE tenant_id = ${tenantId}::uuid AND property_id = ${parseInt(propertyId)}
        LIMIT 1
      `
      filterRoomId = mapRow.rows?.[0]?.room_id || null
    }
    let reservations
    try {
      reservations = await sql`
        SELECT r.tenant_id, r.room_id, r.guest_name, r.check_in, r.check_out
        FROM reservations r
        JOIN property_room_map prm
          ON prm.tenant_id = ${tenantId}::uuid AND prm.room_id = r.room_id
        WHERE r.tenant_id = ${tenantId}::uuid
          ${propertyId ? sql`AND prm.property_id = ${parseInt(propertyId)}` : sql``}
          AND r.check_in  < ${toDate.toISOString().slice(0,10)}::date
          AND r.check_out > ${fromDate.toISOString().slice(0,10)}::date
        ORDER BY r.check_in ASC
      `
    } catch (e) {
      console.warn('[calendar] reservations primary query error, falling back:', (e as any)?.message)
      reservations = await sql`
        SELECT r.tenant_id, r.room_id, r.guest_name, r.check_in, r.check_out
        FROM reservations r
        WHERE r.room_id = ANY(
          SELECT prm.room_id FROM property_room_map prm WHERE prm.tenant_id = ${tenantId}::uuid
        )
          ${filterRoomId ? sql`AND r.room_id = ${filterRoomId}` : sql``}
          AND r.check_in  < ${toDate.toISOString().slice(0,10)}::date
          AND r.check_out > ${fromDate.toISOString().slice(0,10)}::date
        ORDER BY r.check_in ASC
      `
    }
    const reservationEvents = reservations.rows.map((r: any) => ({
      tenant_id: r.tenant_id,
      property_id: propertyId ? parseInt(propertyId) : null,
      event_title: `Reserva ${r.guest_name}`,
      event_description: null,
      start_date: r.check_in,
      end_date: r.check_out,
      is_blocked: true,
      event_type: 'reservation'
    }))

    return NextResponse.json({
      success: true,
      range: { from: fromDate.toISOString().slice(0,10), to: toDate.toISOString().slice(0,10) },
      availability: availability.rows,
      events: [...events.rows, ...reservationEvents]
    })
  } catch (e: any) {
    console.error('[calendar] fatal error:', e?.message || e)
    return NextResponse.json({ success: false, error: e?.message || 'unknown' }, { status: 500 })
  }
}


