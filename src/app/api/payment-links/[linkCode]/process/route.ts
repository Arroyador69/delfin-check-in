// =====================================================
// API: PROCESAR PAGO DESDE ENLACE DE PAGO
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@vercel/postgres';
import { generateReservationCode, calculateCommission } from '@/lib/direct-reservations-utils';
import { getDirectReservationCommissionRate } from '@/lib/plan-pricing';

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.error('❌ [STRIPE] STRIPE_SECRET_KEY no configurada');
}

const stripe = new Stripe(stripeKey!, {
  apiVersion: '2025-08-27.basil',
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

export async function POST(
  req: NextRequest,
  { params }: { params: { linkCode: string } }
) {
  try {
    const origin = req.headers.get('origin');
    const { linkCode } = params;
    const data = await req.json();
    const {
      guest_name,
      guest_email,
      guest_phone,
      guest_document_type,
      guest_document_number,
      guest_nationality,
      guests
    } = data;

    console.log('💳 Procesando pago desde enlace:', linkCode);

    // Validar datos requeridos
    if (!guest_name || !guest_email || !guest_phone) {
      const response = NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Obtener información del enlace y plan del tenant (comisión: Pro 5%, resto 9%)
    const linkResult = await sql`
      SELECT 
        pl.*,
        tcs.commission_rate,
        tcs.stripe_fee_rate,
        t.plan_type as tenant_plan_type
      FROM payment_links pl
      LEFT JOIN tenant_commission_settings tcs ON pl.tenant_id = tcs.tenant_id
      LEFT JOIN tenants t ON pl.tenant_id = t.id
      WHERE pl.link_code = ${linkCode} AND pl.is_active = true
    `;

    if (linkResult.rows.length === 0) {
      const response = NextResponse.json(
        { success: false, error: 'Enlace no encontrado o inactivo' },
        { status: 404 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    const link = linkResult.rows[0];

    // Verificar fecha de expiración
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      const response = NextResponse.json(
        { success: false, error: 'Este enlace de pago ha expirado' },
        { status: 403 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Verificar límite de usos
    if (link.max_uses && link.usage_count >= link.max_uses) {
      const response = NextResponse.json(
        { success: false, error: 'Este enlace ha alcanzado su límite de usos' },
        { status: 403 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Verificar si el pago ya fue completado (enlace de un solo uso)
    if (link.payment_completed) {
      const response = NextResponse.json(
        { success: false, error: 'Este enlace de pago ya ha sido utilizado' },
        { status: 403 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Calcular noches
    const checkInDate = new Date(link.check_in_date);
    const checkOutDate = new Date(link.check_out_date);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    // Obtener información de la propiedad o habitación
    let propertyId: number | null = null;
    let propertyName: string = '';
    
    if (link.resource_type === 'property') {
      propertyId = parseInt(link.resource_id);
      const propertyResult = await sql`
        SELECT property_name FROM tenant_properties
        WHERE id = ${propertyId} AND tenant_id = ${link.tenant_id}::uuid
      `;
      if (propertyResult.rows.length > 0) {
        propertyName = propertyResult.rows[0].property_name;
      }
    } else if (link.resource_type === 'room') {
      // Buscar la propiedad asociada a este room
      const mappingResult = await sql`
        SELECT property_id, tp.property_name
        FROM property_room_map prm
        JOIN tenant_properties tp ON tp.id = prm.property_id
        WHERE prm.room_id = ${link.resource_id}::uuid
          AND prm.tenant_id = ${link.tenant_id}::uuid
        LIMIT 1
      `;
      if (mappingResult.rows.length > 0) {
        propertyId = mappingResult.rows[0].property_id;
        propertyName = mappingResult.rows[0].property_name;
      }
    }

    if (!propertyId) {
      const response = NextResponse.json(
        { success: false, error: 'No se pudo encontrar la propiedad asociada' },
        { status: 404 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // VALIDAR DISPONIBILIDAD antes de permitir el pago
    try {
      const overlap = await sql`
        WITH map AS (
          SELECT room_id
          FROM property_room_map
          WHERE tenant_id = ${link.tenant_id}::uuid AND property_id = ${propertyId}::int
          LIMIT 1
        ),
        solapadas AS (
          SELECT 1
          FROM reservations r, map m
          WHERE r.tenant_id = ${link.tenant_id}::uuid
            AND r.room_id = m.room_id
            AND r.check_in  < ${link.check_out_date}::date
            AND r.check_out > ${link.check_in_date}::date
          UNION ALL
          SELECT 1
          FROM direct_reservations dr
          WHERE dr.tenant_id = ${link.tenant_id}::uuid
            AND dr.property_id = ${propertyId}::int
            AND dr.reservation_status = 'confirmed'
            AND dr.check_in_date  < ${link.check_out_date}::date
            AND dr.check_out_date > ${link.check_in_date}::date
          UNION ALL
          SELECT 1
          FROM property_availability pa
          WHERE pa.property_id = ${propertyId}::int
            AND pa.date >= ${link.check_in_date}::date
            AND pa.date <  ${link.check_out_date}::date
            AND pa.available = FALSE
        )
        SELECT COUNT(*)::int AS cnt FROM solapadas;
      `;

      const cnt = overlap.rows[0]?.cnt ?? 0;
      if (cnt > 0) {
        const response = NextResponse.json(
          { success: false, error: 'Las fechas seleccionadas ya no están disponibles. Por favor, contacta con el propietario.' },
          { status: 409 }
        );
        Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }
    } catch (availErr) {
      console.error('⚠️ [PAYMENT LINK] Error validando disponibilidad:', availErr);
      const response = NextResponse.json(
        { success: false, error: 'Error validando disponibilidad. Por favor, intenta más tarde.' },
        { status: 500 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Calcular comisiones (Pro 5%, resto 9%)
    const subtotal = parseFloat(String(link.total_price));
    const commissionRate = link.commission_rate != null
      ? parseFloat(String(link.commission_rate))
      : getDirectReservationCommissionRate(link.tenant_plan_type);
    const stripeFeeRate = parseFloat(String(link.stripe_fee_rate || 0.014));
    const commission = calculateCommission(subtotal, commissionRate, stripeFeeRate);

    // Generar código de reserva único
    const reservationCode = generateReservationCode();

    // Crear Payment Intent en Stripe
    const paymentAmount = Math.round(commission.total_amount * 100); // Convertir a centavos
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: paymentAmount,
      currency: 'eur',
      metadata: {
        tenant_id: link.tenant_id,
        property_id: propertyId.toString(),
        payment_link_code: linkCode,
        resource_type: link.resource_type,
        resource_id: link.resource_id,
        guest_name: guest_name,
        guest_email: guest_email,
        guest_phone: guest_phone || '',
        guest_document_type: guest_document_type || '',
        guest_document_number: guest_document_number || '',
        guest_nationality: guest_nationality || '',
        check_in_date: link.check_in_date,
        check_out_date: link.check_out_date,
        nights: nights.toString(),
        guests: (guests || link.expected_guests).toString(),
        base_price: (link.base_price_per_night || 0).toString(),
        cleaning_fee: (link.cleaning_fee || 0).toString(),
        security_deposit: '0',
        subtotal: subtotal.toString(),
        delfin_commission_rate: commissionRate.toString(),
        delfin_commission_amount: commission.delfin_commission_amount.toString(),
        stripe_fee_amount: commission.stripe_fee_amount.toString(),
        property_owner_amount: commission.property_owner_amount.toString(),
        total_amount: commission.total_amount.toString(),
        reservation_code: reservationCode,
        special_requests: '',
        source: 'payment_link'
      },
      description: `Reserva ${reservationCode} desde enlace de pago - ${propertyName}`,
      receipt_email: guest_email,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    if (!paymentIntent.client_secret) {
      throw new Error('Payment Intent creado sin client_secret');
    }

    // Incrementar contador de usos del enlace
    await sql`
      UPDATE payment_links
      SET usage_count = usage_count + 1, updated_at = NOW()
      WHERE link_code = ${linkCode}
    `;

    const response = NextResponse.json({
      success: true,
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
      reservation_code: reservationCode,
      amount: commission.total_amount,
      currency: 'eur',
      breakdown: {
        subtotal: subtotal,
        nights: nights,
        base_price: link.base_price_per_night || 0,
        cleaning_fee: link.cleaning_fee || 0,
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

  } catch (error: any) {
    console.error('❌ Error procesando pago desde enlace:', error);
    const origin = req.headers.get('origin');
    const response = NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
    Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }
}

