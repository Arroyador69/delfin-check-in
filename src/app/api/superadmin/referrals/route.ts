import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

/**
 * GET /api/superadmin/referrals
 * Obtiene todos los referidos del sistema de referidos de propietarios
 */
export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = verifyToken(authToken)
    if (!payload || !payload.isPlatformAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const referrerTenantId = url.searchParams.get('referrer_tenant_id')

    // Obtener estadísticas globales
    const globalStats = await sql`
      SELECT 
        COUNT(*) as total_referrals,
        COUNT(*) FILTER (WHERE status = 'registered') as registered_count,
        COUNT(*) FILTER (WHERE status = 'active_checkin') as active_checkin_count,
        COUNT(*) FILTER (WHERE status = 'active_pro') as active_pro_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) FILTER (WHERE months_paid_completed >= 1) as paid_count,
        COUNT(DISTINCT referrer_tenant_id) as total_referrers
      FROM referrals
    `

    // Obtener referidos con información de tenants
    let text = `
      SELECT 
        r.id,
        r.referrer_tenant_id,
        r.referred_tenant_id,
        r.referral_level,
        r.referral_code_used,
        r.status,
        r.referred_plan_type,
        r.registered_at,
        r.first_paid_at,
        r.last_paid_at,
        r.cancelled_at,
        r.months_paid_completed,
        r.created_at,
        r.updated_at,
        t1.name as referrer_name,
        t1.email as referrer_email,
        t1.referral_code as referrer_code,
        t2.name as referred_name,
        t2.email as referred_email,
        t2.plan_type as referred_current_plan
      FROM referrals r
      LEFT JOIN tenants t1 ON t1.id = r.referrer_tenant_id
      LEFT JOIN tenants t2 ON t2.id = r.referred_tenant_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      params.push(status);
      text += ` AND r.status = $${params.length}`;
    }

    if (referrerTenantId) {
      params.push(referrerTenantId);
      text += ` AND r.referrer_tenant_id = $${params.length}::uuid`;
    }

    text += ` ORDER BY r.created_at DESC LIMIT 500`;

    const referrals = await (sql as any).query(text, params)

    // Obtener estadísticas de recompensas
    const rewardsStats = await sql`
      SELECT 
        COUNT(*) as total_rewards,
        COUNT(*) FILTER (WHERE status = 'applied') as applied_count,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'revoked') as revoked_count,
        SUM(months_granted) FILTER (WHERE reward_type = 'checkin_month') as total_checkin_months,
        SUM(months_granted) FILTER (WHERE reward_type IN ('pro_month', 'pro_2months')) as total_pro_months
      FROM referral_rewards
    `

    // Obtener top referrers
    const topReferrers = await sql`
      SELECT 
        r.referrer_tenant_id,
        t.name as referrer_name,
        t.email as referrer_email,
        COUNT(*) as total_referrals,
        COUNT(*) FILTER (WHERE r.status IN ('active_checkin', 'active_pro')) as active_referrals,
        COUNT(*) FILTER (WHERE r.months_paid_completed >= 1) as paid_referrals
      FROM referrals r
      LEFT JOIN tenants t ON t.id = r.referrer_tenant_id
      GROUP BY r.referrer_tenant_id, t.name, t.email
      ORDER BY total_referrals DESC
      LIMIT 10
    `

    return NextResponse.json({
      success: true,
      globalStats: {
        totalReferrals: parseInt(globalStats.rows[0]?.total_referrals || '0'),
        registeredCount: parseInt(globalStats.rows[0]?.registered_count || '0'),
        activeCheckinCount: parseInt(globalStats.rows[0]?.active_checkin_count || '0'),
        activeProCount: parseInt(globalStats.rows[0]?.active_pro_count || '0'),
        cancelledCount: parseInt(globalStats.rows[0]?.cancelled_count || '0'),
        paidCount: parseInt(globalStats.rows[0]?.paid_count || '0'),
        totalReferrers: parseInt(globalStats.rows[0]?.total_referrers || '0'),
      },
      rewardsStats: {
        totalRewards: parseInt(rewardsStats.rows[0]?.total_rewards || '0'),
        appliedCount: parseInt(rewardsStats.rows[0]?.applied_count || '0'),
        pendingCount: parseInt(rewardsStats.rows[0]?.pending_count || '0'),
        revokedCount: parseInt(rewardsStats.rows[0]?.revoked_count || '0'),
        totalCheckinMonths: parseInt(rewardsStats.rows[0]?.total_checkin_months || '0'),
        totalProMonths: parseInt(rewardsStats.rows[0]?.total_pro_months || '0'),
      },
      topReferrers: topReferrers.rows.map((r: any) => ({
        referrerTenantId: r.referrer_tenant_id,
        referrerName: r.referrer_name,
        referrerEmail: r.referrer_email,
        totalReferrals: parseInt(r.total_referrals || '0'),
        activeReferrals: parseInt(r.active_referrals || '0'),
        paidReferrals: parseInt(r.paid_referrals || '0'),
      })),
      referrals: referrals.rows.map((r: any) => ({
        id: r.id,
        referrerTenantId: r.referrer_tenant_id,
        referrerName: r.referrer_name,
        referrerEmail: r.referrer_email,
        referrerCode: r.referrer_code,
        referredTenantId: r.referred_tenant_id,
        referredName: r.referred_name,
        referredEmail: r.referred_email,
        referredCurrentPlan: r.referred_current_plan,
        referralLevel: parseInt(r.referral_level || '1'),
        referralCodeUsed: r.referral_code_used,
        status: r.status,
        referredPlanType: r.referred_plan_type,
        registeredAt: r.registered_at,
        firstPaidAt: r.first_paid_at,
        lastPaidAt: r.last_paid_at,
        cancelledAt: r.cancelled_at,
        monthsPaidCompleted: parseInt(r.months_paid_completed || '0'),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
    })

  } catch (error) {
    console.error('❌ Error fetching referrals:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
