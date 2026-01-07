/**
 * ========================================
 * API: Retener Pago (Hold Payment)
 * ========================================
 * Retiene un pago de reserva hasta el día de check-in
 * Usa capture_method: 'manual' en Stripe
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

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
    const { paymentIntentId, reservationId, checkInDate } = body;

    if (!paymentIntentId || !reservationId || !checkInDate) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Obtener Payment Intent de Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Si ya está capturado, no hacer nada
    if (paymentIntent.status === 'succeeded') {
      return NextResponse.json({
        success: true,
        message: 'El pago ya fue capturado',
        payment_status: 'succeeded'
      });
    }

    // Si el Payment Intent no tiene capture_method: 'manual', actualizarlo
    if (paymentIntent.capture_method !== 'manual') {
      await stripe.paymentIntents.update(paymentIntentId, {
        capture_method: 'manual',
      });
    }

    // Guardar información de retención en la reserva
    await sql`
      UPDATE direct_reservations
      SET 
        payment_hold_until = ${new Date(checkInDate)}::timestamp,
        payment_status = 'held',
        updated_at = NOW()
      WHERE id = ${reservationId}::uuid
    `;

    console.log(`✅ Pago retenido para reserva ${reservationId} hasta ${checkInDate}`);

    return NextResponse.json({
      success: true,
      payment_intent_id: paymentIntentId,
      reservation_id: reservationId,
      hold_until: checkInDate,
      message: 'Pago retenido hasta el día de check-in'
    });

  } catch (error: any) {
    console.error('❌ Error reteniendo pago:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

