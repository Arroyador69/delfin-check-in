import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

type TableAvailability = Record<string, boolean>

/**
 * GET /api/superadmin/metrics
 * Obtiene todas las métricas principales del superadmin
 */
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

    const url = new URL(req.url)
    const period = url.searchParams.get('period') || 'month' // 'day', 'week', 'month', 'year'
    const startDate = getStartDate(period)
    const tableAvailability = await resolveTableAvailability()

    // 1. MÉTRICAS DE TRACCIÓN Y USO
    const tractionMetrics = await getTractionMetrics(startDate, tableAvailability)
    
    // 2. MÉTRICAS DE INGRESOS
    const revenueMetrics = await getRevenueMetrics(startDate, tableAvailability)
    
    // 3. MÉTRICAS DE RETENCIÓN Y CHURN
    const retentionMetrics = await getRetentionMetrics(startDate, tableAvailability)
    
    // 4. MÉTRICAS LEGALES
    const legalMetrics = await getLegalMetrics(startDate, tableAvailability)
    
    // 5. MÉTRICAS DE EMAIL
    const emailMetrics = await getEmailMetrics(startDate, tableAvailability)
    
    // 6. FUNNELS
    const funnelMetrics = await getFunnelMetrics(startDate, tableAvailability)

    return NextResponse.json({
      success: true,
      period,
      startDate: startDate.toISOString(),
      metrics: {
        traction: tractionMetrics,
        revenue: revenueMetrics,
        retention: retentionMetrics,
        legal: legalMetrics,
        email: emailMetrics,
        funnel: funnelMetrics
      }
    })

  } catch (error) {
    console.error('❌ Error fetching superadmin metrics:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

const REQUIRED_METRICS_TABLES = [
  'tenants',
  'user_activity',
  'tenant_properties',
  'guest_registrations',
  'xml_tracking',
  'subscription_events',
  'referrals',
  'affiliates',
  'email_tracking',
  'funnel_events',
] as const

async function tableExists(tableName: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT to_regclass(${`public.${tableName}`}) as reg
    `
    return Boolean(result.rows[0]?.reg)
  } catch {
    return false
  }
}

async function resolveTableAvailability(): Promise<TableAvailability> {
  const entries = await Promise.all(
    REQUIRED_METRICS_TABLES.map(async (name) => [name, await tableExists(name)] as const)
  )
  return Object.fromEntries(entries)
}

function hasAllTables(availability: TableAvailability, required: string[]): boolean {
  return required.every((t) => Boolean(availability[t]))
}

/**
 * Obtiene la fecha de inicio según el período
 */
function getStartDate(period: string): Date {
  const now = new Date()
  switch (period) {
    case 'day':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case 'week':
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      return weekStart
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'year':
      return new Date(now.getFullYear(), 0, 1)
    default:
      return new Date(now.getFullYear(), now.getMonth(), 1)
  }
}

/**
 * MÉTRICAS DE TRACCIÓN Y USO
 */
async function getTractionMetrics(startDate: Date, availability: TableAvailability) {
  if (!hasAllTables(availability, ['tenants'])) {
    return {
      totalUsers: 0,
      activeUsers: 0,
      dau: 0,
      wau: 0,
      mau: 0,
      activeProperties: 0,
      checkins: 0,
      xmlSent: 0,
      xmlErrors: 0,
      offlineUsagePercent: 0
    }
  }

  // Usuarios totales
  const totalUsers = await sql`
    SELECT COUNT(DISTINCT id) as count
    FROM tenants
    WHERE created_at >= ${startDate.toISOString()}
  `

  // Usuarios activos (han hecho login en el período)
  const activeUsers = hasAllTables(availability, ['user_activity']) ? await sql`
    SELECT COUNT(DISTINCT tenant_id) as count
    FROM user_activity
    WHERE activity_type = 'login' 
      AND created_at >= ${startDate.toISOString()}
  ` : { rows: [{ count: '0' }] as any[] }

  // DAU (usuarios activos hoy)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dau = hasAllTables(availability, ['user_activity']) ? await sql`
    SELECT COUNT(DISTINCT tenant_id) as count
    FROM user_activity
    WHERE activity_type = 'login' 
      AND created_at >= ${today.toISOString()}
  ` : { rows: [{ count: '0' }] as any[] }

  // WAU (usuarios activos última semana)
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const wau = hasAllTables(availability, ['user_activity']) ? await sql`
    SELECT COUNT(DISTINCT tenant_id) as count
    FROM user_activity
    WHERE activity_type = 'login' 
      AND created_at >= ${weekAgo.toISOString()}
  ` : { rows: [{ count: '0' }] as any[] }

  // MAU (usuarios activos último mes)
  const monthAgo = new Date()
  monthAgo.setMonth(monthAgo.getMonth() - 1)
  const mau = hasAllTables(availability, ['user_activity']) ? await sql`
    SELECT COUNT(DISTINCT tenant_id) as count
    FROM user_activity
    WHERE activity_type = 'login' 
      AND created_at >= ${monthAgo.toISOString()}
  ` : { rows: [{ count: '0' }] as any[] }

  // Propiedades activas
  const activeProperties = hasAllTables(availability, ['tenant_properties']) ? await sql`
    SELECT COUNT(DISTINCT id) as count
    FROM tenant_properties
    WHERE created_at >= ${startDate.toISOString()}
  ` : { rows: [{ count: '0' }] as any[] }

  // Check-ins realizados
  const checkins = hasAllTables(availability, ['guest_registrations']) ? await sql`
    SELECT COUNT(*) as count
    FROM guest_registrations
    WHERE created_at >= ${startDate.toISOString()}
  ` : { rows: [{ count: '0' }] as any[] }

  // XML generados/enviados
  const xmlSent = hasAllTables(availability, ['xml_tracking']) ? await sql`
    SELECT COUNT(*) as count
    FROM xml_tracking
    WHERE status IN ('sent', 'delivered')
      AND created_at >= ${startDate.toISOString()}
  ` : { rows: [{ count: '0' }] as any[] }

  // Errores de envío
  const xmlErrors = hasAllTables(availability, ['xml_tracking']) ? await sql`
    SELECT COUNT(*) as count
    FROM xml_tracking
    WHERE status = 'error'
      AND created_at >= ${startDate.toISOString()}
  ` : { rows: [{ count: '0' }] as any[] }

  // Modo offline usado (si hay tracking de esto)
  const offlineUsage = hasAllTables(availability, ['user_activity']) ? await sql`
    SELECT COUNT(DISTINCT tenant_id) as count
    FROM user_activity
    WHERE activity_type = 'offline_mode'
      AND created_at >= ${startDate.toISOString()}
  ` : { rows: [{ count: '0' }] as any[] }

  return {
    totalUsers: parseInt(totalUsers.rows[0]?.count || '0'),
    activeUsers: parseInt(activeUsers.rows[0]?.count || '0'),
    dau: parseInt(dau.rows[0]?.count || '0'),
    wau: parseInt(wau.rows[0]?.count || '0'),
    mau: parseInt(mau.rows[0]?.count || '0'),
    activeProperties: parseInt(activeProperties.rows[0]?.count || '0'),
    checkins: parseInt(checkins.rows[0]?.count || '0'),
    xmlSent: parseInt(xmlSent.rows[0]?.count || '0'),
    xmlErrors: parseInt(xmlErrors.rows[0]?.count || '0'),
    offlineUsagePercent: totalUsers.rows[0]?.count > 0 
      ? (parseInt(offlineUsage.rows[0]?.count || '0') / parseInt(totalUsers.rows[0]?.count || '1')) * 100 
      : 0
  }
}

/**
 * MÉTRICAS DE INGRESOS
 */
async function getRevenueMetrics(startDate: Date, availability: TableAvailability) {
  if (!hasAllTables(availability, ['subscription_events'])) {
    return {
      mrr: 0,
      arr: 0,
      arpu: 0,
      revenueByPlan: [],
      revenueByCountry: [],
      revenueByAffiliate: [],
      mrrHistory: []
    }
  }

  // MRR (Monthly Recurring Revenue)
  const mrr = await sql`
    SELECT COALESCE(SUM(amount), 0) as mrr
    FROM subscription_events
    WHERE event_type = 'payment_received'
      AND period_start >= date_trunc('month', CURRENT_DATE)
      AND period_start < date_trunc('month', CURRENT_DATE) + interval '1 month'
  `

  // ARR (Annual Recurring Revenue) = MRR * 12
  const mrrValue = parseFloat(mrr.rows[0]?.mrr || '0')
  const arr = mrrValue * 12

  // ARPU (Average Revenue Per User)
  const activePayingUsers = await sql`
    SELECT COUNT(DISTINCT tenant_id) as count
    FROM subscription_events
    WHERE event_type = 'payment_received'
      AND period_start >= date_trunc('month', CURRENT_DATE)
  `
  const arpu = activePayingUsers.rows[0]?.count > 0 
    ? mrrValue / parseInt(activePayingUsers.rows[0]?.count || '1')
    : 0

  // Ingresos por plan
  const revenueByPlan = await sql`
    SELECT 
      plan_type,
      COALESCE(SUM(amount), 0) as revenue
    FROM subscription_events
    WHERE event_type = 'payment_received'
      AND created_at >= ${startDate.toISOString()}
    GROUP BY plan_type
  `

  // Ingresos por país
  const revenueByCountry = hasAllTables(availability, ['tenants']) ? await sql`
    SELECT 
      t.country_code,
      COALESCE(SUM(se.amount), 0) as revenue
    FROM subscription_events se
    JOIN tenants t ON t.id = se.tenant_id
    WHERE se.event_type = 'payment_received'
      AND se.created_at >= ${startDate.toISOString()}
    GROUP BY t.country_code
  ` : { rows: [] as any[] }

  // Ingresos por afiliados
  const revenueByAffiliate = hasAllTables(availability, ['tenants', 'referrals', 'affiliates']) ? await sql`
    SELECT 
      a.id,
      a.name,
      COALESCE(SUM(se.amount), 0) as revenue
    FROM subscription_events se
    JOIN tenants t ON t.id = se.tenant_id
    JOIN referrals r ON r.referred_tenant_id = t.id
    JOIN affiliates a ON a.id = r.affiliate_id
    WHERE se.event_type = 'payment_received'
      AND se.created_at >= ${startDate.toISOString()}
    GROUP BY a.id, a.name
  ` : { rows: [] as any[] }

  // MRR histórico (últimos 12 meses)
  const mrrHistory = await sql`
    SELECT 
      date_trunc('month', period_start) as month,
      COALESCE(SUM(amount), 0) as mrr
    FROM subscription_events
    WHERE event_type = 'payment_received'
      AND period_start >= CURRENT_DATE - interval '12 months'
    GROUP BY date_trunc('month', period_start)
    ORDER BY month ASC
  `

  return {
    mrr: mrrValue,
    arr,
    arpu,
    revenueByPlan: revenueByPlan.rows.map((r: any) => ({
      plan: r.plan_type,
      revenue: parseFloat(r.revenue || '0')
    })),
    revenueByCountry: revenueByCountry.rows.map((r: any) => ({
      country: r.country_code,
      revenue: parseFloat(r.revenue || '0')
    })),
    revenueByAffiliate: revenueByAffiliate.rows.map((r: any) => ({
      affiliateId: r.id,
      affiliateName: r.name,
      revenue: parseFloat(r.revenue || '0')
    })),
    mrrHistory: mrrHistory.rows.map((r: any) => ({
      month: r.month,
      mrr: parseFloat(r.mrr || '0')
    }))
  }
}

/**
 * MÉTRICAS DE RETENCIÓN Y CHURN
 */
async function getRetentionMetrics(startDate: Date, availability: TableAvailability) {
  if (!hasAllTables(availability, ['subscription_events', 'tenants'])) {
    return {
      churnRate: 0,
      usersCancelled: 0,
      cohorts: [],
      avgLTV: 0,
      freeToPaid: 0
    }
  }

  // Churn mensual (%)
  const currentMonthStart = new Date()
  currentMonthStart.setDate(1)
  currentMonthStart.setHours(0, 0, 0, 0)
  
  const previousMonthStart = new Date(currentMonthStart)
  previousMonthStart.setMonth(previousMonthStart.getMonth() - 1)

  const usersStartOfMonth = await sql`
    SELECT COUNT(DISTINCT tenant_id) as count
    FROM subscription_events
    WHERE period_start < ${currentMonthStart.toISOString()}
      AND event_type IN ('subscription_started', 'payment_received')
  `

  const usersCancelled = await sql`
    SELECT COUNT(DISTINCT tenant_id) as count
    FROM subscription_events
    WHERE event_type = 'subscription_cancelled'
      AND created_at >= ${currentMonthStart.toISOString()}
  `

  const churnRate = usersStartOfMonth.rows[0]?.count > 0
    ? (parseInt(usersCancelled.rows[0]?.count || '0') / parseInt(usersStartOfMonth.rows[0]?.count || '1')) * 100
    : 0

  // Retención por cohortes (simplificado: últimos 6 meses)
  const cohorts = await sql`
    SELECT 
      date_trunc('month', created_at) as cohort_month,
      COUNT(DISTINCT id) as users
    FROM tenants
    WHERE created_at >= CURRENT_DATE - interval '6 months'
    GROUP BY date_trunc('month', created_at)
    ORDER BY cohort_month ASC
  `

  // LTV (Lifetime Value) - promedio
  const ltv = await sql`
    SELECT 
      AVG(total_revenue) as avg_ltv
    FROM (
      SELECT 
        tenant_id,
        SUM(amount) as total_revenue
      FROM subscription_events
      WHERE event_type = 'payment_received'
      GROUP BY tenant_id
    ) as tenant_revenue
  `

  // Clientes que pasan de free → pago
  const freeToPaid = await sql`
    SELECT COUNT(DISTINCT tenant_id) as count
    FROM subscription_events
    WHERE event_type = 'subscription_upgraded'
      AND created_at >= ${startDate.toISOString()}
  `

  return {
    churnRate: parseFloat(churnRate.toFixed(2)),
    usersCancelled: parseInt(usersCancelled.rows[0]?.count || '0'),
    cohorts: cohorts.rows.map((r: any) => ({
      month: r.cohort_month,
      users: parseInt(r.users || '0')
    })),
    avgLTV: parseFloat(ltv.rows[0]?.avg_ltv || '0'),
    freeToPaid: parseInt(freeToPaid.rows[0]?.count || '0')
  }
}

/**
 * MÉTRICAS LEGALES
 */
async function getLegalMetrics(startDate: Date, availability: TableAvailability) {
  if (!hasAllTables(availability, ['guest_registrations', 'xml_tracking'])) {
    return {
      successRate: 0,
      avgTimeToSendSeconds: 0,
      avgTimeToSendMinutes: 0,
      incidentsAvoided: 0,
      complianceByProperty: [],
      complianceByCountry: []
    }
  }

  // % de check-ins correctamente enviados
  const totalCheckins = await sql`
    SELECT COUNT(*) as count
    FROM guest_registrations
    WHERE created_at >= ${startDate.toISOString()}
  `

  const successfulXml = await sql`
    SELECT COUNT(*) as count
    FROM xml_tracking
    WHERE status IN ('sent', 'delivered')
      AND created_at >= ${startDate.toISOString()}
  `

  const successRate = totalCheckins.rows[0]?.count > 0
    ? (parseInt(successfulXml.rows[0]?.count || '0') / parseInt(totalCheckins.rows[0]?.count || '1')) * 100
    : 0

  // Tiempo medio desde check-in → envío SES
  const avgTimeToSend = await sql`
    SELECT 
      AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) as avg_seconds
    FROM xml_tracking
    WHERE sent_at IS NOT NULL
      AND created_at >= ${startDate.toISOString()}
  `

  // Nº de incidencias legales evitadas (estimado: errores que se corrigieron)
  const incidentsAvoided = await sql`
    SELECT COUNT(*) as count
    FROM xml_tracking
    WHERE status IN ('sent', 'delivered')
      AND retry_count > 0
      AND created_at >= ${startDate.toISOString()}
  `

  // Logs de cumplimiento por propiedad
  const complianceByProperty = hasAllTables(availability, ['tenant_properties']) ? await sql`
    SELECT 
      tp.id,
      tp.name,
      COUNT(xt.id) as total_sends,
      COUNT(xt.id) FILTER (WHERE xt.status IN ('sent', 'delivered')) as successful_sends
    FROM tenant_properties tp
    LEFT JOIN xml_tracking xt ON xt.property_id = tp.id
      AND xt.created_at >= ${startDate.toISOString()}
    GROUP BY tp.id, tp.name
    HAVING COUNT(xt.id) > 0
    ORDER BY total_sends DESC
    LIMIT 10
  ` : { rows: [] as any[] }

  // País / normativa aplicada
  const complianceByCountry = hasAllTables(availability, ['tenants']) ? await sql`
    SELECT 
      t.country_code,
      COUNT(xt.id) as total_sends,
      COUNT(xt.id) FILTER (WHERE xt.status IN ('sent', 'delivered')) as successful_sends
    FROM xml_tracking xt
    JOIN tenants t ON t.id = xt.tenant_id
    WHERE xt.created_at >= ${startDate.toISOString()}
    GROUP BY t.country_code
  ` : { rows: [] as any[] }

  return {
    successRate: parseFloat(successRate.toFixed(2)),
    avgTimeToSendSeconds: parseFloat(avgTimeToSend.rows[0]?.avg_seconds || '0'),
    avgTimeToSendMinutes: parseFloat(avgTimeToSend.rows[0]?.avg_seconds || '0') / 60,
    incidentsAvoided: parseInt(incidentsAvoided.rows[0]?.count || '0'),
    complianceByProperty: complianceByProperty.rows.map((r: any) => ({
      propertyId: r.id,
      propertyName: r.name,
      totalSends: parseInt(r.total_sends || '0'),
      successfulSends: parseInt(r.successful_sends || '0')
    })),
    complianceByCountry: complianceByCountry.rows.map((r: any) => ({
      country: r.country_code,
      totalSends: parseInt(r.total_sends || '0'),
      successfulSends: parseInt(r.successful_sends || '0')
    }))
  }
}

/**
 * MÉTRICAS DE EMAIL
 */
async function getEmailMetrics(startDate: Date, availability: TableAvailability) {
  if (!hasAllTables(availability, ['email_tracking'])) {
    return {
      totalSent: 0,
      openRate: 0,
      clickRate: 0,
      conversionRate: 0,
      converted: 0,
      emailsByType: []
    }
  }

  // Emails enviados
  const totalSent = await sql`
    SELECT COUNT(*) as count
    FROM email_tracking
    WHERE created_at >= ${startDate.toISOString()}
  `

  // Open rate
  const opened = await sql`
    SELECT COUNT(*) as count
    FROM email_tracking
    WHERE status IN ('opened', 'clicked')
      AND created_at >= ${startDate.toISOString()}
  `

  const openRate = totalSent.rows[0]?.count > 0
    ? (parseInt(opened.rows[0]?.count || '0') / parseInt(totalSent.rows[0]?.count || '1')) * 100
    : 0

  // Click rate
  const clicked = await sql`
    SELECT COUNT(*) as count
    FROM email_tracking
    WHERE status = 'clicked'
      AND created_at >= ${startDate.toISOString()}
  `

  const clickRate = totalSent.rows[0]?.count > 0
    ? (parseInt(clicked.rows[0]?.count || '0') / parseInt(totalSent.rows[0]?.count || '1')) * 100
    : 0

  // Conversión a pago
  const converted = await sql`
    SELECT COUNT(*) as count
    FROM email_tracking
    WHERE conversion_type = 'payment'
      AND created_at >= ${startDate.toISOString()}
  `

  const conversionRate = totalSent.rows[0]?.count > 0
    ? (parseInt(converted.rows[0]?.count || '0') / parseInt(totalSent.rows[0]?.count || '1')) * 100
    : 0

  // Emails por tipo
  const emailsByType = await sql`
    SELECT 
      email_type,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE status IN ('opened', 'clicked')) as opened_count
    FROM email_tracking
    WHERE created_at >= ${startDate.toISOString()}
    GROUP BY email_type
  `

  return {
    totalSent: parseInt(totalSent.rows[0]?.count || '0'),
    openRate: parseFloat(openRate.toFixed(2)),
    clickRate: parseFloat(clickRate.toFixed(2)),
    conversionRate: parseFloat(conversionRate.toFixed(2)),
    converted: parseInt(converted.rows[0]?.count || '0'),
    emailsByType: emailsByType.rows.map((r: any) => ({
      type: r.email_type,
      sent: parseInt(r.count || '0'),
      opened: parseInt(r.opened_count || '0')
    }))
  }
}

/**
 * MÉTRICAS DE FUNNEL
 */
async function getFunnelMetrics(startDate: Date, availability: TableAvailability) {
  if (!hasAllTables(availability, ['funnel_events'])) {
    return {
      signups: 0,
      propertiesCreated: 0,
      firstCheckins: 0,
      xmlSent: 0,
      paid: 0,
      conversionRates: {
        signupToProperty: 0,
        propertyToCheckin: 0,
        checkinToXml: 0,
        xmlToPaid: 0
      }
    }
  }

  // Paso 1: Registro
  const signups = await sql`
    SELECT COUNT(DISTINCT tenant_id) as count
    FROM funnel_events
    WHERE event_type = 'signup'
      AND created_at >= ${startDate.toISOString()}
  `

  // Paso 2: Crea propiedad
  const propertiesCreated = await sql`
    SELECT COUNT(DISTINCT tenant_id) as count
    FROM funnel_events
    WHERE event_type = 'property_created'
      AND created_at >= ${startDate.toISOString()}
  `

  // Paso 3: Primer check-in
  const firstCheckins = await sql`
    SELECT COUNT(DISTINCT tenant_id) as count
    FROM funnel_events
    WHERE event_type = 'first_checkin'
      AND created_at >= ${startDate.toISOString()}
  `

  // Paso 4: Envía XML
  const xmlSent = await sql`
    SELECT COUNT(DISTINCT tenant_id) as count
    FROM funnel_events
    WHERE event_type = 'xml_sent'
      AND created_at >= ${startDate.toISOString()}
  `

  // Paso 5: Pasa a pago
  const paid = await sql`
    SELECT COUNT(DISTINCT tenant_id) as count
    FROM funnel_events
    WHERE event_type = 'payment'
      AND created_at >= ${startDate.toISOString()}
  `

  const signupsCount = parseInt(signups.rows[0]?.count || '0')

  return {
    signups: signupsCount,
    propertiesCreated: parseInt(propertiesCreated.rows[0]?.count || '0'),
    firstCheckins: parseInt(firstCheckins.rows[0]?.count || '0'),
    xmlSent: parseInt(xmlSent.rows[0]?.count || '0'),
    paid: parseInt(paid.rows[0]?.count || '0'),
    conversionRates: {
      signupToProperty: signupsCount > 0 
        ? (parseInt(propertiesCreated.rows[0]?.count || '0') / signupsCount) * 100 
        : 0,
      propertyToCheckin: parseInt(propertiesCreated.rows[0]?.count || '0') > 0
        ? (parseInt(firstCheckins.rows[0]?.count || '0') / parseInt(propertiesCreated.rows[0]?.count || '1')) * 100
        : 0,
      checkinToXml: parseInt(firstCheckins.rows[0]?.count || '0') > 0
        ? (parseInt(xmlSent.rows[0]?.count || '0') / parseInt(firstCheckins.rows[0]?.count || '1')) * 100
        : 0,
      xmlToPaid: parseInt(xmlSent.rows[0]?.count || '0') > 0
        ? (parseInt(paid.rows[0]?.count || '0') / parseInt(xmlSent.rows[0]?.count || '1')) * 100
        : 0
    }
  }
}

