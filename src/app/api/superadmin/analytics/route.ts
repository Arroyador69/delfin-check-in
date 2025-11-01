import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

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
    
    if (!payload || !payload.isPlatformAdmin) {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      )
    }

    // Obtener estadísticas generales
    const statsResult = await sql`
      SELECT 
        COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('active', 'trial')) as total_tenants,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'active') as active_tenants,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'trial') as trial_tenants,
        COUNT(dr.id) as total_reservations,
        COUNT(dr.id) FILTER (WHERE dr.created_at >= date_trunc('month', CURRENT_DATE)) as reservations_this_month,
        COALESCE(SUM(dr.subtotal), 0) as total_revenue,
        COALESCE(SUM(dr.subtotal) FILTER (WHERE dr.created_at >= date_trunc('month', CURRENT_DATE)), 0) as revenue_this_month,
        COALESCE(AVG(dr.subtotal), 0) as average_value
      FROM tenants t
      LEFT JOIN direct_reservations dr ON dr.tenant_id = t.id
      WHERE t.status IN ('active', 'trial')
    `

    const stats = statsResult.rows[0] || {
      total_tenants: 0,
      active_tenants: 0,
      trial_tenants: 0,
      total_reservations: 0,
      reservations_this_month: 0,
      total_revenue: 0,
      revenue_this_month: 0,
      average_value: 0
    }

    // Calcular comisiones (9% del revenue)
    const totalCommissions = parseFloat(stats.total_revenue || '0') * 0.09
    const commissionsThisMonth = parseFloat(stats.revenue_this_month || '0') * 0.09

    return NextResponse.json({
      totalTenants: parseInt(stats.total_tenants || '0'),
      activeTenants: parseInt(stats.active_tenants || '0'),
      trialTenants: parseInt(stats.trial_tenants || '0'),
      totalReservations: parseInt(stats.total_reservations || '0'),
      reservationsThisMonth: parseInt(stats.reservations_this_month || '0'),
      totalCommissions,
      commissionsThisMonth,
      averageReservationValue: parseFloat(stats.average_value || '0')
    })

  } catch (error) {
    console.error('❌ Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

