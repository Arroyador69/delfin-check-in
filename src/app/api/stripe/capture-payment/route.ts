/**
 * ========================================
 * API: Capturar Pago (Capture Payment)
 * ========================================
 * Captura un pago retenido después del check-in
 * Se ejecuta automáticamente el día de check-in o manualmente
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getStripeServer } from '@/lib/stripe-server';

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { paymentIntentId, reservationId } = body;

    if (!paymentIntentId || !reservationId) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Obtener Payment Intent de Stripe
    const paymentIntent = await getStripeServer().paymentIntents.retrieve(paymentIntentId);

    // Si ya está capturado, no hacer nada
    if (paymentIntent.status === 'succeeded') {
      return NextResponse.json({
        success: true,
        message: 'El pago ya fue capturado',
        payment_status: 'succeeded'
      });
    }

    // Si no está en estado para capturar, retornar error
    if (paymentIntent.status !== 'requires_capture') {
      return NextResponse.json(
        { 
          success: false, 
          error: `El pago no puede ser capturado. Estado actual: ${paymentIntent.status}` 
        },
        { status: 400 }
      );
    }

    // Capturar el pago
    const captured = await getStripeServer().paymentIntents.capture(paymentIntentId);

    // Actualizar reserva en BD
    await sql`
      UPDATE direct_reservations
      SET 
        payment_status = 'captured',
        payment_captured_at = NOW(),
        updated_at = NOW()
      WHERE id = ${reservationId}::uuid
    `;

    // Registrar ingreso en tenant_revenues (solo la comisión de Delfín)
    const reservation = await sql`
      SELECT delfin_commission_amount, total_amount
      FROM direct_reservations
      WHERE id = ${reservationId}::uuid
    `;

    if (reservation.rows.length > 0) {
      const res = reservation.rows[0];
      
      await sql`
        INSERT INTO tenant_revenues (
          tenant_id, revenue_type, amount, currency, description,
          stripe_transaction_id, reservation_id
        ) VALUES (
          ${tenantId}::uuid,
          'commission',
          ${parseFloat(res.delfin_commission_amount || '0')},
          'EUR',
          ${`Comisión de reserva directa - Reserva ${reservationId}`},
          ${captured.id},
          ${reservationId}::uuid
        )
      `;

      // Registrar gasto de Stripe fee
      const stripeFee = parseFloat(res.total_amount || '0') * 0.014 + 0.25; // 1.4% + 0.25€
      
      await sql`
        INSERT INTO tenant_costs (
          tenant_id, cost_type, amount, currency, description,
          stripe_transaction_id, reservation_id
        ) VALUES (
          ${tenantId}::uuid,
          'stripe_fee',
          ${stripeFee},
          'EUR',
          ${`Fee de Stripe por reserva directa - Reserva ${reservationId}`},
          ${captured.id},
          ${reservationId}::uuid
        )
      `;
    }

    console.log(`✅ Pago capturado: ${paymentIntentId} para reserva ${reservationId}`);

    return NextResponse.json({
      success: true,
      payment_intent_id: paymentIntentId,
      reservation_id: reservationId,
      amount: captured.amount / 100,
      status: 'succeeded',
      message: 'Pago capturado exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error capturando pago:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

