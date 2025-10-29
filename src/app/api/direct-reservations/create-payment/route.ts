// =====================================================
// API ENDPOINT: CREAR PAYMENT INTENT PARA RESERVAS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@vercel/postgres';
import { generateReservationCode, calculateCommission } from '@/lib/direct-reservations-utils';

// Inicializar Stripe con logging para diagnóstico
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('❌ [STRIPE] STRIPE_SECRET_KEY no configurada');
} else {
  console.log('✅ [STRIPE] Clave secreta configurada:', {
    prefix: stripeKey.substring(0, 7), // Mostrar solo el prefijo (sk_test_ o sk_live_)
    length: stripeKey.length,
    isTest: stripeKey.startsWith('sk_test_'),
    isLive: stripeKey.startsWith('sk_live_')
  });
}

const stripe = new Stripe(stripeKey!, {
  apiVersion: '2024-06-20',
});

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
    if (!property_id || !guest_name || !guest_email || !guest_phone || !check_in_date || !check_out_date) {
      const response = NextResponse.json(
        { success: false, error: 'Faltan datos requeridos. El teléfono es obligatorio para contactar con usted sobre su reserva.' },
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
        { success: false, error: 'Propiedad no encontrada o inactiva' },
        { status: 404 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    const property = propertyResult.rows[0];
    const tenantId = property.tenant_id;

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

    // Calcular precios (asegurar que sean números)
    const basePrice = parseFloat(String(property.base_price || 0));
    const cleaningFee = parseFloat(String(property.cleaning_fee || 0));
    const subtotal = (basePrice * nights) + cleaningFee;
    const commissionRate = parseFloat(String(property.commission_rate || 0.09));
    const stripeFeeRate = parseFloat(String(property.stripe_fee_rate || 0.014));
    
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
        ${basePrice}, ${cleaningFee}, ${parseFloat(String(property.security_deposit || 0))},
        ${subtotal}, ${commissionRate}, ${commission.delfin_commission_amount},
        ${commission.stripe_fee_amount}, ${commission.property_owner_amount}, ${commission.total_amount},
        'pending', 'confirmed', ${special_requests || null}
      )
      RETURNING id
    `;

    const reservationId = reservationResult.rows[0].id;

    // Crear Payment Intent en Stripe
    const paymentAmount = Math.round(commission.total_amount * 100); // Convertir a centavos
    console.log('💳 [CREATE PAYMENT] Creando Payment Intent con:', {
      amount: paymentAmount,
      amountInEuros: commission.total_amount,
      currency: 'eur',
      reservationId,
      guestEmail: guest_email
    });

    // Crear Payment Intent en Stripe (modo test)
    // IMPORTANTE: No usar confirmation_method junto con automatic_payment_methods
    const paymentIntent = await stripe.paymentIntents.create({
      amount: paymentAmount,
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
      // Usar automatic_payment_methods (forma moderna recomendada)
      automatic_payment_methods: {
        enabled: true,
      },
    });

    console.log('✅ [CREATE PAYMENT] Payment Intent creado:', {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret ? '✅ Presente' : '❌ FALTANTE',
      clientSecretLength: paymentIntent.client_secret?.length || 0,
      clientSecretPrefix: paymentIntent.client_secret?.substring(0, 20) || 'N/A',
      amount: paymentIntent.amount,
      amountInEuros: (paymentIntent.amount / 100).toFixed(2),
      currency: paymentIntent.currency,
      livemode: paymentIntent.livemode,
      confirmationMethod: paymentIntent.confirmation_method
    });

    if (!paymentIntent.client_secret) {
      console.error('❌ [CREATE PAYMENT] ERROR CRÍTICO: Payment Intent creado sin client_secret!');
      console.error('❌ [CREATE PAYMENT] Payment Intent completo:', JSON.stringify(paymentIntent, null, 2));
      throw new Error('Payment Intent creado sin client_secret. Verifique la configuración de Stripe.');
    }

    // Actualizar reserva con Payment Intent ID
    await sql`
      UPDATE direct_reservations 
      SET stripe_payment_intent_id = ${paymentIntent.id}
      WHERE id = ${reservationId}
    `;

    console.log('✅ [CREATE PAYMENT] Payment Intent creado y guardado:', {
      reservationId,
      paymentIntentId: paymentIntent.id,
      amount: commission.total_amount,
      reservationCode
    });

    // Verificar una vez más antes de enviar
    if (!paymentIntent.client_secret) {
      console.error('❌ [CREATE PAYMENT] ERROR: client_secret no disponible antes de enviar respuesta');
      throw new Error('client_secret no disponible');
    }

    console.log('✅ [CREATE PAYMENT] Enviando respuesta al frontend:', {
      hasClientSecret: !!paymentIntent.client_secret,
      clientSecretLength: paymentIntent.client_secret.length,
      paymentIntentId: paymentIntent.id,
      reservationId
    });

    const response = NextResponse.json({
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

    Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('❌ Error creando Payment Intent:', error);
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
