// =====================================================
// API PÚBLICA: CALENDARIO DE DISPONIBILIDAD (DÍAS BLOQUEADOS)
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

function corsHeaders(origin: string | null) {
  const allowedOrigins = [
    'https://book.delfincheckin.com',
    'https://admin.delfincheckin.com',
    'http://localhost:3000',
    'http://localhost:3001'
  ];
  const originHeader = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': originHeader,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  } as Record<string, string>;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return NextResponse.json({}, { headers: corsHeaders(origin) });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const origin = req.headers.get('origin');
    const propertyId = parseInt(searchParams.get('property_id') || '0', 10);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    // Validación de fechas (evitar 500 por formatos inválidos)
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;
    if (!isoDate.test(from) || !isoDate.test(to)) {
      const res = NextResponse.json(
        { success: false, error: 'Parámetros from/to deben tener formato YYYY-MM-DD' },
        { status: 400 }
      );
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }
    const fromDate = new Date(from + 'T00:00:00Z');
    const toDate = new Date(to + 'T00:00:00Z');
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      const res = NextResponse.json(
        { success: false, error: 'Fechas inválidas' },
        { status: 400 }
      );
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }
    if (fromDate >= toDate) {
      const res = NextResponse.json(
        { success: false, error: 'from debe ser anterior a to' },
        { status: 400 }
      );
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    if (!propertyId || !from || !to) {
      const res = NextResponse.json(
        { success: false, error: 'Parámetros requeridos: property_id, from, to' },
        { status: 400 }
      );
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    // Obtener tenant_id y room_id del slot
    console.log('[availability-calendar] params', { propertyId, from, to });
    const mapping = await sql`
      SELECT tp.tenant_id, prm.room_id
      FROM tenant_properties tp
      LEFT JOIN property_room_map prm
        ON prm.tenant_id = tp.tenant_id AND prm.property_id = tp.id
      WHERE tp.id = ${propertyId}
      LIMIT 1
    `;

    if (mapping.rows.length === 0) {
      console.warn('[availability-calendar] mapping not found for property', propertyId);
      const res = NextResponse.json({ success: true, blockedDates: [] });
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    const tenantId = mapping.rows[0].tenant_id as string;
    const roomId = mapping.rows[0].room_id ? String(mapping.rows[0].room_id) : null;
    console.log('[availability-calendar] mapping', { tenantId, roomId });

    // Si no hay roomId mapeado, no podemos calcular ocupación por reservations
    if (!roomId) {
      console.warn('[availability-calendar] roomId is null for property', propertyId);
      const res = NextResponse.json({ success: true, blockedDates: [] });
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }

    // Recopilar días bloqueados desde 4 fuentes:
    // - reservations (operacional)
    // - direct_reservations (reservas directas confirmadas)
    // - property_availability (bloqueos manuales)
    // - calendar_events (bloqueos iCal sincronizados)
    const result = await sql`
      WITH rango AS (
        SELECT ${from}::date AS f, ${to}::date AS t
      ),
      op AS (
        SELECT generate_series(r.check_in::date, (r.check_out::date - INTERVAL '1 day'), '1 day')::date AS d
        FROM reservations r, rango g
        WHERE r.tenant_id::uuid = ${tenantId}::uuid
          AND r.room_id::text = ${roomId}::text
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
      ical AS (
        SELECT generate_series(ce.start_date::date, (ce.end_date::date - INTERVAL '1 day'), '1 day')::date AS d
        FROM calendar_events ce, rango g
        WHERE ce.tenant_id = ${tenantId}::uuid
          AND ce.property_id = ${propertyId}::int
          AND ce.is_blocked = TRUE
          AND ce.start_date < g.t
          AND ce.end_date > g.f
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
        SELECT d FROM ical
        UNION
        SELECT d FROM pa
      )
      SELECT d::text AS date
      FROM union_all
      GROUP BY d
      ORDER BY d;
    `;

    const blockedDates = result.rows.map((r) => r.date);
    console.log('[availability-calendar] blockedDates count', blockedDates.length);
    const res = NextResponse.json({ success: true, blockedDates });
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (error) {
    console.error('❌ [public/availability-calendar] Error:', error);
    const origin = req.headers.get('origin');
    const res = NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
    Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}


