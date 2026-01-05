import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

/**
 * GET /api/superadmin/referrals
 * Obtiene todos los referidos
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
    const affiliateId = url.searchParams.get('affiliate_id')

    let query = sql`
      SELECT 
        r.*,
        t1.name as referrer_name,
        t1.email as referrer_email,
        t2.name as referred_name,
        t2.email as referred_email,
        a.name as affiliate_name
      FROM referrals r
      LEFT JOIN tenants t1 ON t1.id = r.referrer_tenant_id
      LEFT JOIN tenants t2 ON t2.id = r.referred_tenant_id
      LEFT JOIN affiliates a ON a.id = r.affiliate_id
      WHERE 1=1
    `

    if (status) {
      query = sql`${query} AND r.status = ${status}`
    }

    if (affiliateId) {
      query = sql`${query} AND r.affiliate_id = ${affiliateId}`
    }

    query = sql`${query} ORDER BY r.created_at DESC`

    const referrals = await query

    return NextResponse.json({
      success: true,
      referrals: referrals.rows.map((r: any) => ({
        id: r.id,
        referrerTenantId: r.referrer_tenant_id,
        referrerName: r.referrer_name,
        referrerEmail: r.referrer_email,
        referredTenantId: r.referred_tenant_id,
        referredName: r.referred_name,
        referredEmail: r.referred_email,
        affiliateId: r.affiliate_id,
        affiliateName: r.affiliate_name,
        referralCode: r.referral_code,
        status: r.status,
        activatedAt: r.activated_at,
        convertedAt: r.converted_at,
        discountApplied: parseFloat(r.discount_applied || '0'),
        rewardApplied: parseFloat(r.reward_applied || '0'),
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }))
    })

  } catch (error) {
    console.error('❌ Error fetching referrals:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

