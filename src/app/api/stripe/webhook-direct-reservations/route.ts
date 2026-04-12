// =====================================================
// WEBHOOK DE STRIPE PARA RESERVAS DIRECTAS
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sql } from '@vercel/postgres';
import { sendReservationEmails, sendCheckinInstructionsEmail } from '@/lib/email-notifications';
import { hasCheckinInstructionsEmailPlan } from '@/lib/checkin-email-plan';
import { DirectReservation, TenantProperty } from '@/lib/direct-reservations-types';
import { getStripeServer } from '@/lib/stripe-server';

const webhookSecret = process.env.STRIPE_WEBHOOK_DIRECT_RESERVATIONS_SECRET!;

export async function POST(req: NextRequest) {
  // Log inicial para confirmar que este endpoint está siendo llamado
  console.log('🎯 [WEBHOOK RESERVAS] ========== ENDPOINT LLAMADO ==========');
  console.log('🎯 [WEBHOOK RESERVAS] URL:', req.url);
  console.log('🎯 [WEBHOOK RESERVAS] Método:', req.method);
  
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature')!;

    console.log('🎯 [WEBHOOK RESERVAS] Body recibido, length:', body.length);
    console.log('🎯 [WEBHOOK RESERVAS] Signature presente:', !!signature);

    if (!webhookSecret) {
      console.error('❌ [WEBHOOK RESERVAS] STRIPE_WEBHOOK_DIRECT_RESERVATIONS_SECRET no configurado');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    if (!signature) {
      console.error('❌ [WEBHOOK RESERVAS] Firma de webhook no presente en headers');
      return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = getStripeServer().webhooks.constructEvent(body, signature, webhookSecret);
      console.log('✅ [WEBHOOK RESERVAS] Webhook verificado correctamente:', event.type);
    } catch (err: any) {
      console.error('❌ [WEBHOOK RESERVAS] Error verificando webhook:', {
        error: err.message,
        hasSignature: !!signature,
        signatureLength: signature?.length,
        bodyLength: body.length,
        webhookSecretConfigured: !!webhookSecret,
        webhookSecretLength: webhookSecret?.length
      });
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    console.log('🔔 [WEBHOOK RESERVAS DIRECTAS] Evento recibido y verificado:', {
      type: event.type,
      id: event.id,
      created: event.created,
      livemode: event.livemode
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

      // Verificar que sea una reserva directa o pago vía enlace (mismos metadatos)
      const paymentSource = paymentIntent.metadata?.source;
      const isDirectOrLink =
        paymentSource === 'direct_reservation' || paymentSource === 'payment_link';
      if (!isDirectOrLink || !paymentIntent.metadata?.reservation_code) {
        console.warn('⚠️ [WEBHOOK RESERVAS] Payment Intent NO es de una reserva directa:', {
          paymentIntentId: paymentIntent.id,
          source: paymentIntent.metadata?.source,
          hasReservationCode: !!paymentIntent.metadata?.reservation_code,
          metadata: paymentIntent.metadata
        });
        console.warn('⚠️ [WEBHOOK RESERVAS] Ignorando pago que no es de reserva directa...');
        // No procesar si no es una reserva directa
        return NextResponse.json({ 
          received: true, 
          message: 'Ignored: Not a direct reservation' 
        });
      }

      // Crear o actualizar reserva desde los metadatos del Payment Intent
      // La reserva se crea SOLO cuando el pago se confirma exitosamente
      if (paymentIntent.metadata?.reservation_code) {
        console.log('🔍 [WEBHOOK RESERVAS] Procesando pago de reserva directa:', {
          paymentIntentId: paymentIntent.id,
          reservationCode: paymentIntent.metadata.reservation_code,
          status: paymentIntent.status
        });

        // Verificar si la reserva ya existe (por código de reserva)
        const existingReservation = await sql`
          SELECT id FROM direct_reservations 
          WHERE reservation_code = ${paymentIntent.metadata.reservation_code}
        `;

        let reservationId: number;

        if (existingReservation.rows.length > 0) {
          // Reserva ya existe, actualizarla
          reservationId = existingReservation.rows[0].id;
          console.log('📝 [WEBHOOK RESERVAS] Reserva ya existe, actualizando:', reservationId);
        
        const updateResult = await sql`
          UPDATE direct_reservations 
          SET 
            payment_status = 'paid',
              stripe_payment_intent_id = ${paymentIntent.id},
            stripe_charge_id = ${paymentIntent.latest_charge as string},
            payment_method = 'card',
            confirmed_at = NOW(),
            updated_at = NOW()
            WHERE id = ${reservationId}
          RETURNING *
        `;

          console.log('✅ [WEBHOOK RESERVAS] Reserva actualizada:', {
            reservationId,
            rowsUpdated: updateResult.rows.length
          });

          // Si es un pago desde enlace de pago, actualizar el enlace
          if (paymentSource === 'payment_link' && paymentIntent.metadata?.payment_link_code) {
            try {
              await sql`
                UPDATE payment_links
                SET 
                  payment_completed = true,
                  payment_completed_at = NOW(),
                  reservation_id = ${reservationId},
                  usage_count = usage_count + 1,
                  updated_at = NOW()
                WHERE link_code = ${paymentIntent.metadata.payment_link_code}
              `;
              console.log('✅ [WEBHOOK RESERVAS] Enlace de pago marcado como completado:', paymentIntent.metadata.payment_link_code);
            } catch (linkErr) {
              console.error('⚠️ [WEBHOOK RESERVAS] Error actualizando enlace de pago (continuo):', linkErr);
            }
          }
        } else {
          // Crear nueva reserva desde los metadatos (esto es lo nuevo)
          console.log('✨ [WEBHOOK RESERVAS] Creando nueva reserva desde metadatos del Payment Intent');

          const createResult = await sql`
            INSERT INTO direct_reservations (
              tenant_id, property_id, reservation_code,
              guest_name, guest_email, guest_phone, guest_document_type,
              guest_document_number, guest_nationality,
              check_in_date, check_out_date, nights, guests,
              base_price, cleaning_fee, security_deposit,
              subtotal, delfin_commission_rate, delfin_commission_amount,
              stripe_fee_amount, property_owner_amount, total_amount,
              stripe_payment_intent_id, stripe_charge_id,
              payment_status, payment_method, reservation_status, special_requests
            ) VALUES (
              ${paymentIntent.metadata.tenant_id}, 
              ${parseInt(paymentIntent.metadata.property_id)}, 
              ${paymentIntent.metadata.reservation_code},
              ${paymentIntent.metadata.guest_name}, 
              ${paymentIntent.metadata.guest_email}, 
              ${paymentIntent.metadata.guest_phone || null}, 
              ${paymentIntent.metadata.guest_document_type || null},
              ${paymentIntent.metadata.guest_document_number || null}, 
              ${paymentIntent.metadata.guest_nationality || null},
              ${paymentIntent.metadata.check_in_date}, 
              ${paymentIntent.metadata.check_out_date}, 
              ${parseInt(paymentIntent.metadata.nights)}, 
              ${parseInt(paymentIntent.metadata.guests)},
              ${parseFloat(paymentIntent.metadata.base_price)}, 
              ${parseFloat(paymentIntent.metadata.cleaning_fee)}, 
              ${parseFloat(paymentIntent.metadata.security_deposit)},
              ${parseFloat(paymentIntent.metadata.subtotal)}, 
              ${parseFloat(paymentIntent.metadata.delfin_commission_rate)}, 
              ${parseFloat(paymentIntent.metadata.delfin_commission_amount)},
              ${parseFloat(paymentIntent.metadata.stripe_fee_amount)}, 
              ${parseFloat(paymentIntent.metadata.property_owner_amount)}, 
              ${parseFloat(paymentIntent.metadata.total_amount)},
              ${paymentIntent.id},
              ${paymentIntent.latest_charge as string},
              'paid', 
              'card', 
              'confirmed', 
              ${paymentIntent.metadata.special_requests || null}
            )
            RETURNING id
          `;

          reservationId = createResult.rows[0].id;
          console.log('✅ [WEBHOOK RESERVAS] Nueva reserva creada desde Payment Intent:', {
            reservationId,
            reservationCode: paymentIntent.metadata.reservation_code
          });

          // Si es un pago desde enlace de pago, actualizar el enlace
          if (paymentSource === 'payment_link' && paymentIntent.metadata?.payment_link_code) {
            try {
              await sql`
                UPDATE payment_links
                SET 
                  payment_completed = true,
                  payment_completed_at = NOW(),
                  reservation_id = ${reservationId},
                  usage_count = usage_count + 1,
                  updated_at = NOW()
                WHERE link_code = ${paymentIntent.metadata.payment_link_code}
              `;
              console.log('✅ [WEBHOOK RESERVAS] Enlace de pago marcado como completado:', paymentIntent.metadata.payment_link_code);
            } catch (linkErr) {
              console.error('⚠️ [WEBHOOK RESERVAS] Error actualizando enlace de pago (continuo):', linkErr);
            }
          }
        }

        // 4.1 Insertar en tabla operacional 'reservations' (si no existe)
        try {
          const mapping = await sql`
            SELECT room_id 
            FROM property_room_map 
            WHERE tenant_id = ${paymentIntent.metadata.tenant_id}
              AND property_id = ${parseInt(paymentIntent.metadata.property_id)}
            LIMIT 1
          `;
          const roomId = mapping.rows[0]?.room_id || null;

          // Idempotencia: comprobar si ya existe una fila equivalente
          const existingOp = await sql`
            SELECT id FROM reservations
            WHERE tenant_id = ${paymentIntent.metadata.tenant_id}
              AND room_id = ${roomId}
              AND check_in = ${paymentIntent.metadata.check_in_date}
              AND check_out = ${paymentIntent.metadata.check_out_date}
              AND guest_email = ${paymentIntent.metadata.guest_email}
            LIMIT 1
          `;

          if (existingOp.rows.length === 0) {
            await sql`
              INSERT INTO reservations (
                tenant_id,
                room_id,
                guest_name,
                guest_email,
                guest_phone,
                check_in,
                check_out,
                guest_count,
                total_price,
                channel,
                created_at
              ) VALUES (
                ${paymentIntent.metadata.tenant_id}::uuid,
                ${roomId},
                ${paymentIntent.metadata.guest_name},
                ${paymentIntent.metadata.guest_email},
                ${paymentIntent.metadata.guest_phone || null},
                ${paymentIntent.metadata.check_in_date}::timestamp,
                ${paymentIntent.metadata.check_out_date}::timestamp,
                ${parseInt(paymentIntent.metadata.guests)},
                ${parseFloat(paymentIntent.metadata.total_amount)},
                'direct',
                NOW()
              )
            `;
            console.log('✅ [WEBHOOK RESERVAS] Reserva operacional insertada en reservations');
          } else {
            console.log('ℹ️ [WEBHOOK RESERVAS] Reserva operacional ya existe, no se duplica');
          }
        } catch (opErr) {
          console.error('⚠️ [WEBHOOK RESERVAS] Error insertando en reservations (continuo):', opErr);
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
          
          // Verificar que no exista ya la transacción
          const existingTransaction = await sql`
            SELECT id FROM commission_transactions 
            WHERE reservation_id = ${reservationId}
          `;

          if (existingTransaction.rows.length === 0) {
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
            console.log('✅ [WEBHOOK RESERVAS] Transacción de comisión creada:', reservationId);
          }
        }

        // 4.2 Bloquear disponibilidad por día en property_availability (idempotente)
        try {
          await sql`
            INSERT INTO property_availability (property_id, date, available, blocked_reason, created_at)
            SELECT
              ${parseInt(paymentIntent.metadata.property_id)} AS property_id,
              d::date,
              FALSE,
              'direct_reservation',
              NOW()
            FROM generate_series(${paymentIntent.metadata.check_in_date}::date, (${paymentIntent.metadata.check_out_date}::date - INTERVAL '1 day'), INTERVAL '1 day') AS g(d)
            ON CONFLICT (property_id, date) DO UPDATE
              SET available = EXCLUDED.available,
                  blocked_reason = EXCLUDED.blocked_reason,
                  created_at = EXCLUDED.created_at
          `;
          console.log('✅ [WEBHOOK RESERVAS] Disponibilidad bloqueada en property_availability');
        } catch (avErr) {
          console.error('⚠️ [WEBHOOK RESERVAS] Error bloqueando disponibilidad (continuo):', avErr);
        }

        // 4.3 Crear evento de calendario interno
        try {
          await sql`
            INSERT INTO calendar_events (
              tenant_id,
              property_id,
              calendar_name,
              calendar_type,
              event_title,
              event_description,
              start_date,
              end_date,
              is_blocked,
              event_type,
              created_at
            ) VALUES (
              ${paymentIntent.metadata.tenant_id}::uuid,
              ${parseInt(paymentIntent.metadata.property_id)}::integer,
              'Reservas Directas',
              'internal',
              ${'Reserva ' + paymentIntent.metadata.reservation_code},
              ${'Bloqueo por reserva ' + paymentIntent.metadata.reservation_code},
              ${paymentIntent.metadata.check_in_date}::date,
              ${paymentIntent.metadata.check_out_date}::date,
              FALSE,
              'reservation',
              NOW()
            )
          `;
          console.log('✅ [WEBHOOK RESERVAS] Evento interno creado en calendar_events');
        } catch (calErr) {
          console.error('⚠️ [WEBHOOK RESERVAS] Error creando calendar_event (continuo):', calErr);
        }

        // Enviar emails de notificación al huésped y propietario
        if (reservationId) {
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

            if (reservationData.rows.length === 0) {
              console.error('❌ [WEBHOOK RESERVAS] No se encontró la reserva después de crearla:', reservationId);
              throw new Error('Reserva no encontrada después de crear');
            }

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

              // Tras confirmación, enviar instrucciones de check‑in (ligero retardo para evitar solaparse)
              try {
                // Resolver room_id para personalizar instrucciones si existen
                let roomId: string | null = null
                try {
                  const mapping = await sql`
                    SELECT room_id FROM property_room_map
                    WHERE tenant_id = ${reservation.tenant_id} AND property_id = ${reservation.property_id}
                    LIMIT 1
                  `
                  roomId = mapping.rows[0]?.room_id || null
                } catch {}

                await new Promise((r) => setTimeout(r, 2500))

                const tenantPlanRow = await sql`
                  SELECT plan_type, plan_id FROM tenants WHERE id = ${reservation.tenant_id}::uuid LIMIT 1
                `
                const tenantPlan = tenantPlanRow.rows[0] as
                  | { plan_type?: string | null; plan_id?: string | null }
                  | undefined
                const canAutoCheckinEmail =
                  tenantPlan && hasCheckinInstructionsEmailPlan(tenantPlan as any)

                if (!canAutoCheckinEmail) {
                  console.log(
                    '📧 [WEBHOOK RESERVAS] Instrucciones check-in no enviadas (planes Standard/Pro)'
                  )
                } else {
                  const instrRes = await sendCheckinInstructionsEmail({
                    reservation,
                    property,
                    roomId,
                    publicFormUrl,
                  })
                  console.log(
                    '📧 [WEBHOOK RESERVAS] Instrucciones check‑in:',
                    instrRes.success ? '✅ Enviadas' : `❌ ${instrRes.error}`
                  )
                }
              } catch (e:any) {
                console.error('⚠️ [WEBHOOK RESERVAS] Error al enviar instrucciones check‑in (no bloquea webhook):', e.message)
              }
              
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

        console.log('✅ [WEBHOOK RESERVAS] ========== PROCESAMIENTO COMPLETADO ==========');
        console.log('✅ [WEBHOOK RESERVAS] Reserva:', reservationId);
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

        console.log('❌ [WEBHOOK RESERVAS] Reserva marcada como pago fallido:', reservationId);
      }
    }

    // Retornar success para cualquier evento procesado
    console.log('✅ [WEBHOOK RESERVAS] Respuesta enviada exitosamente');
    return NextResponse.json({ 
      received: true,
      eventType: event.type,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
