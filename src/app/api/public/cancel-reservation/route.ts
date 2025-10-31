// =====================================================
// API PÚBLICA: CANCELAR RESERVA Y PROCESAR REEMBOLSO
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
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
      reservation_code,
      guest_name,
      check_in_date,
      check_out_date
    } = data;

    console.log('🚫 Solicitud de cancelación:', {
      reservation_code,
      guest_name,
      check_in_date,
      check_out_date
    });

    // Validar datos requeridos
    if (!reservation_code || !guest_name || !check_in_date || !check_out_date) {
      const response = NextResponse.json(
        { success: false, error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Buscar la reserva por código
    const reservationResult = await sql`
      SELECT 
        dr.*,
        tp.property_name
      FROM direct_reservations dr
      JOIN tenant_properties tp ON dr.property_id = tp.id
      WHERE dr.reservation_code = ${reservation_code}
        AND dr.reservation_status = 'confirmed'
    `;

    if (reservationResult.rows.length === 0) {
      const response = NextResponse.json(
        { success: false, error: 'Reserva no encontrada o ya cancelada' },
        { status: 404 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    const reservation = reservationResult.rows[0];

    // Validar que los datos coincidan
    const nameMatches = reservation.guest_name.toLowerCase().trim() === guest_name.toLowerCase().trim();
    const checkInMatches = reservation.check_in_date.toISOString().split('T')[0] === check_in_date;
    const checkOutMatches = reservation.check_out_date.toISOString().split('T')[0] === check_out_date;

    if (!nameMatches || !checkInMatches || !checkOutMatches) {
      const response = NextResponse.json(
        { success: false, error: 'Los datos proporcionados no coinciden con la reserva' },
        { status: 403 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Validar que la cancelación sea al menos 1 día antes del check-in
    const checkInDate = new Date(reservation.check_in_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilCheckIn < 1) {
      const response = NextResponse.json(
        { success: false, error: 'La cancelación debe realizarse al menos 1 día antes del check-in' },
        { status: 400 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Verificar que el pago fue exitoso
    if (reservation.payment_status !== 'paid' || !reservation.stripe_payment_intent_id) {
      const response = NextResponse.json(
        { success: false, error: 'No se puede procesar el reembolso: pago no encontrado' },
        { status: 400 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    console.log('✅ Datos validados correctamente. Procesando cancelación y reembolso...', {
      reservation_id: reservation.id,
      payment_intent_id: reservation.stripe_payment_intent_id,
      amount_to_refund: reservation.total_amount
    });

    // Obtener el Payment Intent de Stripe para confirmar detalles
    let paymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(reservation.stripe_payment_intent_id);
    } catch (error) {
      console.error('❌ Error obteniendo Payment Intent:', error);
      const response = NextResponse.json(
        { success: false, error: 'Error validando el pago con Stripe' },
        { status: 500 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Crear el reembolso
    let refund;
    try {
      // Si hay una charge_id, usarla. Si no, usar el payment_intent
      const chargeId = reservation.stripe_charge_id || paymentIntent.latest_charge;

      if (chargeId && typeof chargeId === 'string') {
        refund = await stripe.refunds.create({
          charge: chargeId,
          reason: 'requested_by_customer',
          metadata: {
            reservation_code: reservation.reservation_code,
            reservation_id: reservation.id.toString(),
            cancelled_by: 'customer',
            cancelled_at: new Date().toISOString()
          }
        });
      } else {
        // Fallback: crear refund usando el payment intent
        refund = await stripe.refunds.create({
          payment_intent: reservation.stripe_payment_intent_id,
          reason: 'requested_by_customer',
          metadata: {
            reservation_code: reservation.reservation_code,
            reservation_id: reservation.id.toString(),
            cancelled_by: 'customer',
            cancelled_at: new Date().toISOString()
          }
        });
      }

      console.log('✅ Reembolso creado:', {
        refund_id: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      });
    } catch (error: any) {
      console.error('❌ Error creando reembolso:', error);
      const response = NextResponse.json(
        { success: false, error: `Error procesando el reembolso: ${error.message}` },
        { status: 500 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Actualizar la reserva en la base de datos
    try {
      await sql`
        UPDATE direct_reservations 
        SET 
          reservation_status = 'cancelled',
          payment_status = 'refunded',
          cancelled_at = NOW(),
          updated_at = NOW()
        WHERE id = ${reservation.id}
      `;

      // Liberar la disponibilidad en property_availability
      await sql`
        UPDATE property_availability 
        SET 
          available = TRUE,
          blocked_reason = NULL
        WHERE property_id = ${reservation.property_id}
          AND date >= ${reservation.check_in_date}::date
          AND date < ${reservation.check_out_date}::date
          AND blocked_reason = 'direct_reservation'
      `;

      // Marcar o eliminar de reservations operacional
      try {
        await sql`
          UPDATE reservations
          SET 
            status = 'cancelled',
            updated_at = NOW()
          WHERE tenant_id = ${reservation.tenant_id}::uuid
            AND check_in = ${reservation.check_in_date}::timestamp
            AND check_out = ${reservation.check_out_date}::timestamp
            AND guest_email = ${reservation.guest_email}
        `;
      } catch (err) {
        console.error('⚠️ Error actualizando reservations operacional (continuo):', err);
      }

      console.log('✅ Reserva actualizada en base de datos');
    } catch (error) {
      console.error('❌ Error actualizando reserva en BD:', error);
      // No fallar la respuesta aunque falle la actualización
      // El reembolso ya se procesó
    }

    const response = NextResponse.json({
      success: true,
      message: 'Reserva cancelada y reembolso procesado exitosamente',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        currency: refund.currency
      },
      reservation: {
        code: reservation.reservation_code,
        property_name: reservation.property_name,
        cancelled_at: new Date().toISOString()
      }
    });

    Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error: any) {
    console.error('❌ Error en cancelación:', error);
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

