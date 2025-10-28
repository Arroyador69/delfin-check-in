// =====================================================
// WEBHOOK DE STRIPE PARA RESERVAS DIRECTAS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@vercel/postgres';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('❌ Error verificando webhook:', err);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    console.log('🔔 Webhook recibido:', event.type);

    // Manejar eventos de Payment Intent
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      console.log('✅ Pago exitoso:', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        metadata: paymentIntent.metadata
      });

      // Actualizar reserva como pagada
      if (paymentIntent.metadata.reservation_id) {
        const reservationId = parseInt(paymentIntent.metadata.reservation_id);
        
        await sql`
          UPDATE direct_reservations 
          SET 
            payment_status = 'paid',
            stripe_charge_id = ${paymentIntent.latest_charge as string},
            payment_method = 'card',
            confirmed_at = NOW(),
            updated_at = NOW()
          WHERE id = ${reservationId} AND stripe_payment_intent_id = ${paymentIntent.id}
        `;

        // Crear transacción de comisión
        const reservation = await sql`
          SELECT 
            tenant_id, delfin_commission_amount, stripe_fee_amount, property_owner_amount
          FROM direct_reservations 
          WHERE id = ${reservationId}
        `;

        if (reservation.rows.length > 0) {
          const res = reservation.rows[0];
          
          await sql`
            INSERT INTO commission_transactions (
              reservation_id, tenant_id, transaction_type, amount, 
              stripe_fee, net_amount, status, processed_at
            ) VALUES (
              ${reservationId}, ${res.tenant_id}, 'commission', 
              ${res.delfin_commission_amount}, ${res.stripe_fee_amount}, 
              ${res.delfin_commission_amount - res.stripe_fee_amount}, 
              'completed', NOW()
            )
          `;
        }

        console.log('✅ Reserva actualizada como pagada:', reservationId);
      }
    }

    // Manejar eventos de Payment Intent fallido
    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      console.log('❌ Pago fallido:', {
        paymentIntentId: paymentIntent.id,
        metadata: paymentIntent.metadata
      });

      if (paymentIntent.metadata.reservation_id) {
        const reservationId = parseInt(paymentIntent.metadata.reservation_id);
        
        await sql`
          UPDATE direct_reservations 
          SET 
            payment_status = 'failed',
            updated_at = NOW()
          WHERE id = ${reservationId} AND stripe_payment_intent_id = ${paymentIntent.id}
        `;

        console.log('❌ Reserva marcada como pago fallido:', reservationId);
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
