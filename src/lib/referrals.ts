/**
 * Funciones de utilidad para el sistema de referidos
 */

import { sql } from '@/lib/db';

export interface ReferralData {
  referrerTenantId: string;
  referredTenantId: string;
  referralLevel: number;
  referralCodeUsed: string;
  referredPlanType: 'free' | 'checkin' | 'standard' | 'pro';
}

/**
 * Obtiene el tenant_id desde una cookie de referido
 */
export async function getReferrerFromCookie(cookieData: { code: string; cookieId: string }): Promise<string | null> {
  try {
    const result = await sql`
      SELECT id 
      FROM tenants 
      WHERE referral_code = ${cookieData.code}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0].id;
  } catch (error) {
    console.error('Error obteniendo referrer desde cookie:', error);
    return null;
  }
}

/**
 * Genera un código único de referido para un tenant
 */
export async function generateReferralCodeForTenant(tenantId: string): Promise<string> {
  try {
    // Verificar si ya tiene un código
    const existing = await sql`
      SELECT referral_code 
      FROM tenants 
      WHERE id = ${tenantId} AND referral_code IS NOT NULL
      LIMIT 1
    `;

    if (existing.rows.length > 0 && existing.rows[0].referral_code) {
      return existing.rows[0].referral_code;
    }

    // Generar nuevo código
    let attempts = 0;
    let newCode: string;

    do {
      // Generar código: REF_ seguido de 4 dígitos aleatorios
      const randomDigits = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      newCode = `REF_${randomDigits}`;

      // Verificar si ya existe
      const check = await sql`
        SELECT id 
        FROM tenants 
        WHERE referral_code = ${newCode}
        LIMIT 1
      `;

      if (check.rows.length === 0) {
        break; // Código único encontrado
      }

      attempts++;
      if (attempts > 100) {
        throw new Error('No se pudo generar un código único después de 100 intentos');
      }
    } while (true);

    // Guardar el código en el tenant
    await sql`
      UPDATE tenants 
      SET referral_code = ${newCode}
      WHERE id = ${tenantId}
    `;

    return newCode;
  } catch (error) {
    console.error('Error generando código de referido:', error);
    throw error;
  }
}

/**
 * Obtiene el nivel de referido (1 = directo, 2 = referido de referido, etc.)
 */
export async function getReferralLevel(referredTenantId: string): Promise<number> {
  try {
    // Obtener quién refirió a este tenant
    const result = await sql`
      SELECT referred_by 
      FROM tenants 
      WHERE id = ${referredTenantId}
      LIMIT 1
    `;

    if (result.rows.length === 0 || !result.rows[0].referred_by) {
      return 1; // No fue referido, entonces es nivel 1
    }

    const referrerTenantId = result.rows[0].referred_by;

    // Obtener el nivel del referente y sumar 1
    const referrerLevel = await getReferralLevel(referrerTenantId);
    return referrerLevel + 1;
  } catch (error) {
    console.error('Error obteniendo nivel de referido:', error);
    return 1; // Default a nivel 1 en caso de error
  }
}

/**
 * Asocia un nuevo tenant con su referente
 */
export async function associateTenantWithReferrer(
  referredTenantId: string,
  referrerTenantId: string,
  referralCodeUsed: string,
  referredPlanType: 'free' | 'checkin' | 'standard' | 'pro' = 'free'
): Promise<{ success: boolean; referralId?: string; error?: string }> {
  try {
    // Verificar que el referente existe y tiene código de referido
    const referrer = await sql`
      SELECT id, referral_code 
      FROM tenants 
      WHERE id = ${referrerTenantId}
      LIMIT 1
    `;

    if (referrer.rows.length === 0) {
      return { success: false, error: 'Referente no encontrado' };
    }

    // Verificar que el referido no está ya asociado
    const existing = await sql`
      SELECT id 
      FROM referrals 
      WHERE referred_tenant_id = ${referredTenantId}
      LIMIT 1
    `;

    if (existing.rows.length > 0) {
      return { success: false, error: 'Este tenant ya está asociado a un referente' };
    }

    // Calcular nivel de referido
    const referralLevel = await getReferralLevel(referredTenantId);

    // Crear registro en la tabla referrals
    const result = await sql`
      INSERT INTO referrals (
        referrer_tenant_id,
        referred_tenant_id,
        referral_level,
        referral_code_used,
        status,
        referred_plan_type,
        registered_at
      ) VALUES (
        ${referrerTenantId},
        ${referredTenantId},
        ${referralLevel},
        ${referralCodeUsed},
        ${referredPlanType === 'free' ? 'registered' : (referredPlanType === 'checkin' || referredPlanType === 'standard') ? 'active_checkin' : 'active_pro'},
        ${referredPlanType},
        NOW()
      ) RETURNING id
    `;

    const referralId = result.rows[0].id;

    // Actualizar el campo referred_by en el tenant
    await sql`
      UPDATE tenants 
      SET referred_by = ${referrerTenantId}
      WHERE id = ${referredTenantId}
    `;

    // Generar código de referido para el nuevo tenant (para que pueda referir a otros)
    await generateReferralCodeForTenant(referredTenantId);

    // Crear evento de registro
    await sql`
      INSERT INTO referral_events (
        referral_id,
        referrer_tenant_id,
        referred_tenant_id,
        event_type,
        plan_type,
        message
      ) VALUES (
        ${referralId},
        ${referrerTenantId},
        ${referredTenantId},
        'registered',
        ${referredPlanType},
        'Nuevo referido registrado'
      )
    `;

    // Recalcular recompensas para el referente
    try {
      const { recalculateRewards } = await import('@/lib/referral-rewards');
      const { sendNewReferralEmail } = await import('@/lib/referral-emails');
      
      // Obtener información del referente y referido para el email
      const referrerInfo = await sql`
        SELECT email, name 
        FROM tenants 
        WHERE id = ${referrerTenantId}
        LIMIT 1
      `;
      
      const referredInfo = await sql`
        SELECT name 
        FROM tenants 
        WHERE id = ${referredTenantId}
        LIMIT 1
      `;

      // Recalcular recompensas (esto puede otorgar créditos)
      await recalculateRewards(referrerTenantId);

      // Enviar email al referente
      if (referrerInfo.rows[0] && referredInfo.rows[0]) {
        await sendNewReferralEmail(
          referrerInfo.rows[0].email,
          referrerInfo.rows[0].name || 'Propietario',
          referredInfo.rows[0].name || 'Nuevo usuario',
          referredPlanType
        );
      }
    } catch (error) {
      console.warn('Error recalculando recompensas o enviando email:', error);
      // No es crítico, continuar
    }

    return {
      success: true,
      referralId,
    };
  } catch (error: any) {
    console.error('Error asociando tenant con referente:', error);
    return {
      success: false,
      error: error.message || 'Error interno del servidor',
    };
  }
}

/**
 * Obtiene estadísticas de referidos para un tenant
 */
export async function getReferralStats(tenantId: string): Promise<{
  totalReferrals: number;
  registeredCount: number;
  activeCheckinCount: number;
  activeStandardCount: number;
  activeProCount: number;
  cancelledCount: number;
  paidReferralsCount: number;
}> {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_referrals,
        COUNT(*) FILTER (WHERE status = 'registered') as registered_count,
        COUNT(*) FILTER (WHERE referred_plan_type = 'checkin' AND months_paid_completed >= 1) as active_checkin_count,
        COUNT(*) FILTER (WHERE referred_plan_type = 'standard' AND months_paid_completed >= 1) as active_standard_count,
        COUNT(*) FILTER (WHERE referred_plan_type = 'pro' AND months_paid_completed >= 1) as active_pro_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) FILTER (WHERE months_paid_completed >= 1) as paid_referrals_count
      FROM referrals
      WHERE referrer_tenant_id = ${tenantId}
    `;

    const row = result.rows[0];

    return {
      totalReferrals: parseInt(row.total_referrals || '0'),
      registeredCount: parseInt(row.registered_count || '0'),
      activeCheckinCount: parseInt(row.active_checkin_count || '0'),
      activeStandardCount: parseInt(row.active_standard_count || '0'),
      activeProCount: parseInt(row.active_pro_count || '0'),
      cancelledCount: parseInt(row.cancelled_count || '0'),
      paidReferralsCount: parseInt(row.paid_referrals_count || '0'),
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de referidos:', error);
    return {
      totalReferrals: 0,
      registeredCount: 0,
      activeCheckinCount: 0,
      activeStandardCount: 0,
      activeProCount: 0,
      cancelledCount: 0,
      paidReferralsCount: 0,
    };
  }
}
