// =====================================================
// API PÚBLICA: VERIFICAR DISPONIBILIDAD Y CALCULAR PRECIOS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { calculateCommission } from '@/lib/direct-reservations-utils';

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin');
  return NextResponse.json({}, { headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin');
    // Hardening esquema: soportar pricing por persona extra
    try {
      await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS included_guests INT DEFAULT 2`;
      await sql`ALTER TABLE tenant_properties ADD COLUMN IF NOT EXISTS extra_guest_fee DECIMAL(10,2) DEFAULT 0`;
    } catch (_) {}
    const data = await req.json();
    const {
      property_id,
      check_in_date,
      check_out_date,
      guests
    } = data;

    console.log('🔍 Verificando disponibilidad:', {
      property_id,
      check_in_date,
      check_out_date,
      guests
    });

    // Validar datos requeridos
    if (!property_id || !check_in_date || !check_out_date || !guests) {
      const response = NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Obtener información de la propiedad y plan (comisión: Pro 5%, resto 9%)
    const propertyResult = await sql`
      SELECT 
        tp.*, tcs.commission_rate, tcs.stripe_fee_rate, t.plan_type as tenant_plan_type
      FROM tenant_properties tp
      LEFT JOIN tenant_commission_settings tcs ON tp.tenant_id = tcs.tenant_id
      LEFT JOIN tenants t ON tp.tenant_id = t.id
      WHERE tp.id = ${property_id} AND tp.is_active = true
    `;

    if (propertyResult.rows.length === 0) {
      const response = NextResponse.json(
        { success: false, error: 'Propiedad no encontrada' },
        { status: 404 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    const property = propertyResult.rows[0];

    // Validar número de huéspedes
    if (guests > property.max_guests) {
      const response = NextResponse.json(
        { success: false, error: `Máximo ${property.max_guests} huéspedes permitidos` },
        { status: 400 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Calcular fechas y noches
    const checkInDate = new Date(check_in_date);
    const checkOutDate = new Date(check_out_date);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights < property.minimum_nights) {
      const response = NextResponse.json(
        { success: false, error: `Mínimo ${property.minimum_nights} noches requeridas` },
        { status: 400 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    if (nights > property.maximum_nights) {
      const response = NextResponse.json(
        { success: false, error: `Máximo ${property.maximum_nights} noches permitidas` },
        { status: 400 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Verificar disponibilidad REAL contra:
    // - reservations (operacional) por room_id mapeado
    // - direct_reservations confirmadas por property_id
    // - property_availability con available = FALSE
    // - calendar_events (bloqueos iCal sincronizados)
    // Primero resolvemos el room_id del slot
    const overlap = await sql`
      WITH map AS (
        SELECT room_id
        FROM property_room_map
        WHERE tenant_id = ${property.tenant_id}::uuid AND property_id = ${property_id}::int
        LIMIT 1
      ),
      solapadas AS (
        SELECT 1
        FROM reservations r, map m
        WHERE r.tenant_id = ${property.tenant_id}::uuid
          AND r.room_id = m.room_id
          AND r.check_in  < ${check_out_date}::date
          AND r.check_out > ${check_in_date}::date
        UNION ALL
        SELECT 1
        FROM direct_reservations dr
        WHERE dr.tenant_id = ${property.tenant_id}::uuid
          AND dr.property_id = ${property_id}::int
          AND dr.reservation_status = 'confirmed'
          AND dr.check_in_date  < ${check_out_date}::date
          AND dr.check_out_date > ${check_in_date}::date
        UNION ALL
        SELECT 1
        FROM calendar_events ce
        WHERE ce.tenant_id = ${property.tenant_id}::uuid
          AND ce.property_id = ${property_id}::int
          AND ce.is_blocked = TRUE
          AND ce.start_date < ${check_out_date}::date
          AND ce.end_date > ${check_in_date}::date
        UNION ALL
        SELECT 1
        FROM property_availability pa
        WHERE pa.property_id = ${property_id}::int
          AND pa.date >= ${check_in_date}::date
          AND pa.date <  ${check_out_date}::date
          AND pa.available = FALSE
      )
      SELECT COUNT(*)::int AS cnt FROM solapadas;
    `;

    const isAvailable = (overlap.rows[0]?.cnt ?? 0) === 0;

    if (!isAvailable) {
      const response = NextResponse.json(
        { success: false, error: 'No disponible para las fechas seleccionadas' },
        { status: 400 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Calcular precios (asegurar que base_price y cleaning_fee sean números)
    const basePrice = parseFloat(String(property.base_price || 0));
    const cleaningFee = parseFloat(String(property.cleaning_fee || 0));
    const includedGuests = Math.max(1, parseInt(String(property.included_guests ?? Math.min(2, property.max_guests ?? 2)), 10) || 1);
    const extraGuestFee = parseFloat(String(property.extra_guest_fee || 0));
    const extraGuests = Math.max(0, Number(guests) - includedGuests);
    const extraGuestsAmount = extraGuests > 0 ? (extraGuestFee * extraGuests * nights) : 0;
    const subtotal = (basePrice * nights) + cleaningFee + extraGuestsAmount;
    const { getDirectReservationCommissionRate } = await import('@/lib/plan-pricing');
    const commissionRate = property.commission_rate != null
      ? parseFloat(String(property.commission_rate))
      : getDirectReservationCommissionRate(property.tenant_plan_type);
    const stripeFeeRate = parseFloat(String(property.stripe_fee_rate || 0.014));
    
    const commission = calculateCommission(subtotal, commissionRate, stripeFeeRate);

    const pricing = {
      nights,
      base_price: basePrice.toFixed(2),
      cleaning_fee: cleaningFee.toFixed(2),
      included_guests: includedGuests,
      extra_guest_fee: extraGuestFee.toFixed(2),
      extra_guests: extraGuests,
      extra_guests_amount: extraGuestsAmount.toFixed(2),
      subtotal: subtotal.toFixed(2),
      delfin_commission_rate: commissionRate,
      delfin_commission_amount: commission.delfin_commission_amount.toFixed(2),
      stripe_fee_amount: commission.stripe_fee_amount.toFixed(2),
      property_owner_amount: commission.property_owner_amount.toFixed(2),
      total_amount: commission.total_amount.toFixed(2),
      available: isAvailable
    };

    console.log('✅ Disponibilidad verificada:', pricing);

    const response = NextResponse.json({
      success: true,
      pricing
    });
    
    Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;

  } catch (error) {
    console.error('❌ Error verificando disponibilidad:', error);
    const origin = req.headers.get('origin');
    const response = NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
    Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
}
