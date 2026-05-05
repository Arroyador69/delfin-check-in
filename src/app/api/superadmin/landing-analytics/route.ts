import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';

/**
 * ========================================
 * API: Landing Analytics para SuperAdmin
 * ========================================
 * Obtiene estadísticas de la landing page
 */

export async function GET(req: NextRequest) {
  try {
    // Verificar autenticación
    const authToken = req.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que sea superadmin
    const payload = verifyToken(authToken);
    
    if (!isEffectiveSuperAdminPayload(payload)) {
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    // Obtener parámetros de fecha
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // ========================================
    // MÉTRICAS BÁSICAS
    // ========================================
    
    // Total de visitas (sesiones únicas)
    const totalVisits = await sql`
      SELECT COUNT(DISTINCT session_id) as total
      FROM landing_sessions
      WHERE started_at >= ${startDate.toISOString()}
    `;

    // Conversiones (formulario completado)
    const conversions = await sql`
      SELECT COUNT(*) as total
      FROM landing_sessions
      WHERE conversion = true
        AND started_at >= ${startDate.toISOString()}
    `;

    // Tasa de conversión
    const totalVisitsCount = parseInt(totalVisits.rows[0]?.total || '0');
    const conversionsCount = parseInt(conversions.rows[0]?.total || '0');
    const conversionRate = totalVisitsCount > 0 
      ? (conversionsCount / totalVisitsCount * 100).toFixed(2)
      : '0.00';

    // Tiempo promedio en página
    const avgTime = await sql`
      SELECT 
        AVG(time_on_page) as avg_time,
        AVG(EXTRACT(EPOCH FROM (ended_at - started_at))) as avg_session_duration
      FROM landing_sessions
      WHERE started_at >= ${startDate.toISOString()}
        AND time_on_page IS NOT NULL
    `;

    // Tasa de abandono (bounce rate)
    // Sesiones que duraron menos de 10 segundos o no tuvieron interacción
    const bounces = await sql`
      SELECT COUNT(*) as total
      FROM landing_sessions
      WHERE started_at >= ${startDate.toISOString()}
        AND (
          time_on_page < 10 
          OR time_on_page IS NULL
          OR (ended_at - started_at) < INTERVAL '10 seconds'
        )
    `;

    const bounceRate = totalVisitsCount > 0
      ? (parseInt(bounces.rows[0]?.total || '0') / totalVisitsCount * 100).toFixed(2)
      : '0.00';

    // ========================================
    // MÉTRICAS AVANZADAS
    // ========================================

    // Scroll depth promedio
    const scrollDepth = await sql`
      SELECT 
        AVG((event_data->>'scroll_percent')::numeric) as avg_scroll_depth
      FROM landing_events
      WHERE event_type = 'scroll'
        AND timestamp >= ${startDate.toISOString()}
        AND event_data->>'scroll_percent' IS NOT NULL
    `;

    // Clics totales
    const totalClicks = await sql`
      SELECT COUNT(*) as total
      FROM landing_events
      WHERE event_type = 'click'
        AND timestamp >= ${startDate.toISOString()}
    `;

    // Popup views
    const popupViews = await sql`
      SELECT COUNT(*) as total
      FROM landing_events
      WHERE event_type = 'popup_view'
        AND timestamp >= ${startDate.toISOString()}
    `;

    // Popup closes
    const popupCloses = await sql`
      SELECT COUNT(*) as total
      FROM landing_events
      WHERE event_type = 'popup_close'
        AND timestamp >= ${startDate.toISOString()}
    `;

    // Popup clicks (conversiones desde popup)
    const popupClicks = await sql`
      SELECT COUNT(*) as total
      FROM landing_events
      WHERE event_type = 'popup_click'
        AND timestamp >= ${startDate.toISOString()}
    `;

    // Form starts vs completados
    const formStarts = await sql`
      SELECT COUNT(*) as total
      FROM landing_events
      WHERE event_type = 'form_start'
        AND timestamp >= ${startDate.toISOString()}
    `;

    // Form submits (ya tenemos en conversions, pero lo incluimos aquí para claridad)
    const formSubmits = await sql`
      SELECT COUNT(*) as total
      FROM landing_events
      WHERE event_type = 'form_submit'
        AND timestamp >= ${startDate.toISOString()}
    `;

    // Tasa de abandono de formulario
    const formAbandonmentRate = parseInt(formStarts.rows[0]?.total || '0') > 0
      ? ((parseInt(formStarts.rows[0]?.total || '0') - parseInt(formSubmits.rows[0]?.total || '0')) / parseInt(formStarts.rows[0]?.total || '0') * 100).toFixed(2)
      : '0.00';

    // ========================================
    // TENDENCIAS (últimos 7 días)
    // ========================================

    const trends = await sql`
      SELECT 
        DATE(started_at) as date,
        COUNT(DISTINCT session_id) as visits,
        COUNT(*) FILTER (WHERE conversion = true) as conversions,
        AVG(time_on_page) as avg_time
      FROM landing_sessions
      WHERE started_at >= ${new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()}
      GROUP BY DATE(started_at)
      ORDER BY date ASC
    `;

    // ========================================
    // TOP EVENTOS
    // ========================================

    const topEvents = await sql`
      SELECT 
        event_type,
        COUNT(*) as count
      FROM landing_events
      WHERE timestamp >= ${startDate.toISOString()}
      GROUP BY event_type
      ORDER BY count DESC
      LIMIT 10
    `;

    // ========================================
    // REFERRERS (de dónde vienen)
    // ========================================

    const referrers = await sql`
      SELECT 
        COALESCE(referrer, 'direct') as referrer,
        COUNT(DISTINCT session_id) as visits
      FROM landing_sessions
      WHERE started_at >= ${startDate.toISOString()}
      GROUP BY COALESCE(referrer, 'direct')
      ORDER BY visits DESC
      LIMIT 10
    `;

    // ========================================
    // DISPOSITIVOS (mobile vs desktop)
    // ========================================

    const devices = await sql`
      SELECT 
        CASE 
          WHEN user_agent LIKE '%Mobile%' OR user_agent LIKE '%Android%' OR user_agent LIKE '%iPhone%' THEN 'mobile'
          ELSE 'desktop'
        END as device_type,
        COUNT(DISTINCT session_id) as visits
      FROM landing_sessions
      WHERE started_at >= ${startDate.toISOString()}
      GROUP BY 
        CASE 
          WHEN user_agent LIKE '%Mobile%' OR user_agent LIKE '%Android%' OR user_agent LIKE '%iPhone%' THEN 'mobile'
          ELSE 'desktop'
        END
    `;

    return NextResponse.json({
      // Métricas básicas
      metrics: {
        totalVisits: totalVisitsCount,
        conversions: conversionsCount,
        conversionRate: parseFloat(conversionRate),
        avgTimeOnPage: parseFloat(avgTime.rows[0]?.avg_time || '0'),
        avgSessionDuration: parseFloat(avgTime.rows[0]?.avg_session_duration || '0'),
        bounceRate: parseFloat(bounceRate),
      },
      // Métricas avanzadas
      advanced: {
        avgScrollDepth: parseFloat(scrollDepth.rows[0]?.avg_scroll_depth || '0'),
        totalClicks: parseInt(totalClicks.rows[0]?.total || '0'),
        popupViews: parseInt(popupViews.rows[0]?.total || '0'),
        popupCloses: parseInt(popupCloses.rows[0]?.total || '0'),
        popupClicks: parseInt(popupClicks.rows[0]?.total || '0'),
        popupConversionRate: parseInt(popupViews.rows[0]?.total || '0') > 0
          ? (parseInt(popupClicks.rows[0]?.total || '0') / parseInt(popupViews.rows[0]?.total || '0') * 100).toFixed(2)
          : '0.00',
        formStarts: parseInt(formStarts.rows[0]?.total || '0'),
        formSubmits: parseInt(formSubmits.rows[0]?.total || '0'),
        formAbandonmentRate: parseFloat(formAbandonmentRate),
      },
      // Tendencias
      trends: trends.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        visits: parseInt(row.visits || '0'),
        conversions: parseInt(row.conversions || '0'),
        avgTime: parseFloat(row.avg_time || '0'),
      })),
      // Top eventos
      topEvents: topEvents.rows.map(row => ({
        eventType: row.event_type,
        count: parseInt(row.count || '0'),
      })),
      // Referrers
      referrers: referrers.rows.map(row => ({
        referrer: row.referrer,
        visits: parseInt(row.visits || '0'),
      })),
      // Dispositivos
      devices: devices.rows.map(row => ({
        deviceType: row.device_type,
        visits: parseInt(row.visits || '0'),
      })),
      // Periodo
      period: {
        days,
        startDate: startDate.toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      },
    });

  } catch (error: any) {
    console.error('❌ Error fetching landing analytics:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
