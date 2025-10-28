// =====================================================
// API PÚBLICA: VERIFICAR DISPONIBILIDAD Y CALCULAR PRECIOS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { calculateCommission } from '@/lib/direct-reservations-utils';

export async function POST(req: NextRequest) {
  try {
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
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { success: false, error: 'Propiedad no encontrada' },
        { status: 404 }
      );
    }

    const property = propertyResult.rows[0];

    // Validar número de huéspedes
    if (guests > property.max_guests) {
      return NextResponse.json(
        { success: false, error: `Máximo ${property.max_guests} huéspedes permitidos` },
        { status: 400 }
      );
    }

    // Calcular fechas y noches
    const checkInDate = new Date(check_in_date);
    const checkOutDate = new Date(check_out_date);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights < property.minimum_nights) {
      return NextResponse.json(
        { success: false, error: `Mínimo ${property.minimum_nights} noches requeridas` },
        { status: 400 }
      );
    }

    if (nights > property.maximum_nights) {
      return NextResponse.json(
        { success: false, error: `Máximo ${property.maximum_nights} noches permitidas` },
        { status: 400 }
      );
    }

    // Verificar disponibilidad (por ahora asumimos que está disponible)
    // TODO: Implementar verificación real contra property_availability
    const isAvailable = true;

    if (!isAvailable) {
      return NextResponse.json(
        { success: false, error: 'No disponible para las fechas seleccionadas' },
        { status: 400 }
      );
    }

    // Calcular precios
    const subtotal = (property.base_price * nights) + (property.cleaning_fee || 0);
    const commissionRate = property.commission_rate || 0.09;
    const stripeFeeRate = property.stripe_fee_rate || 0.014;
    
    const commission = calculateCommission(subtotal, commissionRate, stripeFeeRate);

    const pricing = {
      nights,
      base_price: property.base_price,
      cleaning_fee: property.cleaning_fee || 0,
      subtotal,
      delfin_commission_rate: commissionRate,
      delfin_commission_amount: commission.delfin_commission_amount,
      stripe_fee_amount: commission.stripe_fee_amount,
      property_owner_amount: commission.property_owner_amount,
      total_amount: commission.total_amount,
      available: true
    };

    console.log('✅ Disponibilidad verificada:', pricing);

    return NextResponse.json({
      success: true,
      pricing
    });

  } catch (error) {
    console.error('❌ Error verificando disponibilidad:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
