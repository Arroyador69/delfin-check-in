// =====================================================
// API ENDPOINT: CREAR PAYMENT INTENT PARA RESERVAS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@vercel/postgres';
import { generateReservationCode, calculateCommission } from '@/lib/direct-reservations-utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      property_id,
      guest_name,
      guest_email,
      guest_phone,
      guest_document_type,
      guest_document_number,
      guest_nationality,
      check_in_date,
      check_out_date,
      guests,
      special_requests
    } = data;

    console.log('💳 Creando Payment Intent para reserva directa:', {
      property_id,
      guest_email,
      check_in_date,
      check_out_date
    });

    // Validar datos requeridos
    if (!property_id || !guest_name || !guest_email || !check_in_date || !check_out_date) {
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
        { success: false, error: 'Propiedad no encontrada o inactiva' },
        { status: 404 }
      );
    }

    const property = propertyResult.rows[0];
    const tenantId = property.tenant_id;

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

    // Calcular precios
    const subtotal = (property.base_price * nights) + (property.cleaning_fee || 0);
    const commissionRate = property.commission_rate || 0.09;
    const stripeFeeRate = property.stripe_fee_rate || 0.014;
    
    const commission = calculateCommission(subtotal, commissionRate, stripeFeeRate);

    // Generar código de reserva único
    const reservationCode = generateReservationCode();

    // Crear reserva en BD (con estado pending)
    const reservationResult = await sql`
      INSERT INTO direct_reservations (
        tenant_id, property_id, reservation_code,
        guest_name, guest_email, guest_phone, guest_document_type,
        guest_document_number, guest_nationality,
        check_in_date, check_out_date, nights, guests,
        base_price, cleaning_fee, security_deposit,
        subtotal, delfin_commission_rate, delfin_commission_amount,
        stripe_fee_amount, property_owner_amount, total_amount,
        payment_status, reservation_status, special_requests
      ) VALUES (
        ${tenantId}, ${property_id}, ${reservationCode},
        ${guest_name}, ${guest_email}, ${guest_phone || null}, ${guest_document_type || null},
        ${guest_document_number || null}, ${guest_nationality || null},
        ${check_in_date}, ${check_out_date}, ${nights}, ${guests},
        ${property.base_price}, ${property.cleaning_fee || 0}, ${property.security_deposit || 0},
        ${subtotal}, ${commissionRate}, ${commission.delfin_commission_amount},
        ${commission.stripe_fee_amount}, ${commission.property_owner_amount}, ${commission.total_amount},
        'pending', 'confirmed', ${special_requests || null}
      )
      RETURNING id
    `;

    const reservationId = reservationResult.rows[0].id;

    // Crear Payment Intent en Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(commission.total_amount * 100), // Convertir a centavos
      currency: 'eur',
      metadata: {
        reservation_id: reservationId.toString(),
        tenant_id: tenantId,
        property_id: property_id.toString(),
        guest_email: guest_email,
        reservation_code: reservationCode,
        source: 'direct_reservation'
      },
      description: `Reserva ${reservationCode} - ${property.property_name}`,
      receipt_email: guest_email,
    });

    // Actualizar reserva con Payment Intent ID
    await sql`
      UPDATE direct_reservations 
      SET stripe_payment_intent_id = ${paymentIntent.id}
      WHERE id = ${reservationId}
    `;

    console.log('✅ Payment Intent creado:', {
      reservationId,
      paymentIntentId: paymentIntent.id,
      amount: commission.total_amount,
      reservationCode
    });

    return NextResponse.json({
      success: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      reservation_id: reservationId,
      reservation_code: reservationCode,
      amount: commission.total_amount,
      currency: 'eur',
      breakdown: {
        subtotal: subtotal,
        nights: nights,
        base_price: property.base_price,
        cleaning_fee: property.cleaning_fee || 0,
        delfin_commission: commission.delfin_commission_amount,
        stripe_fee: commission.stripe_fee_amount,
        property_owner_amount: commission.property_owner_amount,
        total: commission.total_amount
      }
    });

  } catch (error) {
    console.error('❌ Error creando Payment Intent:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
