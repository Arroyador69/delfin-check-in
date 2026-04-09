// =====================================================
// API ENDPOINT: CREAR PAYMENT INTENT PARA RESERVAS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { generateReservationCode, calculateCommission } from '@/lib/direct-reservations-utils';
import { getDirectReservationCommissionRate } from '@/lib/plan-pricing';
import { getStripeServer } from '@/lib/stripe-server';

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

    // Obtener información de la propiedad y plan del tenant (comisión: Pro 5%, resto 9%)
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
    const includedGuests = Math.max(1, parseInt(String(property.included_guests ?? Math.min(2, property.max_guests ?? 2)), 10) || 1);
    const extraGuestFee = parseFloat(String(property.extra_guest_fee || 0));
    const extraGuests = Math.max(0, Number(guests || 1) - includedGuests);
    const extraGuestsAmount = extraGuests > 0 ? (extraGuestFee * extraGuests * nights) : 0;
    const subtotal = (basePrice * nights) + cleaningFee + extraGuestsAmount;
    const commissionRate = property.commission_rate != null
      ? parseFloat(String(property.commission_rate))
      : getDirectReservationCommissionRate(property.tenant_plan_type);
    const stripeFeeRate = parseFloat(String(property.stripe_fee_rate || 0.014));
    
    const commission = calculateCommission(subtotal, commissionRate, stripeFeeRate);

    // Generar código de reserva único
    const reservationCode = generateReservationCode();

    // Validar disponibilidad ANTES de crear el Payment Intent (evita overbooking)
    try {
      const overlap = await sql`
        WITH map AS (
          SELECT room_id
          FROM property_room_map
          WHERE tenant_id = ${tenantId}::uuid AND property_id = ${property_id}::int
          LIMIT 1
        ),
        solapadas AS (
          SELECT 1
          FROM reservations r, map m
          WHERE r.tenant_id = ${tenantId}::uuid
            AND r.room_id = m.room_id
            AND r.check_in  < ${check_out_date}::date
            AND r.check_out > ${check_in_date}::date
          UNION ALL
          SELECT 1
          FROM direct_reservations dr
          WHERE dr.tenant_id = ${tenantId}::uuid
            AND dr.property_id = ${property_id}::int
            AND dr.reservation_status = 'confirmed'
            AND dr.check_in_date  < ${check_out_date}::date
            AND dr.check_out_date > ${check_in_date}::date
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

      const cnt = overlap.rows[0]?.cnt ?? 0;
      if (cnt > 0) {
        const response = NextResponse.json(
          { success: false, error: 'Fechas no disponibles. Por favor, elige otro rango.' },
          { status: 409 }
        );
        Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }
    } catch (availErr) {
      console.error('⚠️ [CREATE PAYMENT] Error validando disponibilidad (continuo):', availErr);
      // Continuamos, pero en el webhook volveremos a bloquear availability e insertar en reservations idempotentemente
    }

    // NO crear reserva en BD todavía - se creará después de confirmar el pago
    // Esto evita que queden reservas huérfanas si el pago falla
    console.log('💳 [CREATE PAYMENT] Preparando Payment Intent sin crear reserva aún:', {
      reservationCode,
      amount: commission.total_amount,
      nights
    });

    // Crear Payment Intent en Stripe
    const paymentAmount = Math.round(commission.total_amount * 100); // Convertir a centavos
    console.log('💳 [CREATE PAYMENT] Creando Payment Intent con:', {
      amount: paymentAmount,
      amountInEuros: commission.total_amount,
      currency: 'eur',
      reservationCode,
      guestEmail: guest_email,
      nights,
      guests
    });

    // Crear Payment Intent en Stripe (modo test)
    // IMPORTANTE: Guardamos toda la info en metadata para crear la reserva después del pago
    // Calcular días hasta check-in para determinar si retener el pago
    const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const shouldHoldPayment = daysUntilCheckIn > 0; // Retener si el check-in es en el futuro

    const paymentIntent = await getStripeServer().paymentIntents.create({
      amount: paymentAmount,
      currency: 'eur',
      // Retener pago hasta check-in si es en el futuro
      capture_method: shouldHoldPayment ? 'manual' : 'automatic',
      metadata: {
        // Guardar todos los datos necesarios en metadata para crear reserva después
        tenant_id: tenantId,
        property_id: property_id.toString(),
        guest_name: guest_name,
        guest_email: guest_email,
        guest_phone: guest_phone || '',
        guest_document_type: guest_document_type || '',
        guest_document_number: guest_document_number || '',
        guest_nationality: guest_nationality || '',
        check_in_date: check_in_date,
        check_out_date: check_out_date,
        nights: nights.toString(),
        guests: guests.toString(),
        base_price: basePrice.toString(),
        cleaning_fee: cleaningFee.toString(),
        included_guests: includedGuests.toString(),
        extra_guest_fee: extraGuestFee.toString(),
        extra_guests: extraGuests.toString(),
        extra_guests_amount: extraGuestsAmount.toString(),
        security_deposit: parseFloat(String(property.security_deposit || 0)).toString(),
        subtotal: subtotal.toString(),
        delfin_commission_rate: commissionRate.toString(),
        delfin_commission_amount: commission.delfin_commission_amount.toString(),
        stripe_fee_amount: commission.stripe_fee_amount.toString(),
        property_owner_amount: commission.property_owner_amount.toString(),
        total_amount: commission.total_amount.toString(),
        reservation_code: reservationCode,
        special_requests: special_requests || '',
        source: 'direct_reservation',
        payment_hold: shouldHoldPayment ? 'true' : 'false'
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

    console.log('✅ [CREATE PAYMENT] Payment Intent creado (reserva se creará después del pago):', {
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
      reservationCode
    });

    const response = NextResponse.json({
      success: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      // NO enviar reservation_id porque aún no existe
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
