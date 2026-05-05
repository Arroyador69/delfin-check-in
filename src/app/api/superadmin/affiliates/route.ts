import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner'

/**
 * GET /api/superadmin/affiliates
 * Obtiene todos los afiliados del portal de afiliados
 */
export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = verifyToken(authToken)
    if (!isEffectiveSuperAdminPayload(payload)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Obtener estadísticas globales
    const globalStats = await sql`
      SELECT 
        COUNT(*) as total_affiliates,
        COUNT(*) FILTER (WHERE status = 'active') as active_affiliates,
        COUNT(*) FILTER (WHERE status = 'suspended') as suspended_affiliates,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_affiliates
      FROM affiliates
    `

    // Obtener todos los afiliados con estadísticas
    const affiliates = await sql`
      SELECT 
        a.id,
        a.email,
        a.full_name,
        a.name, -- Para compatibilidad con tabla antigua
        a.company_name,
        a.phone,
        a.status,
        a.referral_code,
        a.commission_rate,
        a.email_verified,
        a.created_at,
        a.updated_at,
        a.last_login_at,
        COUNT(DISTINCT ac.id) as total_clicks,
        COUNT(DISTINCT acust.id) as total_customers,
        COUNT(DISTINCT acust.id) FILTER (WHERE acust.status = 'active') as active_customers,
        COUNT(DISTINCT acust.id) FILTER (WHERE acust.status = 'registered') as registered_customers,
        COUNT(DISTINCT acust.id) FILTER (WHERE acust.status = 'cancelled') as cancelled_customers,
        COALESCE(SUM(acomm.commission_amount) FILTER (WHERE acomm.status = 'pending'), 0) as pending_commissions,
        COALESCE(SUM(acomm.commission_amount) FILTER (WHERE acomm.status = 'paid'), 0) as paid_commissions,
        COALESCE(SUM(acomm.commission_amount) FILTER (WHERE acomm.status = 'paid'), 0) as total_earnings
      FROM affiliates a
      LEFT JOIN affiliate_clicks ac ON ac.affiliate_id = a.id
      LEFT JOIN affiliate_customers acust ON acust.affiliate_id = a.id
      LEFT JOIN affiliate_commissions acomm ON acomm.affiliate_id = a.id
      GROUP BY a.id, a.email, a.full_name, a.name, a.company_name, a.phone, a.status, 
               a.referral_code, a.commission_rate, a.email_verified, 
               a.created_at, a.updated_at, a.last_login_at
      ORDER BY a.created_at DESC
    `

    return NextResponse.json({
      success: true,
      globalStats: {
        totalAffiliates: parseInt(globalStats.rows[0]?.total_affiliates || '0'),
        activeAffiliates: parseInt(globalStats.rows[0]?.active_affiliates || '0'),
        suspendedAffiliates: parseInt(globalStats.rows[0]?.suspended_affiliates || '0'),
        inactiveAffiliates: parseInt(globalStats.rows[0]?.inactive_affiliates || '0'),
      },
      affiliates: affiliates.rows.map((a: any) => ({
        id: a.id,
        email: a.email,
        fullName: a.full_name || a.name || '',
        companyName: a.company_name,
        phone: a.phone,
        status: a.status,
        referralCode: a.referral_code,
        commissionRate: parseFloat(a.commission_rate || '0.30'),
        emailVerified: a.email_verified || false,
        totalClicks: parseInt(a.total_clicks || '0'),
        totalCustomers: parseInt(a.total_customers || '0'),
        activeCustomers: parseInt(a.active_customers || '0'),
        registeredCustomers: parseInt(a.registered_customers || '0'),
        cancelledCustomers: parseInt(a.cancelled_customers || '0'),
        pendingCommissions: parseFloat(a.pending_commissions || '0'),
        paidCommissions: parseFloat(a.paid_commissions || '0'),
        totalEarnings: parseFloat(a.total_earnings || '0'),
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        lastLoginAt: a.last_login_at,
      }))
    })

  } catch (error) {
    console.error('❌ Error fetching affiliates:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
