import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'
import { getTenantId } from '@/lib/tenant'

export async function GET(req: NextRequest) {
  try {
    let tenantId = await getTenantId(req)
    if (!tenantId || tenantId.trim() === '') {
      tenantId = req.headers.get('x-tenant-id') || ''
    }
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Tenant no identificado' }, { status: 401 })
    }

    // Traer Rooms (slots) del tenant
    const rooms = await sql`
      SELECT id AS room_id, name AS room_name
      FROM "Room"
      WHERE "lodgingId" = ${tenantId}::text
      ORDER BY id
    `

    // Traer mappings existentes y sus propiedades
    const mappings = await sql`
      SELECT prm.room_id, prm.property_id, tp.property_name
      FROM property_room_map prm
      JOIN tenant_properties tp ON tp.id = prm.property_id
      WHERE prm.tenant_id = ${tenantId}::uuid
    `

    const mapByRoom = new Map<number, { property_id: number; property_name: string }>()
    for (const r of mappings.rows) {
      mapByRoom.set(Number(r.room_id), { property_id: Number(r.property_id), property_name: r.property_name })
    }

    const slots = rooms.rows.map(r => {
      const m = mapByRoom.get(Number(r.room_id))
      return {
        tenant_id: tenantId,
        room_id: Number(r.room_id),
        room_name: r.room_name as string,
        property_id: m?.property_id || null,
        property_name: m?.property_name || null,
        is_placeholder: !m
      }
    })

    return NextResponse.json({ success: true, total: slots.length, slots })
  } catch (e: any) {
    console.error('❌ [property-slots] Error:', e)
    return NextResponse.json({ success: false, error: 'Error obteniendo slots' }, { status: 500 })
  }
}


