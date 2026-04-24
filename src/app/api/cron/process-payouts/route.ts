// =====================================================
// CRON JOB: PROCESAR PAGOS AUTOMÁTICOS
// Ejecutar diariamente para procesar pagos del día
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { sendPayoutNotificationEmail } from '@/lib/email-notifications';
import { getStripeServer } from '@/lib/stripe-server';

export async function GET(req: NextRequest) {
  // Stripe Connect (Direct Charges): Stripe gestiona payouts al banco del propietario.
  // Este cron de transfers desde la plataforma queda deshabilitado salvo modo legacy.
  if (process.env.STRIPE_PAYOUTS_MODE !== 'legacy_transfers') {
    return NextResponse.json({
      success: true,
      message:
        'Migración activa: payouts gestionados por Stripe Connect en la cuenta del propietario. Cron deshabilitado.',
      processed: 0,
      skipped: 0,
      failed: 0,
      details: [],
      deprecated: true,
    });
  }

  try {
    // Vercel Cron envía automáticamente headers de verificación
    // No necesitamos verificar manualmente si está configurado en vercel.json
    
    // Buscar reservas confirmadas cuyo check-in es HOY
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    console.log('💸 [CRON] Procesando pagos para check-ins de hoy:', todayStr);

    const reservationsQuery = await sql`
      SELECT 
        dr.id,
        dr.tenant_id,
        dr.property_id,
        dr.reservation_code,
        dr.property_owner_amount,
        dr.total_amount,
        dr.stripe_fee_amount,
        dr.delfin_commission_amount,
        dr.check_in_date,
        dr.check_out_date,
        t.name AS tenant_name,
        t.email AS tenant_email,
        tba.stripe_account_id,
        tba.iban,
        ct.id AS transaction_exists
      FROM direct_reservations dr
      INNER JOIN tenants t ON dr.tenant_id = t.id
      LEFT JOIN tenant_bank_accounts tba ON dr.tenant_id = tba.tenant_id 
        AND tba.is_active = TRUE 
        AND tba.is_default = TRUE
        AND tba.verification_status = 'verified'
      LEFT JOIN commission_transactions ct ON dr.id = ct.reservation_id 
        AND ct.status = 'completed'
      WHERE dr.reservation_status = 'confirmed'
        AND dr.payment_status = 'paid'
        AND dr.check_in_date::date = ${todayStr}::date
        AND ct.id IS NULL
    `;

    const reservations = reservationsQuery.rows;
    
    if (reservations.length === 0) {
      console.log('ℹ️ [CRON] No hay reservas pendientes de pago para hoy');
      return NextResponse.json({
        success: true,
        message: 'No hay reservas pendientes de pago para hoy',
        processed: 0
      });
    }

    console.log(`📊 [CRON] Encontradas ${reservations.length} reservas pendientes de pago`);

    type PayoutDetail =
      | { reservation_code: string; status: 'skipped'; reason: string }
      | {
          reservation_code: string;
          tenant_name: string;
          amount: string | number;
          status: string;
          transfer_id: string;
          iban?: string;
        }
      | { reservation_code: string; status: string; error: string };

    const results: {
      processed: number;
      failed: number;
      skipped: number;
      details: PayoutDetail[];
    } = {
      processed: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    // Procesar cada reserva
    for (const reservation of reservations) {
      try {
        if (!reservation.stripe_account_id) {
          console.log(`⚠️ [CRON] Reserva ${reservation.reservation_code} sin cuenta bancaria verificada`);
          results.skipped++;
          results.details.push({
            reservation_code: reservation.reservation_code,
            status: 'skipped',
            reason: 'Sin cuenta bancaria verificada'
          });
          continue;
        }

        // Crear registro de transacción
        const transactionResult = await sql`
          INSERT INTO commission_transactions (
            reservation_id,
            tenant_id,
            transaction_type,
            amount,
            stripe_fee,
            net_amount,
            status,
            created_at
          ) VALUES (
            ${reservation.id},
            ${reservation.tenant_id},
            'payout',
            ${reservation.property_owner_amount},
            0.00,
            ${reservation.property_owner_amount},
            'processing',
            NOW()
          )
          RETURNING id
        `;

        const transactionId = transactionResult.rows[0].id;

        // Convertir a centavos
        const amountInCents = Math.round(reservation.property_owner_amount * 100);

        // Crear transferencia en Stripe
        const transfer = await getStripeServer().transfers.create({
          amount: amountInCents,
          currency: 'eur',
          destination: reservation.stripe_account_id,
          metadata: {
            reservation_id: reservation.id.toString(),
            reservation_code: reservation.reservation_code,
            transaction_id: transactionId.toString(),
            processed_by: 'cron',
            processed_at: new Date().toISOString()
          }
        });

        console.log(`✅ [CRON] Pago procesado para ${reservation.reservation_code}: ${reservation.property_owner_amount}€`);

        // Actualizar transacción como completada
        await sql`
          UPDATE commission_transactions
          SET 
            stripe_transfer_id = ${transfer.id},
            status = 'completed',
            processed_at = NOW()
          WHERE id = ${transactionId}
        `;

        // Enviar email de notificación al propietario
        try {
          await sendPayoutNotificationEmail({
            to: reservation.tenant_email,
            reservation_code: reservation.reservation_code,
            check_in_date: reservation.check_in_date,
            check_out_date: reservation.check_out_date,
            total_amount: parseFloat(reservation.total_amount),
            stripe_fee: parseFloat(reservation.stripe_fee_amount || 0),
            delfin_commission: parseFloat(reservation.delfin_commission_amount),
            payout_amount: parseFloat(reservation.property_owner_amount),
            transfer_id: transfer.id,
            tenant_name: reservation.tenant_name,
            iban: reservation.iban
          });
          console.log(`📧 [CRON] Email enviado a ${reservation.tenant_email}`);
        } catch (emailError) {
          console.error(`⚠️ [CRON] Error enviando email (no bloquea pago):`, emailError);
          // No fallar el pago si el email falla
        }

        results.processed++;
        results.details.push({
          reservation_code: reservation.reservation_code,
          tenant_name: reservation.tenant_name,
          amount: reservation.property_owner_amount,
          status: 'completed',
          transfer_id: transfer.id
        });

      } catch (error: any) {
        console.error(`❌ [CRON] Error procesando pago para ${reservation.reservation_code}:`, error);
        
        results.failed++;
        results.details.push({
          reservation_code: reservation.reservation_code,
          status: 'failed',
          error: error.message
        });

        // Marcar transacción como fallida
        const transactionResult = await sql`
          SELECT id FROM commission_transactions
          WHERE reservation_id = ${reservation.id}
          ORDER BY created_at DESC
          LIMIT 1
        `;

        if (transactionResult.rows.length > 0) {
          await sql`
            UPDATE commission_transactions
            SET status = 'failed'
            WHERE id = ${transactionResult.rows[0].id}
          `;
        }
      }
    }

    console.log(`✅ [CRON] Procesamiento completado: ${results.processed} exitosos, ${results.failed} fallidos, ${results.skipped} omitidos`);

    return NextResponse.json({
      success: true,
      message: 'Procesamiento completado',
      ...results
    });

  } catch (error: any) {
    console.error('❌ [CRON] Error en procesamiento de pagos:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

