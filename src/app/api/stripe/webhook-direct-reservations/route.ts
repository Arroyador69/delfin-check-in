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

    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_DIRECT_RESERVATIONS_SECRET no configurado');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    if (!signature) {
      console.error('❌ Firma de webhook no presente en headers');
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('✅ Webhook verificado correctamente:', event.type);
    } catch (err: any) {
      console.error('❌ Error verificando webhook de reservas directas:', {
        error: err.message,
        hasSignature: !!signature,
        signatureLength: signature?.length,
        bodyLength: body.length,
        webhookSecretConfigured: !!webhookSecret
      });
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    console.log('🔔 [WEBHOOK RESERVAS DIRECTAS] Evento recibido:', {
      type: event.type,
      id: event.id,
      created: event.created
    });

    // Manejar eventos de Payment Intent
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      console.log('✅ [WEBHOOK RESERVAS] Pago exitoso recibido:', {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        amountInEuros: (paymentIntent.amount / 100).toFixed(2),
        metadata: paymentIntent.metadata,
        hasReservationId: !!paymentIntent.metadata?.reservation_id
      });

      // Verificar que tenga reservation_id en metadata
      if (!paymentIntent.metadata?.reservation_id) {
        console.warn('⚠️ [WEBHOOK RESERVAS] Payment Intent sin reservation_id en metadata:', {
          paymentIntentId: paymentIntent.id,
          metadata: paymentIntent.metadata,
          source: paymentIntent.metadata?.source
        });
        // Continuar para procesar aunque no tenga reservation_id, pero loguear
      }

      // Actualizar reserva como pagada
      if (paymentIntent.metadata?.reservation_id) {
        const reservationId = parseInt(paymentIntent.metadata.reservation_id);
        console.log('🔍 [WEBHOOK RESERVAS] Procesando reserva:', reservationId);
        
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

        console.log('📝 [WEBHOOK RESERVAS] Reserva actualizada:', {
          reservationId,
          rowsUpdated: updateResult.rows.length,
          wasUpdated: updateResult.rows.length > 0
        });

        if (updateResult.rows.length === 0) {
          console.warn('⚠️ [WEBHOOK RESERVAS] No se encontró reserva para actualizar:', {
            reservationId,
            paymentIntentId: paymentIntent.id,
            expectedPaymentIntentId: paymentIntent.id
          });
          // Intentar buscar por reservation_id sin verificar payment_intent_id
          const fallbackCheck = await sql`
            SELECT id, stripe_payment_intent_id, payment_status, reservation_code
            FROM direct_reservations 
            WHERE id = ${reservationId}
          `;
          if (fallbackCheck.rows.length > 0) {
            console.log('🔍 [WEBHOOK RESERVAS] Reserva encontrada pero payment_intent_id no coincide:', {
              reservationId,
              storedPaymentIntentId: fallbackCheck.rows[0].stripe_payment_intent_id,
              receivedPaymentIntentId: paymentIntent.id
            });
          } else {
            console.error('❌ [WEBHOOK RESERVAS] Reserva no encontrada en base de datos:', reservationId);
          }
        }

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
          console.log('📧 [WEBHOOK RESERVAS] Iniciando envío de emails para reserva:', reservationId);
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
              console.log('📧 [WEBHOOK RESERVAS] Enviando emails...', {
                reservationCode: reservation.reservation_code,
                guestEmail: reservation.guest_email,
                formUrl: publicFormUrl
              });
              
              const emailResults = await sendReservationEmails(reservation, property, publicFormUrl);
              
              console.log('📧 [WEBHOOK RESERVAS] Resultado envío emails:', {
                reservationCode: reservation.reservation_code,
                guestEmail: emailResults.guestEmail.success ? '✅ Enviado' : '❌ Error',
                ownerEmail: emailResults.ownerEmail.success ? '✅ Enviado' : '❌ Error',
                guestError: emailResults.guestEmail.error,
                ownerError: emailResults.ownerEmail.error,
                guestMessageId: emailResults.guestEmail.messageId,
                ownerMessageId: emailResults.ownerEmail.messageId
              });
            } else {
              console.error('❌ [WEBHOOK RESERVAS] No se encontraron datos de reserva después de actualizar:', reservationId);
            }
          } catch (emailError: any) {
            console.error('❌ [WEBHOOK RESERVAS] Error enviando emails:', {
              error: emailError.message,
              stack: emailError.stack,
              reservationId
            });
            // No fallar el webhook si los emails fallan, solo loguear el error
          }
        } else {
          console.warn('⚠️ [WEBHOOK RESERVAS] Reserva no fue actualizada, no se enviarán emails');
        }

        console.log('✅ [WEBHOOK RESERVAS] Procesamiento completado para reserva:', reservationId);
      } else {
        console.warn('⚠️ [WEBHOOK RESERVAS] Payment Intent recibido sin reservation_id en metadata, ignorando');
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
