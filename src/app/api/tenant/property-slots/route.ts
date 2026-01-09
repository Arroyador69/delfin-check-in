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

    console.log('🏠 [property-slots] Tenant detectado:', tenantId)

    // Resolver lodging_id asociado al tenant (usar tenant_id como fallback si no existe)
    const tenantRow = await sql`
      SELECT lodging_id
      FROM tenants
      WHERE id = ${tenantId}::uuid
      LIMIT 1
    `
    const lodgingId: string = tenantRow.rows?.[0]?.lodging_id || tenantId
    console.log('🏨 [property-slots] LodgingId detectado:', lodgingId)

    // Obtener habitaciones usando lodgingId (con fallback a tenantId)
    const rooms = await sql`
      SELECT id AS room_id, name AS room_name
      FROM "Room"
      WHERE "lodgingId" = ${lodgingId}::text
      ORDER BY id
    `
    console.log('📦 [property-slots] Rooms encontrados:', (rooms as any).rowCount)

    // Traer mappings existentes y sus propiedades
    const mappings = await sql`
      SELECT prm.room_id, prm.property_id, tp.property_name
      FROM property_room_map prm
      JOIN tenant_properties tp ON tp.id = prm.property_id
      WHERE prm.tenant_id = ${tenantId}::uuid
    `

    console.log('🔗 [property-slots] Mappings encontrados:', mappings.rowCount)

    const mapByRoom = new Map<string, { property_id: number; property_name: string }>()
    for (const r of mappings.rows) {
      mapByRoom.set(String(r.room_id), { property_id: Number(r.property_id), property_name: r.property_name })
    }

    const slots = rooms.rows.map(r => {
      const key = String(r.room_id)
      const m = mapByRoom.get(key)
      return {
        tenant_id: tenantId,
        room_id: key,
        room_name: r.room_name as string,
        property_id: m?.property_id || null,
        property_name: m?.property_name || null,
        is_placeholder: !m
      }
    })

    console.log('✅ [property-slots] Slots construidos:', slots.length)
    return NextResponse.json({ success: true, total: slots.length, slots })
  } catch (e: any) {
    console.error('❌ [property-slots] Error:', e)
    return NextResponse.json({ success: false, error: 'Error obteniendo slots' }, { status: 500 })
  }
}




