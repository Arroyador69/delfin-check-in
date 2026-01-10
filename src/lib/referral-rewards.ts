/**
 * Sistema de recompensas automático para referidos
 * Calcula y otorga créditos según las reglas establecidas
 */

import { sql } from '@/lib/db';

export interface RewardRule {
  id: string;
  name: string;
  description: string;
  condition: (stats: ReferralStats) => boolean;
  reward: {
    type: 'checkin_month' | 'pro_month' | 'pro_2months';
    months: number;
  };
}

export interface ReferralStats {
  totalRegistered: number;
  activeCheckin: number;
  activePro: number;
  paidReferrals: number;
}

/**
 * Reglas de recompensas según los requisitos:
 * 1. 5 referidos registrados (cualquier plan) → 1 mes Check-in
 * 2. 1 referido que paga Check-in → 1 mes Check-in
 * 3. 3 referidos ACTIVOS en Check-in → 1 mes Pro
 * 4. 5 referidos ACTIVOS en Pro → 2 meses Pro
 */
export const REWARD_RULES: RewardRule[] = [
  {
    id: '5_registered',
    name: '5 Referidos Registrados',
    description: 'Trae 5 referidos registrados (cualquier plan) y consigue 1 mes gratis de Plan Check-in',
    condition: (stats) => stats.totalRegistered >= 5,
    reward: {
      type: 'checkin_month',
      months: 1,
    },
  },
  {
    id: '1_checkin_paid',
    name: '1 Referido que Paga Check-in',
    description: 'Cuando un referido paga Plan Check-in, consigues 1 mes gratis de Plan Check-in',
    condition: (stats) => stats.activeCheckin >= 1 && stats.paidReferrals >= 1,
    reward: {
      type: 'checkin_month',
      months: 1,
    },
  },
  {
    id: '3_active_checkin',
    name: '3 Referidos Activos en Check-in',
    description: 'Con 3 referidos activos en Plan Check-in, consigues 1 mes gratis de Plan Pro',
    condition: (stats) => stats.activeCheckin >= 3,
    reward: {
      type: 'pro_month',
      months: 1,
    },
  },
  {
    id: '5_active_pro',
    name: '5 Referidos Activos en Pro',
    description: 'Con 5 referidos activos en Plan Pro, consigues 2 meses gratis de Plan Pro',
    condition: (stats) => stats.activePro >= 5,
    reward: {
      type: 'pro_2months',
      months: 2,
    },
  },
];

/**
 * Obtiene estadísticas actualizadas de referidos para un tenant
 */
export async function getReferralStatsForRewards(tenantId: string): Promise<ReferralStats> {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE status IN ('registered', 'active_checkin', 'active_pro')) as total_registered,
        COUNT(*) FILTER (WHERE status = 'active_checkin' AND months_paid_completed >= 1) as active_checkin,
        COUNT(*) FILTER (WHERE status = 'active_pro' AND months_paid_completed >= 1) as active_pro,
        COUNT(*) FILTER (WHERE months_paid_completed >= 1) as paid_referrals
      FROM referrals
      WHERE referrer_tenant_id = ${tenantId}
    `;

    const row = result.rows[0];

    return {
      totalRegistered: parseInt(row.total_registered || '0'),
      activeCheckin: parseInt(row.active_checkin || '0'),
      activePro: parseInt(row.active_pro || '0'),
      paidReferrals: parseInt(row.paid_referrals || '0'),
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas de referidos:', error);
    return {
      totalRegistered: 0,
      activeCheckin: 0,
      activePro: 0,
      paidReferrals: 0,
    };
  }
}

/**
 * Verifica qué recompensas deben otorgarse
 */
export async function checkEligibleRewards(tenantId: string): Promise<RewardRule[]> {
  const stats = await getReferralStatsForRewards(tenantId);
  
  return REWARD_RULES.filter(rule => {
    // Verificar si la condición se cumple
    return rule.condition(stats);
  });
}

/**
 * Verifica si una recompensa ya fue otorgada recientemente
 */
export async function hasRecentReward(
  tenantId: string,
  rewardType: string,
  reason: string
): Promise<boolean> {
  try {
    const result = await sql`
      SELECT id
      FROM referral_rewards
      WHERE referrer_tenant_id = ${tenantId}
        AND reward_type = ${rewardType}
        AND reason = ${reason}
        AND status != 'revoked'
        AND created_at > NOW() - INTERVAL '30 days'
      LIMIT 1
    `;

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verificando recompensa reciente:', error);
    return false;
  }
}

/**
 * Otorga una recompensa a un tenant
 */
export async function grantReward(
  tenantId: string,
  rewardRule: RewardRule,
  contributingReferralIds: string[]
): Promise<{ success: boolean; rewardId?: string; error?: string }> {
  try {
    // Verificar si ya tiene esta recompensa reciente
    const hasRecent = await hasRecentReward(tenantId, rewardRule.reward.type, rewardRule.description);
    
    if (hasRecent) {
      return {
        success: false,
        error: 'Esta recompensa ya fue otorgada recientemente',
      };
    }

    // Crear registro de recompensa
    const result = await sql`
      INSERT INTO referral_rewards (
        referrer_tenant_id,
        referral_id,
        reward_type,
        reason,
        months_granted,
        contributing_referrals,
        status
      ) VALUES (
        ${tenantId},
        NULL, -- Se llena después si es necesario
        ${rewardRule.reward.type},
        ${rewardRule.description},
        ${rewardRule.reward.months},
        ${contributingReferralIds}::UUID[],
        'pending'
      ) RETURNING id
    `;

    const rewardId = result.rows[0].id;

    // Aplicar créditos según el tipo de recompensa
    if (rewardRule.reward.type === 'checkin_month') {
      await sql`
        UPDATE tenants
        SET checkin_credits_months = checkin_credits_months + ${rewardRule.reward.months}
        WHERE id = ${tenantId}
      `;
    } else if (rewardRule.reward.type === 'pro_month' || rewardRule.reward.type === 'pro_2months') {
      await sql`
        UPDATE tenants
        SET pro_credits_months = pro_credits_months + ${rewardRule.reward.months}
        WHERE id = ${tenantId}
      `;
    }

    // Actualizar estado de la recompensa a 'applied'
    await sql`
      UPDATE referral_rewards
      SET status = 'applied', applied_at = NOW()
      WHERE id = ${rewardId}
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
        NULL,
        'reward_granted',
        ${JSON.stringify({ rewardId, rewardType: rewardRule.reward.type, months: rewardRule.reward.months })}::jsonb,
        ${`Recompensa otorgada: ${rewardRule.description}`}
      )
    `;

    return {
      success: true,
      rewardId,
    };
  } catch (error: any) {
    console.error('Error otorgando recompensa:', error);
    return {
      success: false,
      error: error.message || 'Error interno del servidor',
    };
  }
}

/**
 * Recalcula y otorga recompensas para un tenant
 * Esta función se llama cuando cambia el estado de un referido
 */
export async function recalculateRewards(tenantId: string): Promise<{
  granted: string[];
  errors: string[];
}> {
  const granted: string[] = [];
  const errors: string[] = [];

  try {
    // Obtener recompensas elegibles
    const eligibleRewards = await checkEligibleRewards(tenantId);

    // Obtener referidos que contribuyen a las recompensas
    const referrals = await sql`
      SELECT id
      FROM referrals
      WHERE referrer_tenant_id = ${tenantId}
        AND status IN ('registered', 'active_checkin', 'active_pro')
        AND months_paid_completed >= 0
    `;

    const contributingIds = referrals.rows.map(r => r.id);

    // Intentar otorgar cada recompensa elegible
    for (const reward of eligibleRewards) {
      try {
        const result = await grantReward(tenantId, reward, contributingIds);
        
        if (result.success) {
          granted.push(reward.name);
        } else {
          // Si ya existe, no es un error, solo skip
          if (!result.error?.includes('recientemente')) {
            errors.push(`${reward.name}: ${result.error}`);
          }
        }
      } catch (error: any) {
        errors.push(`${reward.name}: ${error.message}`);
      }
    }

    return { granted, errors };
  } catch (error: any) {
    console.error('Error recalculando recompensas:', error);
    errors.push(`Error general: ${error.message}`);
    return { granted, errors };
  }
}

/**
 * Obtiene los referidos que contribuyen a una recompensa específica
 */
export async function getContributingReferrals(
  tenantId: string,
  rewardRule: RewardRule
): Promise<string[]> {
  try {
    let query;

    switch (rewardRule.id) {
      case '5_registered':
        // Los primeros 5 referidos registrados
        query = sql`
          SELECT id
          FROM referrals
          WHERE referrer_tenant_id = ${tenantId}
            AND status IN ('registered', 'active_checkin', 'active_pro')
          ORDER BY created_at ASC
          LIMIT 5
        `;
        break;

      case '1_checkin_paid':
        // El primer referido que pagó Check-in
        query = sql`
          SELECT id
          FROM referrals
          WHERE referrer_tenant_id = ${tenantId}
            AND status = 'active_checkin'
            AND months_paid_completed >= 1
          ORDER BY first_paid_at ASC
          LIMIT 1
        `;
        break;

      case '3_active_checkin':
        // Los 3 primeros referidos activos en Check-in
        query = sql`
          SELECT id
          FROM referrals
          WHERE referrer_tenant_id = ${tenantId}
            AND status = 'active_checkin'
            AND months_paid_completed >= 1
          ORDER BY first_paid_at ASC
          LIMIT 3
        `;
        break;

      case '5_active_pro':
        // Los 5 primeros referidos activos en Pro
        query = sql`
          SELECT id
          FROM referrals
          WHERE referrer_tenant_id = ${tenantId}
            AND status = 'active_pro'
            AND months_paid_completed >= 1
          ORDER BY first_paid_at ASC
          LIMIT 5
        `;
        break;

      default:
        return [];
    }

    const result = await query;
    return result.rows.map(r => r.id);
  } catch (error) {
    console.error('Error obteniendo referidos contribuyentes:', error);
    return [];
  }
}
