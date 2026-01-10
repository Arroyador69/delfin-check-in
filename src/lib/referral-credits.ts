/**
 * Sistema de créditos acumulados para referidos
 * Aplica créditos antes del cobro de Stripe
 */

import { sql } from '@/lib/db';
import { sendCreditAppliedEmail } from './referral-emails';

/**
 * Obtiene los créditos acumulados de un tenant
 */
export async function getTenantCredits(tenantId: string): Promise<{
  checkinCredits: number;
  proCredits: number;
}> {
  try {
    const result = await sql`
      SELECT 
        COALESCE(checkin_credits_months, 0) as checkin_credits,
        COALESCE(pro_credits_months, 0) as pro_credits
      FROM tenants
      WHERE id = ${tenantId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return { checkinCredits: 0, proCredits: 0 };
    }

    return {
      checkinCredits: parseInt(result.rows[0].checkin_credits || '0'),
      proCredits: parseInt(result.rows[0].pro_credits || '0'),
    };
  } catch (error) {
    console.error('Error obteniendo créditos del tenant:', error);
    return { checkinCredits: 0, proCredits: 0 };
  }
}

/**
 * Aplica créditos antes del cobro de Stripe
 * Se debe llamar antes de que Stripe intente cobrar
 * 
 * Lógica:
 * - Si tiene Plan Pro y créditos Pro: aplicar Pro primero
 * - Si tiene Plan Check-in y créditos Check-in: aplicar Check-in
 * - Si tiene Plan Check-in pero tiene créditos Pro: no aplicar (solo Pro cuando hace upgrade)
 * - Si tiene Plan Free: no aplicar créditos
 */
export async function applyCreditsBeforePayment(tenantId: string): Promise<{
  applied: boolean;
  creditType?: 'checkin' | 'pro';
  monthsApplied?: number;
  error?: string;
}> {
  try {
    // Obtener información del tenant
    const tenantInfo = await sql`
      SELECT 
        id,
        plan_type,
        checkin_credits_months,
        pro_credits_months,
        email,
        name
      FROM tenants
      WHERE id = ${tenantId}
      LIMIT 1
    `;

    if (tenantInfo.rows.length === 0) {
      return { applied: false, error: 'Tenant no encontrado' };
    }

    const tenant = tenantInfo.rows[0];
    const planType = tenant.plan_type || 'free';
    const checkinCredits = parseInt(tenant.checkin_credits_months || '0');
    const proCredits = parseInt(tenant.pro_credits_months || '0');

    // Si está en Plan Free, no aplicar créditos
    if (planType === 'free') {
      return { applied: false };
    }

    // Si tiene Plan Pro y créditos Pro: aplicar Pro primero
    if (planType === 'pro' && proCredits > 0) {
      // Aplicar 1 mes de crédito Pro
      await sql`
        UPDATE tenants
        SET pro_credits_months = pro_credits_months - 1
        WHERE id = ${tenantId}
      `;

      // Crear evento
      await sql`
        INSERT INTO referral_events (
          referral_id,
          referrer_tenant_id,
          referred_tenant_id,
          event_type,
          event_data,
          message
        ) VALUES (
          NULL,
          ${tenantId},
          ${tenantId},
          'credit_applied',
          ${JSON.stringify({ creditType: 'pro', months: 1 })}::jsonb,
          'Crédito de Plan Pro aplicado (1 mes gratis)'
        )
      `;

      // Enviar email
      try {
        await sendCreditAppliedEmail(
          tenant.email,
          tenant.name || 'Propietario',
          'pro',
          1
        );
      } catch (emailError) {
        console.warn('Error enviando email de crédito aplicado:', emailError);
      }

      return {
        applied: true,
        creditType: 'pro',
        monthsApplied: 1,
      };
    }

    // Si tiene Plan Check-in y créditos Check-in: aplicar Check-in
    if (planType === 'checkin' && checkinCredits > 0) {
      // Aplicar 1 mes de crédito Check-in
      await sql`
        UPDATE tenants
        SET checkin_credits_months = checkin_credits_months - 1
        WHERE id = ${tenantId}
      `;

      // Crear evento
      await sql`
        INSERT INTO referral_events (
          referral_id,
          referrer_tenant_id,
          referred_tenant_id,
          event_type,
          event_data,
          message
        ) VALUES (
          NULL,
          ${tenantId},
          ${tenantId},
          'credit_applied',
          ${JSON.stringify({ creditType: 'checkin', months: 1 })}::jsonb,
          'Crédito de Plan Check-in aplicado (1 mes gratis)'
        )
      `;

      // Enviar email
      try {
        await sendCreditAppliedEmail(
          tenant.email,
          tenant.name || 'Propietario',
          'checkin',
          1
        );
      } catch (emailError) {
        console.warn('Error enviando email de crédito aplicado:', emailError);
      }

      return {
        applied: true,
        creditType: 'checkin',
        monthsApplied: 1,
      };
    }

    // Si tiene Plan Check-in pero tiene créditos Pro: no aplicar
    // (solo Pro cuando hace upgrade)
    if (planType === 'checkin' && proCredits > 0) {
      return { applied: false };
    }

    // No hay créditos para aplicar
    return { applied: false };
  } catch (error: any) {
    console.error('Error aplicando créditos:', error);
    return {
      applied: false,
      error: error.message || 'Error interno del servidor',
    };
  }
}

/**
 * Aplica créditos Pro cuando un tenant hace upgrade a Pro
 * Se debe llamar cuando un tenant hace upgrade de Check-in a Pro
 */
export async function applyProCreditsOnUpgrade(tenantId: string): Promise<{
  applied: boolean;
  monthsApplied?: number;
  error?: string;
}> {
  try {
    // Obtener créditos Pro del tenant
    const tenantInfo = await sql`
      SELECT 
        id,
        pro_credits_months,
        email,
        name
      FROM tenants
      WHERE id = ${tenantId}
      LIMIT 1
    `;

    if (tenantInfo.rows.length === 0) {
      return { applied: false, error: 'Tenant no encontrado' };
    }

    const tenant = tenantInfo.rows[0];
    const proCredits = parseInt(tenant.pro_credits_months || '0');

    // Si no tiene créditos Pro, no aplicar
    if (proCredits === 0) {
      return { applied: false };
    }

    // Aplicar 1 mes de crédito Pro
    await sql`
      UPDATE tenants
      SET pro_credits_months = pro_credits_months - 1
      WHERE id = ${tenantId}
    `;

    // Crear evento
    await sql`
      INSERT INTO referral_events (
        referral_id,
        referrer_tenant_id,
        referred_tenant_id,
        event_type,
        event_data,
        message
      ) VALUES (
        NULL,
        ${tenantId},
        ${tenantId},
        'credit_applied',
        ${JSON.stringify({ creditType: 'pro', months: 1, reason: 'upgrade' })}::jsonb,
        'Crédito de Plan Pro aplicado al hacer upgrade (1 mes gratis)'
      )
    `;

    // Enviar email
    try {
      await sendCreditAppliedEmail(
        tenant.email,
        tenant.name || 'Propietario',
        'pro',
        1
      );
    } catch (emailError) {
      console.warn('Error enviando email de crédito aplicado:', emailError);
    }

    return {
      applied: true,
      monthsApplied: 1,
    };
  } catch (error: any) {
    console.error('Error aplicando créditos Pro en upgrade:', error);
    return {
      applied: false,
      error: error.message || 'Error interno del servidor',
    };
  }
}

/**
 * Verifica si un tenant debe tener un cobro de Stripe este mes
 * (útil para decidir si aplicar créditos)
 */
export async function shouldChargeThisMonth(tenantId: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT 
        stripe_subscription_id,
        plan_type
      FROM tenants
      WHERE id = ${tenantId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return false;
    }

    const tenant = result.rows[0];
    
    // Si no tiene suscripción de Stripe, no hay cobro
    if (!tenant.stripe_subscription_id) {
      return false;
    }

    // Si está en Plan Free, no hay cobro
    if (tenant.plan_type === 'free') {
      return false;
    }

    // Si tiene suscripción activa, debería haber cobro
    return true;
  } catch (error) {
    console.error('Error verificando si debe cobrarse este mes:', error);
    return false;
  }
}
