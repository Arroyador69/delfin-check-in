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

    // Top tenants por reservas este mes
    const topTenantsByReservations = await sql`
      SELECT 
        t.id,
        t.name,
        t.status,
        COUNT(dr.id) as reservation_count,
        COALESCE(SUM(dr.subtotal), 0) as revenue
      FROM tenants t
      LEFT JOIN direct_reservations dr ON dr.tenant_id = t.id 
        AND dr.created_at >= date_trunc('month', CURRENT_DATE)
      WHERE t.status IN ('active', 'trial')
      GROUP BY t.id, t.name, t.status
      ORDER BY reservation_count DESC, revenue DESC
      LIMIT 10
    `

    // Crecimiento de tenants (últimos 12 meses)
    const tenantGrowth = await sql`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_tenants
      FROM tenants
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `

    // Reservas por mes (últimos 12 meses)
    const reservationsGrowth = await sql`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as reservation_count,
        COALESCE(SUM(subtotal), 0) as revenue
      FROM direct_reservations
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `

    // Total de reservas directas
    const directReservationsCount = await sql`
      SELECT COUNT(*) as total
      FROM direct_reservations
    `

    // Reservas directas este mes
    const directReservationsThisMonth = await sql`
      SELECT COUNT(*) as total
      FROM direct_reservations
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    `

    return NextResponse.json({
      totalTenants: parseInt(stats.total_tenants || '0'),
      activeTenants: parseInt(stats.active_tenants || '0'),
      trialTenants: parseInt(stats.trial_tenants || '0'),
      totalReservations: parseInt(stats.total_reservations || '0'),
      reservationsThisMonth: parseInt(stats.reservations_this_month || '0'),
      totalCommissions,
      commissionsThisMonth,
      averageReservationValue: parseFloat(stats.average_value || '0'),
      // Nuevas métricas
      topTenantsByReservations: topTenantsByReservations.rows.map(row => ({
        tenantId: row.id,
        tenantName: row.name,
        status: row.status,
        reservationCount: parseInt(row.reservation_count || '0'),
        revenue: parseFloat(row.revenue || '0')
      })),
      tenantGrowth: tenantGrowth.rows.map(row => ({
        month: row.month.toISOString().split('T')[0],
        newTenants: parseInt(row.new_tenants || '0')
      })),
      reservationsGrowth: reservationsGrowth.rows.map(row => ({
        month: row.month.toISOString().split('T')[0],
        reservationCount: parseInt(row.reservation_count || '0'),
        revenue: parseFloat(row.revenue || '0')
      })),
      directReservationsCount: parseInt(directReservationsCount.rows[0]?.total || '0'),
      directReservationsThisMonth: parseInt(directReservationsThisMonth.rows[0]?.total || '0')
    })

  } catch (error) {
    console.error('❌ Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

