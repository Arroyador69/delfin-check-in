/**
 * Funciones auxiliares para manejar referidos en webhooks de Stripe
 */

import { sql } from '@/lib/db';
import { recalculateRewards } from './referral-rewards';
import { sendReferralStatusChangedEmail, sendReferralActivatedPlanEmail } from './referral-emails';
import Stripe from 'stripe';

/**
 * Maneja cuando un referido paga exitosamente
 */
export async function handleReferralPaymentSucceeded(
  tenantId: string,
  invoice: Stripe.Invoice
): Promise<void> {
  try {
    // Buscar si este tenant es un referido
    const referral = await sql`
      SELECT 
        id,
        referrer_tenant_id,
        status,
        referred_plan_type,
        months_paid_completed,
        first_paid_at
      FROM referrals
      WHERE referred_tenant_id = ${tenantId}
      LIMIT 1
    `;

    if (referral.rows.length === 0) {
      // No es un referido, no hacer nada
      return;
    }

    const referralData = referral.rows[0];
    const referrerTenantId = referralData.referrer_tenant_id;

    // Obtener plan_type del tenant referido
    const tenantInfo = await sql`
      SELECT plan_type
      FROM tenants
      WHERE id = ${tenantId}
      LIMIT 1
    `;

    const planType = tenantInfo.rows[0]?.plan_type || 'free';

    // Actualizar estado del referido
    let newStatus = 'registered';
    if (planType === 'checkin') {
      newStatus = 'active_checkin';
    } else if (planType === 'pro') {
      newStatus = 'active_pro';
    }

    // Verificar si es el primer pago
    const isFirstPayment = !referralData.first_paid_at;

    // Incrementar meses pagados completos
    // IMPORTANTE: Solo incrementar después de que se haya completado 1 mes completo
    // Por ahora, incrementamos si es el primer pago (esto se ajustará con el delay de 1 mes)
    const newMonthsPaid = isFirstPayment ? 1 : referralData.months_paid_completed + 1;

    // Actualizar referido
    await sql`
      UPDATE referrals
      SET 
        status = ${newStatus},
        referred_plan_type = ${planType},
        months_paid_completed = ${newMonthsPaid},
        first_paid_at = ${isFirstPayment ? new Date() : referralData.first_paid_at},
        last_paid_at = NOW(),
        updated_at = NOW()
      WHERE id = ${referralData.id}
    `;

    // Crear evento
    await sql`
      INSERT INTO referral_events (
        referral_id,
        referrer_tenant_id,
        referred_tenant_id,
        event_type,
        plan_type,
        message
      ) VALUES (
        ${referralData.id},
        ${referrerTenantId},
        ${tenantId},
        ${isFirstPayment ? 'first_payment' : 'month_paid'},
        ${planType},
        ${isFirstPayment ? 'Primer pago realizado' : 'Mes completo pagado'}
      )
    `;

    // Obtener información del referente y referido para emails
    const referrerInfo = await sql`
      SELECT email, name 
      FROM tenants 
      WHERE id = ${referrerTenantId}
      LIMIT 1
    `;

    const referredInfo = await sql`
      SELECT name 
      FROM tenants 
      WHERE id = ${tenantId}
      LIMIT 1
    `;

    // Si es el primer pago y activó un plan, enviar email
    if (isFirstPayment && (planType === 'checkin' || planType === 'pro')) {
      if (referrerInfo.rows[0] && referredInfo.rows[0]) {
        try {
          await sendReferralActivatedPlanEmail(
            referrerInfo.rows[0].email,
            referrerInfo.rows[0].name || 'Propietario',
            referredInfo.rows[0].name || 'Nuevo usuario',
            planType as 'checkin' | 'pro'
          );
        } catch (emailError) {
          console.warn('Error enviando email de referido activado:', emailError);
        }
      }
    }

    // Recalcular recompensas para el referente
    // IMPORTANTE: Solo recalcular si el referido ha completado al menos 1 mes de pago
    // Por ahora, lo hacemos después del primer pago (esto se ajustará con el delay)
    if (newMonthsPaid >= 1) {
      try {
        await recalculateRewards(referrerTenantId);
      } catch (rewardsError) {
        console.warn('Error recalculando recompensas:', rewardsError);
      }
    }
  } catch (error) {
    console.error('Error manejando pago exitoso de referido:', error);
    // No lanzar error, solo loguear
  }
}

/**
 * Maneja cuando un referido tiene un pago fallido
 */
export async function handleReferralPaymentFailed(
  tenantId: string
): Promise<void> {
  try {
    // Buscar si este tenant es un referido
    const referral = await sql`
      SELECT 
        id,
        referrer_tenant_id,
        status
      FROM referrals
      WHERE referred_tenant_id = ${tenantId}
      LIMIT 1
    `;

    if (referral.rows.length === 0) {
      return;
    }

    const referralData = referral.rows[0];
    const referrerTenantId = referralData.referrer_tenant_id;

    // Actualizar estado a 'past_due'
    await sql`
      UPDATE referrals
      SET 
        status = 'past_due',
        updated_at = NOW()
      WHERE id = ${referralData.id}
    `;

    // Crear evento
    await sql`
      INSERT INTO referral_events (
        referral_id,
        referrer_tenant_id,
        referred_tenant_id,
        event_type,
        message
      ) VALUES (
        ${referralData.id},
        ${referrerTenantId},
        ${tenantId},
        'payment_failed',
        'Pago fallido - las recompensas asociadas pueden ser revocadas'
      )
    `;

    // Obtener información para email
    const referrerInfo = await sql`
      SELECT email, name 
      FROM tenants 
      WHERE id = ${referrerTenantId}
      LIMIT 1
    `;

    const referredInfo = await sql`
      SELECT name 
      FROM tenants 
      WHERE id = ${tenantId}
      LIMIT 1
    `;

    // Enviar email al referente
    if (referrerInfo.rows[0] && referredInfo.rows[0]) {
      try {
        await sendReferralStatusChangedEmail(
          referrerInfo.rows[0].email,
          referrerInfo.rows[0].name || 'Propietario',
          referredInfo.rows[0].name || 'Nuevo usuario',
          'past_due',
          'Tu referido tuvo un pago fallido. Si el pago falla de forma permanente, las recompensas asociadas pueden ser revocadas.'
        );
      } catch (emailError) {
        console.warn('Error enviando email de pago fallido:', emailError);
      }
    }
  } catch (error) {
    console.error('Error manejando pago fallido de referido:', error);
  }
}

/**
 * Maneja cuando un referido cancela su suscripción
 */
export async function handleReferralCancelled(
  tenantId: string
): Promise<void> {
  try {
    // Buscar si este tenant es un referido
    const referral = await sql`
      SELECT 
        id,
        referrer_tenant_id,
        status
      FROM referrals
      WHERE referred_tenant_id = ${tenantId}
      LIMIT 1
    `;

    if (referral.rows.length === 0) {
      return;
    }

    const referralData = referral.rows[0];
    const referrerTenantId = referralData.referrer_tenant_id;

    // Actualizar estado a 'cancelled'
    await sql`
      UPDATE referrals
      SET 
        status = 'cancelled',
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE id = ${referralData.id}
    `;

    // Crear evento
    await sql`
      INSERT INTO referral_events (
        referral_id,
        referrer_tenant_id,
        referred_tenant_id,
        event_type,
        message
      ) VALUES (
        ${referralData.id},
        ${referrerTenantId},
        ${tenantId},
        'cancelled',
        'Referido canceló su suscripción - las recompensas asociadas pueden ser revocadas'
      )
    `;

    // Revocar recompensas pendientes asociadas a este referido
    await sql`
      UPDATE referral_rewards
      SET 
        status = 'revoked',
        revoked_at = NOW(),
        updated_at = NOW()
      WHERE referrer_tenant_id = ${referrerTenantId}
        AND ${referralData.id} = ANY(contributing_referrals)
        AND status = 'pending'
    `;

    // Recalcular créditos acumulados (puede que haya que restar créditos ya otorgados)
    // Por ahora solo revocamos las pendientes, los ya aplicados se quedan

    // Obtener información para email
    const referrerInfo = await sql`
      SELECT email, name 
      FROM tenants 
      WHERE id = ${referrerTenantId}
      LIMIT 1
    `;

    const referredInfo = await sql`
      SELECT name 
      FROM tenants 
      WHERE id = ${tenantId}
      LIMIT 1
    `;

    // Enviar email al referente
    if (referrerInfo.rows[0] && referredInfo.rows[0]) {
      try {
        await sendReferralStatusChangedEmail(
          referrerInfo.rows[0].email,
          referrerInfo.rows[0].name || 'Propietario',
          referredInfo.rows[0].name || 'Nuevo usuario',
          'cancelled',
          'Tu referido canceló su suscripción. Para mantener tus recompensas, necesitas seguir trayendo nuevos propietarios a Delfín Check-in.'
        );
      } catch (emailError) {
        console.warn('Error enviando email de cancelación:', emailError);
      }
    }

    // Recalcular recompensas (puede que haya perdido alguna)
    try {
      await recalculateRewards(referrerTenantId);
    } catch (rewardsError) {
      console.warn('Error recalculando recompensas después de cancelación:', rewardsError);
    }
  } catch (error) {
    console.error('Error manejando cancelación de referido:', error);
  }
}

/**
 * Maneja cuando un referido actualiza su plan
 */
export async function handleReferralPlanUpdated(
  tenantId: string,
  newPlanType: 'free' | 'checkin' | 'pro'
): Promise<void> {
  try {
    // Buscar si este tenant es un referido
    const referral = await sql`
      SELECT 
        id,
        referrer_tenant_id,
        status,
        referred_plan_type
      FROM referrals
      WHERE referred_tenant_id = ${tenantId}
      LIMIT 1
    `;

    if (referral.rows.length === 0) {
      return;
    }

    const referralData = referral.rows[0];
    const previousPlanType = referralData.referred_plan_type || 'free';

    // Si el plan no cambió, no hacer nada
    if (previousPlanType === newPlanType) {
      return;
    }

    // Actualizar estado según el nuevo plan
    let newStatus = 'registered';
    if (newPlanType === 'checkin') {
      newStatus = 'active_checkin';
    } else if (newPlanType === 'pro') {
      newStatus = 'active_pro';
    }

    // Actualizar referido
    await sql`
      UPDATE referrals
      SET 
        status = ${newStatus},
        referred_plan_type = ${newPlanType},
        updated_at = NOW()
      WHERE id = ${referralData.id}
    `;

    // Crear evento de cambio de plan
    await sql`
      INSERT INTO referral_plan_history (
        referral_id,
        referred_tenant_id,
        previous_plan,
        new_plan,
        reason
      ) VALUES (
        ${referralData.id},
        ${tenantId},
        ${previousPlanType},
        ${newPlanType},
        'Plan actualizado desde Stripe'
      )
    `;

    // Crear evento
    await sql`
      INSERT INTO referral_events (
        referral_id,
        referrer_tenant_id,
        referred_tenant_id,
        event_type,
        plan_type,
        message
      ) VALUES (
        ${referralData.id},
        ${referralData.referrer_tenant_id},
        ${tenantId},
        'plan_activated',
        ${newPlanType},
        ${`Plan actualizado de ${previousPlanType} a ${newPlanType}`}
      )
    `;

    // Si activó un plan de pago (Check-in o Pro), enviar email y recalcular
    if ((newPlanType === 'checkin' || newPlanType === 'pro') && previousPlanType === 'free') {
      const referrerInfo = await sql`
        SELECT email, name 
        FROM tenants 
        WHERE id = ${referralData.referrer_tenant_id}
        LIMIT 1
      `;

      const referredInfo = await sql`
        SELECT name 
        FROM tenants 
        WHERE id = ${tenantId}
        LIMIT 1
      `;

      if (referrerInfo.rows[0] && referredInfo.rows[0]) {
        try {
          await sendReferralActivatedPlanEmail(
            referrerInfo.rows[0].email,
            referrerInfo.rows[0].name || 'Propietario',
            referredInfo.rows[0].name || 'Nuevo usuario',
            newPlanType as 'checkin' | 'pro'
          );
        } catch (emailError) {
          console.warn('Error enviando email de plan activado:', emailError);
        }
      }

      // Recalcular recompensas
      try {
        await recalculateRewards(referralData.referrer_tenant_id);
      } catch (rewardsError) {
        console.warn('Error recalculando recompensas:', rewardsError);
      }
    }
  } catch (error) {
    console.error('Error manejando actualización de plan de referido:', error);
  }
}
