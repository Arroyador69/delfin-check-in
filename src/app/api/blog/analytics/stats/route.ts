import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/auth-superadmin';

/**
 * ========================================
 * API: Estadísticas de Analytics por Artículo
 * ========================================
 * Obtiene métricas agregadas de un artículo o todos
 */

export async function GET(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const article_slug = searchParams.get('article_slug');
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    if (article_slug) {
      // Estadísticas de un artículo específico
      return await getArticleStats(article_slug, startDate);
    } else {
      // Estadísticas de todos los artículos
      return await getAllArticlesStats(startDate);
    }

  } catch (error: any) {
    console.error('❌ Error obteniendo stats:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

async function getArticleStats(article_slug: string, startDate: Date) {
  // Obtener ID del artículo
  const articleResult = await sql`
    SELECT id, slug, title, published_at FROM blog_articles
    WHERE slug = ${article_slug}
    LIMIT 1
  `;

  if (articleResult.rows.length === 0) {
    return NextResponse.json(
      { error: 'Artículo no encontrado' },
      { status: 404 }
    );
  }

  const article = articleResult.rows[0];

  // Métricas básicas
  const totalVisits = await sql`
    SELECT COUNT(DISTINCT session_id) as total
    FROM blog_analytics_sessions
    WHERE article_id = ${article.id}::uuid
      AND started_at >= ${startDate.toISOString()}
  `;

  const conversions = await sql`
    SELECT COUNT(*) as total
    FROM blog_analytics_sessions
    WHERE article_id = ${article.id}::uuid
      AND conversion = true
      AND started_at >= ${startDate.toISOString()}
  `;

  const totalVisitsCount = parseInt(totalVisits.rows[0]?.total || '0');
  const conversionsCount = parseInt(conversions.rows[0]?.total || '0');
  const conversionRate = totalVisitsCount > 0
    ? (conversionsCount / totalVisitsCount * 100).toFixed(2)
    : '0.00';

  // Tiempo promedio
  const avgTime = await sql`
    SELECT 
      AVG(time_on_page) as avg_time
    FROM blog_analytics_sessions
    WHERE article_id = ${article.id}::uuid
      AND started_at >= ${startDate.toISOString()}
      AND time_on_page IS NOT NULL
  `;

  // Tasa de abandono
  const bounces = await sql`
    SELECT COUNT(*) as total
    FROM blog_analytics_sessions
    WHERE article_id = ${article.id}::uuid
      AND started_at >= ${startDate.toISOString()}
      AND (time_on_page < 10 OR time_on_page IS NULL)
  `;

  const bounceRate = totalVisitsCount > 0
    ? (parseInt(bounces.rows[0]?.total || '0') / totalVisitsCount * 100).toFixed(2)
    : '0.00';

  // Scroll depth promedio
  const scrollDepth = await sql`
    SELECT AVG(scroll_depth) as avg_scroll_depth
    FROM blog_analytics_sessions
    WHERE article_id = ${article.id}::uuid
      AND started_at >= ${startDate.toISOString()}
      AND scroll_depth IS NOT NULL
  `;

  // Métricas del popup
  const popupViews = await sql`
    SELECT COUNT(*) as total
    FROM blog_analytics_sessions
    WHERE article_id = ${article.id}::uuid
      AND popup_viewed = true
      AND started_at >= ${startDate.toISOString()}
  `;

  const popupCloses = await sql`
    SELECT COUNT(*) as total
    FROM blog_analytics_sessions
    WHERE article_id = ${article.id}::uuid
      AND popup_closed = true
      AND started_at >= ${startDate.toISOString()}
  `;

  const popupClicks = await sql`
    SELECT COUNT(*) as total
    FROM blog_analytics_sessions
    WHERE article_id = ${article.id}::uuid
      AND popup_clicked = true
      AND started_at >= ${startDate.toISOString()}
  `;

  const popupViewsCount = parseInt(popupViews.rows[0]?.total || '0');
  const popupConversionRate = popupViewsCount > 0
    ? (parseInt(popupClicks.rows[0]?.total || '0') / popupViewsCount * 100).toFixed(2)
    : '0.00';

  // Clics totales
  const totalClicks = await sql`
    SELECT COUNT(*) as total
    FROM blog_analytics_events
    WHERE article_id = ${article.id}::uuid
      AND event_type = 'click'
      AND timestamp >= ${startDate.toISOString()}
  `;

  // Métricas del formulario
  const formStarts = await sql`
    SELECT COUNT(*) as total
    FROM blog_analytics_events
    WHERE article_id = ${article.id}::uuid
      AND event_type = 'form_start'
      AND timestamp >= ${startDate.toISOString()}
  `;

  const formSubmits = await sql`
    SELECT COUNT(*) as total
    FROM blog_analytics_events
    WHERE article_id = ${article.id}::uuid
      AND event_type = 'form_submit'
      AND timestamp >= ${startDate.toISOString()}
  `;

  const formStartsCount = parseInt(formStarts.rows[0]?.total || '0');
  const formSubmitsCount = parseInt(formSubmits.rows[0]?.total || '0');
  const formAbandonmentRate = formStartsCount > 0
    ? ((formStartsCount - formSubmitsCount) / formStartsCount * 100).toFixed(2)
    : '0.00';

  // Top eventos
  const topEvents = await sql`
    SELECT 
      event_type,
      COUNT(*) as count
    FROM blog_analytics_events
    WHERE article_id = ${article.id}::uuid
      AND timestamp >= ${startDate.toISOString()}
    GROUP BY event_type
    ORDER BY count DESC
    LIMIT 10
  `;

  // Referrers
  const referrers = await sql`
    SELECT 
      COALESCE(referrer, 'direct') as referrer,
      COUNT(*) as count
    FROM blog_analytics_sessions
    WHERE article_id = ${article.id}::uuid
      AND started_at >= ${startDate.toISOString()}
    GROUP BY referrer
    ORDER BY count DESC
    LIMIT 10
  `;

  // Dispositivos
  const devices = await sql`
    SELECT 
      COALESCE(device_type, 'unknown') as device_type,
      COUNT(*) as count
    FROM blog_analytics_sessions
    WHERE article_id = ${article.id}::uuid
      AND started_at >= ${startDate.toISOString()}
    GROUP BY device_type
    ORDER BY count DESC
  `;

  // Tendencias últimos 7 días
  const dailyTrends = await sql`
    SELECT 
      DATE(started_at) as date,
      COUNT(DISTINCT session_id) as visits,
      COUNT(DISTINCT CASE WHEN conversion = true THEN session_id END) as conversions,
      ROUND(AVG(time_on_page), 0) as avg_time
    FROM blog_analytics_sessions
    WHERE article_id = ${article.id}::uuid
      AND started_at >= NOW() - INTERVAL '7 days'
    GROUP BY DATE(started_at)
    ORDER BY date DESC
  `;

  return NextResponse.json({
    success: true,
    article: {
      slug: article.slug,
      title: article.title,
      published_at: article.published_at
    },
    period: {
      days: Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      startDate: startDate.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    metrics: {
      totalVisits: totalVisitsCount,
      conversions: conversionsCount,
      conversionRate: parseFloat(conversionRate),
      avgTimeOnPage: Math.round(parseFloat(avgTime.rows[0]?.avg_time || '0')),
      bounceRate: parseFloat(bounceRate),
      avgScrollDepth: Math.round(parseFloat(scrollDepth.rows[0]?.avg_scroll_depth || '0')),
      totalClicks: parseInt(totalClicks.rows[0]?.total || '0')
    },
    popup: {
      views: popupViewsCount,
      closes: parseInt(popupCloses.rows[0]?.total || '0'),
      clicks: parseInt(popupClicks.rows[0]?.total || '0'),
      conversionRate: parseFloat(popupConversionRate)
    },
    form: {
      starts: formStartsCount,
      completions: formSubmitsCount,
      abandonmentRate: parseFloat(formAbandonmentRate)
    },
    topEvents: topEvents.rows,
    referrers: referrers.rows,
    devices: devices.rows,
    dailyTrends: dailyTrends.rows
  });
}

async function getAllArticlesStats(startDate: Date) {
  const stats = await sql`
    SELECT 
      ba.id,
      ba.slug,
      ba.title,
      ba.is_published,
      ba.published_at,
      COUNT(DISTINCT bas.session_id) as total_visits,
      COUNT(DISTINCT CASE WHEN bas.conversion = true THEN bas.session_id END) as conversions,
      ROUND(AVG(bas.time_on_page), 0) as avg_time,
      ROUND(AVG(bas.scroll_depth), 0) as avg_scroll
    FROM blog_articles ba
    LEFT JOIN blog_analytics_sessions bas 
      ON ba.id = bas.article_id 
      AND bas.started_at >= ${startDate.toISOString()}
    WHERE ba.is_published = true
    GROUP BY ba.id, ba.slug, ba.title, ba.is_published, ba.published_at
    ORDER BY total_visits DESC
  `;

  return NextResponse.json({
    success: true,
    period: {
      days: Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      startDate: startDate.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    articles: stats.rows
  });
}
