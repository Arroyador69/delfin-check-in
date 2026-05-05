import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner'

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const authToken = req.cookies.get('auth_token')?.value
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar que sea superadmin
    const payload = verifyToken(authToken)
    
    if (!isEffectiveSuperAdminPayload(payload)) {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      )
    }

    // Obtener estadísticas
    const statsResult = await sql`
      SELECT 
        COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('active', 'trial')) as total_tenants,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'active') as active_tenants,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'trial') as trial_tenants,
        COALESCE(SUM(ct.net_amount), 0) as commissions_this_month
      FROM tenants t
      LEFT JOIN commission_transactions ct ON ct.tenant_id = t.id
        AND ct.created_at >= date_trunc('month', CURRENT_DATE)
        AND ct.status = 'completed'
    `

    const stats = statsResult.rows[0] || {
      total_tenants: 0,
      active_tenants: 0,
      trial_tenants: 0,
      commissions_this_month: 0
    }

    // Obtener total de reservas
    const reservationsResult = await sql`
      SELECT COUNT(*) as total_reservations
      FROM direct_reservations
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    `

    const totalReservations = parseInt(reservationsResult.rows[0]?.total_reservations || '0')

    return NextResponse.json({
      totalTenants: parseInt(stats.total_tenants || '0'),
      activeTenants: parseInt(stats.active_tenants || '0'),
      trialTenants: parseInt(stats.trial_tenants || '0'),
      totalReservations,
      commissionsThisMonth: parseFloat(stats.commissions_this_month || '0')
    })

  } catch (error) {
    console.error('❌ Error fetching superadmin stats:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

