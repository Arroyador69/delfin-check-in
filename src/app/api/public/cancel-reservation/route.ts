// =====================================================
// API PÚBLICA: CANCELAR RESERVA Y PROCESAR REEMBOLSO
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
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

    // Verificar que existe Payment Intent
    if (!reservation.stripe_payment_intent_id) {
      const response = NextResponse.json(
        { success: false, error: 'No se puede procesar la cancelación: pago no encontrado' },
        { status: 400 }
      );
      Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    console.log('✅ Datos validados correctamente. Procesando cancelación...', {
      reservation_id: reservation.id,
      payment_intent_id: reservation.stripe_payment_intent_id,
      payment_status: reservation.payment_status
    });

    // Obtener el Payment Intent de Stripe para verificar estado
    let paymentIntent;
    try {
      paymentIntent = await getStripeServer().paymentIntents.retrieve(reservation.stripe_payment_intent_id);
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

    // Determinar si el pago está retenido (no capturado) o ya fue capturado
    const isPaymentHeld = paymentIntent.status === 'requires_capture';
    let refund = null;
    let paymentAction = '';

    try {
      if (isPaymentHeld) {
        // Pago retenido: simplemente cancelarlo (no se cobró nada)
        await getStripeServer().paymentIntents.cancel(reservation.stripe_payment_intent_id, {
          cancellation_reason: 'requested_by_customer',
        });
        paymentAction = 'cancelled';
        console.log('✅ Payment Intent cancelado (pago no capturado):', reservation.stripe_payment_intent_id);
      } else if (paymentIntent.status === 'succeeded') {
        // Pago ya capturado: hacer reembolso según política
        const chargeId = reservation.stripe_charge_id || paymentIntent.latest_charge;
        
        // Calcular monto de reembolso según política
        // Política: 50% retenido si cancela menos de 7 días antes
        let refundAmount = reservation.total_amount * 100; // En centavos
        if (daysUntilCheckIn < 7) {
          refundAmount = Math.round(refundAmount * 0.5); // 50% retenido
        }

        if (chargeId && typeof chargeId === 'string') {
          refund = await getStripeServer().refunds.create({
            charge: chargeId,
            amount: refundAmount,
            reason: 'requested_by_customer',
            metadata: {
              reservation_code: reservation.reservation_code,
              reservation_id: reservation.id.toString(),
              cancelled_by: 'customer',
              cancelled_at: new Date().toISOString(),
              refund_policy: daysUntilCheckIn < 7 ? '50_percent_retained' : 'full_refund'
            }
          });
        } else {
          // Fallback: crear refund usando el payment intent
          refund = await getStripeServer().refunds.create({
            payment_intent: reservation.stripe_payment_intent_id,
            amount: refundAmount,
            reason: 'requested_by_customer',
            metadata: {
              reservation_code: reservation.reservation_code,
              reservation_id: reservation.id.toString(),
              cancelled_by: 'customer',
              cancelled_at: new Date().toISOString(),
              refund_policy: daysUntilCheckIn < 7 ? '50_percent_retained' : 'full_refund'
            }
          });
        }

        paymentAction = 'refunded';
        console.log('✅ Reembolso creado:', {
          refund_id: refund.id,
          amount: refund.amount / 100,
          status: refund.status,
          policy: daysUntilCheckIn < 7 ? '50% retenido' : '100% reembolsado'
        });

        // Registrar gasto en tenant_costs
        await sql`
          INSERT INTO tenant_costs (
            tenant_id, cost_type, amount, currency, description,
            stripe_transaction_id, reservation_id
          ) VALUES (
            ${reservation.tenant_id}::uuid,
            'refund',
            ${refund.amount / 100},
            'EUR',
            ${`Reembolso por cancelación - Reserva ${reservation.reservation_code} - ${daysUntilCheckIn < 7 ? '50% retenido' : '100% reembolsado'}`},
            ${refund.id},
            ${reservation.id}::uuid
          )
        `;
      } else {
        // Estado inesperado
        throw new Error(`Estado de pago no manejado: ${paymentIntent.status}`);
      }
    } catch (error: any) {
      console.error('❌ Error procesando cancelación/reembolso:', error);
      const response = NextResponse.json(
        { success: false, error: `Error procesando la cancelación: ${error.message}` },
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
          payment_status = ${isPaymentHeld ? 'cancelled' : 'refunded'},
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
      message: isPaymentHeld 
        ? 'Reserva cancelada. El pago no fue capturado.'
        : 'Reserva cancelada y reembolso procesado exitosamente',
      payment_action: paymentAction,
      refund: refund ? {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        currency: refund.currency
      } : null,
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

