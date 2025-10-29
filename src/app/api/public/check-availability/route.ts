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

    // Obtener información de la propiedad
    const propertyResult = await sql`
      SELECT 
        tp.*, tcs.commission_rate, tcs.stripe_fee_rate
      FROM tenant_properties tp
      LEFT JOIN tenant_commission_settings tcs ON tp.tenant_id = tcs.tenant_id
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

    // Verificar disponibilidad (por ahora asumimos que está disponible)
    // TODO: Implementar verificación real contra property_availability
    const isAvailable = true;

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
    const subtotal = (basePrice * nights) + cleaningFee;
    const commissionRate = parseFloat(String(property.commission_rate || 0.09));
    const stripeFeeRate = parseFloat(String(property.stripe_fee_rate || 0.014));
    
    const commission = calculateCommission(subtotal, commissionRate, stripeFeeRate);

    const pricing = {
      nights,
      base_price: basePrice.toFixed(2),
      cleaning_fee: cleaningFee.toFixed(2),
      subtotal: subtotal.toFixed(2),
      delfin_commission_rate: commissionRate,
      delfin_commission_amount: commission.delfin_commission_amount.toFixed(2),
      stripe_fee_amount: commission.stripe_fee_amount.toFixed(2),
      property_owner_amount: commission.property_owner_amount.toFixed(2),
      total_amount: commission.total_amount.toFixed(2),
      available: true
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
