/**
 * ========================================
 * API: Liberar Pago (Release Payment)
 * ========================================
 * Libera un pago retenido cuando se cancela antes del check-in
 * Cancela el Payment Intent en lugar de capturarlo
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-08-27.basil',
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
    const { paymentIntentId, reservationId, reason = 'cancelled_before_checkin' } = body;

    if (!paymentIntentId || !reservationId) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Obtener Payment Intent de Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Si ya está capturado, hacer reembolso
    if (paymentIntent.status === 'succeeded') {
      // Buscar el charge para hacer reembolso
      const charges = await stripe.charges.list({
        payment_intent: paymentIntentId,
        limit: 1,
      });

      if (charges.data.length > 0) {
        const charge = charges.data[0];
        
        // Crear reembolso completo
        const refund = await stripe.refunds.create({
          charge: charge.id,
          reason: 'requested_by_customer',
          metadata: {
            reservation_id: reservationId,
            reason: reason,
            tenant_id: tenantId,
          },
        });

        // Registrar gasto en tenant_costs
        await sql`
          INSERT INTO tenant_costs (
            tenant_id, cost_type, amount, currency, description,
            stripe_transaction_id, reservation_id
          ) VALUES (
            ${tenantId}::uuid,
            'refund',
            ${refund.amount / 100}, -- Convertir de centavos a euros
            'EUR',
            ${`Reembolso por cancelación antes del check-in - Reserva ${reservationId}`},
            ${refund.id},
            ${reservationId}::uuid
          )
        `;

        console.log(`✅ Reembolso creado: ${refund.id} para reserva ${reservationId}`);

        return NextResponse.json({
          success: true,
          refund_id: refund.id,
          amount: refund.amount / 100,
          message: 'Pago reembolsado exitosamente'
        });
      }
    } else if (paymentIntent.status === 'requires_capture') {
      // Si está retenido pero no capturado, simplemente cancelarlo
      const cancelled = await stripe.paymentIntents.cancel(paymentIntentId, {
        cancellation_reason: 'requested_by_customer',
      });

      console.log(`✅ Payment Intent cancelado: ${paymentIntentId}`);

      return NextResponse.json({
        success: true,
        payment_intent_id: paymentIntentId,
        status: 'cancelled',
        message: 'Pago cancelado (no se cobró)'
      });
    } else {
      // Si ya está cancelado o en otro estado
      return NextResponse.json({
        success: true,
        payment_intent_id: paymentIntentId,
        status: paymentIntent.status,
        message: `El pago ya está en estado: ${paymentIntent.status}`
      });
    }

  } catch (error: any) {
    console.error('❌ Error liberando pago:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
}

