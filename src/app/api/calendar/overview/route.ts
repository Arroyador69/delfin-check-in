import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenant_id')
    const propertyId = searchParams.get('property_id')
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!tenantId || !propertyId || !start || !end) {
      return NextResponse.json({ success: false, error: 'tenant_id, property_id, start, end son requeridos' }, { status: 400 })
    }

    // Disponibilidad (bloqueos/overrides) por día
    const availability = await sql`
      SELECT property_id, date, available, blocked_reason
      FROM property_availability
      WHERE property_id = ${parseInt(propertyId)}
        AND date >= ${start}::date
        AND date <  ${end}::date
      ORDER BY date ASC
    `

    // Eventos de calendario internos
    const events = await sql`
      SELECT tenant_id, property_id, event_title, event_description, start_date, end_date, is_blocked, event_type, created_at
      FROM calendar_events
      WHERE tenant_id = ${tenantId}::uuid
        AND property_id = ${parseInt(propertyId)}
        AND start_date < ${end}::date
        AND end_date   > ${start}::date
      ORDER BY created_at DESC
    `

    return NextResponse.json({
      success: true,
      availability: availability.rows,
      events: events.rows
    })
  } catch (error: any) {
    console.error('❌ [API CALENDAR] Error:', error)
    return NextResponse.json({ success: false, error: 'Calendar overview failed' }, { status: 500 })
  }
}


