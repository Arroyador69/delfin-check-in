// =====================================================
// WEBHOOK DE STRIPE PARA RESERVAS DIRECTAS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@vercel/postgres';
import { sendReservationEmails } from '@/lib/email-notifications';
import { DirectReservation, TenantProperty } from '@/lib/direct-reservations-types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_DIRECT_RESERVATIONS_SECRET!;

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
        
        const updateResult = await sql`
          UPDATE direct_reservations 
          SET 
            payment_status = 'paid',
            stripe_charge_id = ${paymentIntent.latest_charge as string},
            payment_method = 'card',
            confirmed_at = NOW(),
            updated_at = NOW()
          WHERE id = ${reservationId} AND stripe_payment_intent_id = ${paymentIntent.id}
          RETURNING *
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

        // Enviar emails de notificación al huésped y propietario
        if (updateResult.rows.length > 0) {
          try {
            // Obtener los datos completos de la reserva y propiedad
            const reservationData = await sql`
              SELECT 
                dr.*,
                tp.property_name,
                tp.description,
                tp.photos,
                tp.max_guests,
                tp.bedrooms,
                tp.bathrooms,
                tp.amenities,
                t.email as tenant_email,
                t.name as tenant_name
              FROM direct_reservations dr
              JOIN tenant_properties tp ON dr.property_id = tp.id
              JOIN tenants t ON dr.tenant_id = t.id
              WHERE dr.id = ${reservationId}
            `;

            if (reservationData.rows.length > 0) {
              const row = reservationData.rows[0];
              
              // Formatear la reserva para el tipo DirectReservation
              const reservation: DirectReservation = {
                id: row.id,
                tenant_id: row.tenant_id,
                property_id: row.property_id,
                reservation_code: row.reservation_code,
                guest_name: row.guest_name,
                guest_email: row.guest_email,
                guest_phone: row.guest_phone,
                guest_document_type: row.guest_document_type,
                guest_document_number: row.guest_document_number,
                guest_nationality: row.guest_nationality,
                check_in_date: row.check_in_date,
                check_out_date: row.check_out_date,
                nights: row.nights,
                guests: row.guests,
                base_price: parseFloat(row.base_price),
                cleaning_fee: parseFloat(row.cleaning_fee || '0'),
                security_deposit: parseFloat(row.security_deposit || '0'),
                subtotal: parseFloat(row.subtotal),
                delfin_commission_rate: parseFloat(row.delfin_commission_rate),
                delfin_commission_amount: parseFloat(row.delfin_commission_amount),
                stripe_fee_amount: parseFloat(row.stripe_fee_amount || '0'),
                property_owner_amount: parseFloat(row.property_owner_amount),
                total_amount: parseFloat(row.total_amount),
                stripe_payment_intent_id: row.stripe_payment_intent_id,
                stripe_charge_id: row.stripe_charge_id,
                payment_status: row.payment_status,
                payment_method: row.payment_method,
                reservation_status: row.reservation_status,
                special_requests: row.special_requests,
                internal_notes: row.internal_notes,
                created_at: row.created_at.toISOString(),
                updated_at: row.updated_at?.toISOString() || row.created_at.toISOString(),
                confirmed_at: row.confirmed_at?.toISOString()
              };

              // Formatear la propiedad para el tipo TenantProperty
              const property: TenantProperty = {
                id: row.property_id,
                tenant_id: row.tenant_id,
                property_name: row.property_name,
                description: row.description,
                photos: row.photos || [],
                max_guests: row.max_guests,
                bedrooms: row.bedrooms,
                bathrooms: row.bathrooms,
                amenities: row.amenities || [],
                base_price: parseFloat(row.base_price),
                cleaning_fee: parseFloat(row.cleaning_fee || '0'),
                security_deposit: parseFloat(row.security_deposit || '0'),
                minimum_nights: row.minimum_nights,
                maximum_nights: row.maximum_nights,
                availability_rules: {},
                is_active: true,
                created_at: '',
                updated_at: ''
              };

              // Generar URL del formulario público del tenant
              const publicFormUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com'}/api/public/form-redirect/${reservation.tenant_id}`;
              
              // Enviar emails
              const emailResults = await sendReservationEmails(reservation, property, publicFormUrl);
              
              console.log('📧 Emails enviados:', {
                reservationCode: reservation.reservation_code,
                guestEmail: emailResults.guestEmail.success ? '✅ Enviado' : '❌ Error',
                ownerEmail: emailResults.ownerEmail.success ? '✅ Enviado' : '❌ Error',
                guestError: emailResults.guestEmail.error,
                ownerError: emailResults.ownerEmail.error
              });
            }
          } catch (emailError) {
            console.error('❌ Error enviando emails:', emailError);
            // No fallar el webhook si los emails fallan, solo loguear el error
          }
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
