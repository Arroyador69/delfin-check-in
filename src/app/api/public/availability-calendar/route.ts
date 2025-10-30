// =====================================================
// API PÚBLICA: CALENDARIO DE DISPONIBILIDAD (DÍAS BLOQUEADOS)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propertyId = parseInt(searchParams.get('property_id') || '0', 10);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    if (!propertyId || !from || !to) {
      return NextResponse.json(
        { success: false, error: 'Parámetros requeridos: property_id, from, to' },
        { status: 400 }
      );
    }

    // Obtener tenant_id y room_id del slot
    const mapping = await sql`
      SELECT tp.tenant_id, prm.room_id
      FROM tenant_properties tp
      LEFT JOIN property_room_map prm
        ON prm.tenant_id = tp.tenant_id AND prm.property_id = tp.id
      WHERE tp.id = ${propertyId}
      LIMIT 1
    `;

    if (mapping.rows.length === 0) {
      return NextResponse.json({ success: true, blockedDates: [] });
    }

    const tenantId = mapping.rows[0].tenant_id as string;
    const roomId = mapping.rows[0].room_id as string | null;

    // Recopilar días bloqueados desde 3 fuentes
    const result = await sql`
      WITH rango AS (
        SELECT ${from}::date AS f, ${to}::date AS t
      ),
      op AS (
        SELECT generate_series(r.check_in::date, (r.check_out::date - INTERVAL '1 day'), '1 day')::date AS d
        FROM reservations r, rango g
        WHERE ${roomId} IS NOT NULL
          AND r.tenant_id = ${tenantId}::uuid
          AND r.room_id = ${roomId}
          AND r.check_in  < g.t
          AND r.check_out > g.f
      ),
      direct AS (
        SELECT generate_series(dr.check_in_date::date, (dr.check_out_date::date - INTERVAL '1 day'), '1 day')::date AS d
        FROM direct_reservations dr, rango g
        WHERE dr.tenant_id = ${tenantId}::uuid
          AND dr.property_id = ${propertyId}::int
          AND dr.reservation_status = 'confirmed'
          AND dr.check_in_date  < g.t
          AND dr.check_out_date > g.f
      ),
      pa AS (
        SELECT pa.date::date AS d
        FROM property_availability pa, rango g
        WHERE pa.property_id = ${propertyId}::int
          AND pa.date >= g.f AND pa.date < g.t
          AND pa.available = FALSE
      ),
      union_all AS (
        SELECT d FROM op
        UNION
        SELECT d FROM direct
        UNION
        SELECT d FROM pa
      )
      SELECT d::text AS date
      FROM union_all
      GROUP BY d
      ORDER BY d;
    `;

    const blockedDates = result.rows.map((r) => r.date);
    return NextResponse.json({ success: true, blockedDates });
  } catch (error) {
    console.error('❌ [public/availability-calendar] Error:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}


