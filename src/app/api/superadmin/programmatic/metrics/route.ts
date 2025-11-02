import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '30');
    const type = searchParams.get('type');

    // Construir WHERE clause dinámicamente
    const whereClause = type ? `WHERE type = $1` : '';
    const params: any[] = [];
    if (type) params.push(type);

    // KPIs generales - usar sql.query para INTERVAL dinámico
    const kpisQuery = `
      SELECT 
        COUNT(*) as total_pages,
        COUNT(*) FILTER (WHERE status = 'published') as published_pages,
        COUNT(*) FILTER (WHERE status = 'indexed') as indexed_pages,
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled_pages,
        COUNT(*) FILTER (WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '${days} days') as created_last_days,
        COUNT(*) FILTER (WHERE DATE(published_at) >= CURRENT_DATE - INTERVAL '${days} days') as published_last_days,
        AVG(seo_score) as avg_seo_score,
        AVG(local_signals_count) as avg_local_signals,
        COUNT(*) FILTER (WHERE seo_score < 60) as low_seo_pages
      FROM programmatic_pages
      ${whereClause}
    `;
    const kpis = await sql.query(kpisQuery, params);

    // Métricas de indexación
    const indexationParams: any[] = [];
    const indexationWhere = type ? `AND pp.type = $${indexationParams.length + 1}` : '';
    if (type) indexationParams.push(type);
    
    const indexationQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE is_indexed = true) as indexed_count,
        COUNT(*) FILTER (WHERE is_indexed = false) as not_indexed_count,
        AVG(EXTRACT(EPOCH FROM (indexation_date::timestamp - published_at::timestamp))/86400) as avg_days_to_index
      FROM programmatic_page_metrics ppm
      JOIN programmatic_pages pp ON pp.id = ppm.page_id
      WHERE ppm.metric_date >= CURRENT_DATE - INTERVAL '${days} days'
        ${indexationWhere}
    `;
    const indexation = await sql.query(indexationQuery, indexationParams);

    // Métricas de tráfico (últimos 30 días)
    const trafficQuery = `
      SELECT 
        SUM(sessions) as total_sessions,
        SUM(clicks) as total_clicks,
        SUM(impressions) as total_impressions,
        AVG(ctr) as avg_ctr,
        AVG(avg_position) as avg_position,
        SUM(conversions) as total_conversions,
        SUM(revenue) as total_revenue
      FROM programmatic_page_metrics
      WHERE metric_date >= CURRENT_DATE - INTERVAL '${days} days'
    `;
    const traffic = await sql.query(trafficQuery, []);

    // Top páginas por conversión
    const topPagesParams: any[] = [];
    const topPagesWhere = type ? `AND pp.type = $${topPagesParams.length + 1}` : '';
    if (type) topPagesParams.push(type);
    
    const topPagesQuery = `
      SELECT 
        pp.id,
        pp.slug,
        pp.title,
        pp.type,
        SUM(ppm.sessions) as total_sessions,
        SUM(ppm.conversions) as total_conversions,
        SUM(ppm.revenue) as total_revenue,
        CASE 
          WHEN SUM(ppm.sessions) > 0 
          THEN (SUM(ppm.conversions)::decimal / SUM(ppm.sessions)) * 100
          ELSE 0
        END as conversion_rate
      FROM programmatic_pages pp
      LEFT JOIN programmatic_page_metrics ppm ON ppm.page_id = pp.id
        AND ppm.metric_date >= CURRENT_DATE - INTERVAL '${days} days'
      WHERE pp.status = 'published'
        ${topPagesWhere}
      GROUP BY pp.id, pp.slug, pp.title, pp.type
      HAVING SUM(ppm.sessions) > 0
      ORDER BY conversion_rate DESC, total_conversions DESC
      LIMIT 10
    `;
    const topPages = await sql.query(topPagesQuery, topPagesParams);

    // Páginas con bajo rendimiento (0 sesiones en 14 días)
    const lowPerfParams: any[] = [];
    const lowPerfWhere = type ? `AND pp.type = $${lowPerfParams.length + 1}` : '';
    if (type) lowPerfParams.push(type);
    
    const lowPerformanceQuery = `
      SELECT 
        pp.id,
        pp.slug,
        pp.title,
        pp.type,
        pp.published_at,
        COALESCE(SUM(ppm.sessions), 0) as total_sessions
      FROM programmatic_pages pp
      LEFT JOIN programmatic_page_metrics ppm ON ppm.page_id = pp.id
        AND ppm.metric_date >= CURRENT_DATE - INTERVAL '14 days'
      WHERE pp.status = 'published'
        AND pp.published_at <= CURRENT_DATE - INTERVAL '14 days'
        ${lowPerfWhere}
      GROUP BY pp.id, pp.slug, pp.title, pp.type, pp.published_at
      HAVING COALESCE(SUM(ppm.sessions), 0) = 0
      ORDER BY pp.published_at ASC
      LIMIT 20
    `;
    const lowPerformance = await sql.query(lowPerformanceQuery, lowPerfParams);

      // Cobertura por plantilla con KPIs de rendimiento
      const byTemplate = await sql`
        SELECT 
          ct.name as template_name,
          ct.type,
          COUNT(pp.id) as total_pages,
          COUNT(*) FILTER (WHERE pp.status = 'published') as published,
          AVG(pp.seo_score) as avg_seo_score,
          AVG(pp.local_signals_count) as avg_local_signals,
          -- KPIs de rendimiento (últimos 30 días)
          AVG(ppm.sessions::decimal / NULLIF(GREATEST((CURRENT_DATE - ppm.metric_date)::integer, 1), 0)) as avg_sessions_per_day,
          AVG(CASE WHEN ppm.sessions > 0 THEN (ppm.conversions::decimal / ppm.sessions) * 100 ELSE 0 END) as avg_conversion_rate,
          COUNT(*) FILTER (WHERE ppm.sessions::decimal / NULLIF(GREATEST((CURRENT_DATE - ppm.metric_date)::integer, 1), 0) < 
            CASE ct.type
              WHEN 'local' THEN 1.7
              WHEN 'problem-solution' THEN 1.2
              WHEN 'feature' THEN 1.0
              WHEN 'comparison' THEN 0.8
              ELSE 0
            END
          ) as underperforming_pages
        FROM content_templates ct
        LEFT JOIN programmatic_pages pp ON pp.template_id = ct.id
        LEFT JOIN programmatic_page_metrics ppm ON ppm.page_id = pp.id
          AND ppm.metric_date >= CURRENT_DATE - make_interval(days => 30)
        GROUP BY ct.id, ct.name, ct.type
        ORDER BY total_pages DESC
      `;

    // Crecimiento de páginas por día (últimos 30 días)
    const growthQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as pages_created,
        COUNT(*) FILTER (WHERE status = 'published') as pages_published
      FROM programmatic_pages
      WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;
    const growth = await sql.query(growthQuery, []);

    return NextResponse.json({
      kpis: {
        totalPages: parseInt(kpis.rows[0]?.total_pages || '0'),
        publishedPages: parseInt(kpis.rows[0]?.published_pages || '0'),
        indexedPages: parseInt(kpis.rows[0]?.indexed_pages || '0'),
        scheduledPages: parseInt(kpis.rows[0]?.scheduled_pages || '0'),
        createdLastDays: parseInt(kpis.rows[0]?.created_last_days || '0'),
        publishedLastDays: parseInt(kpis.rows[0]?.published_last_days || '0'),
        avgSeoScore: parseFloat(kpis.rows[0]?.avg_seo_score || '0'),
        avgLocalSignals: parseFloat(kpis.rows[0]?.avg_local_signals || '0'),
        lowSeoPages: parseInt(kpis.rows[0]?.low_seo_pages || '0'),
      },
      indexation: {
        indexedCount: parseInt(indexation.rows[0]?.indexed_count || '0'),
        notIndexedCount: parseInt(indexation.rows[0]?.not_indexed_count || '0'),
        avgDaysToIndex: parseFloat(indexation.rows[0]?.avg_days_to_index || '0'),
        indexationRate: indexation.rows[0]?.indexed_count 
          ? (parseInt(indexation.rows[0].indexed_count) / 
             (parseInt(indexation.rows[0].indexed_count) + parseInt(indexation.rows[0].not_indexed_count || '0'))) * 100
          : 0
      },
      traffic: {
        totalSessions: parseInt(traffic.rows[0]?.total_sessions || '0'),
        totalClicks: parseInt(traffic.rows[0]?.total_clicks || '0'),
        totalImpressions: parseInt(traffic.rows[0]?.total_impressions || '0'),
        avgCtr: parseFloat(traffic.rows[0]?.avg_ctr || '0') * 100,
        avgPosition: parseFloat(traffic.rows[0]?.avg_position || '0'),
        totalConversions: parseInt(traffic.rows[0]?.total_conversions || '0'),
        totalRevenue: parseFloat(traffic.rows[0]?.total_revenue || '0'),
        conversionRate: traffic.rows[0]?.total_sessions 
          ? (parseInt(traffic.rows[0].total_conversions || '0') / parseInt(traffic.rows[0].total_sessions)) * 100
          : 0
      },
      topPages: topPages.rows.map(row => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        type: row.type,
        totalSessions: parseInt(row.total_sessions || '0'),
        totalConversions: parseInt(row.total_conversions || '0'),
        totalRevenue: parseFloat(row.total_revenue || '0'),
        conversionRate: parseFloat(row.conversion_rate || '0')
      })),
      lowPerformance: lowPerformance.rows.map(row => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        type: row.type,
        publishedAt: row.published_at,
        totalSessions: parseInt(row.total_sessions || '0')
      })),
      byTemplate: byTemplate.rows.map(row => {
        const type = row.type as string;
        const targetSessions = {
          'local': 1.7,
          'problem-solution': 1.2,
          'feature': 1.0,
          'comparison': 0.8
        }[type] || 0;

        const avgSessions = parseFloat(row.avg_sessions_per_day || '0');
        const avgConversion = parseFloat(row.avg_conversion_rate || '0');
        
        // Semáforo de rendimiento
        let performanceStatus: 'green' | 'yellow' | 'red' = 'green';
        if (avgSessions < targetSessions * 0.7) {
          performanceStatus = 'red';
        } else if (avgSessions < targetSessions) {
          performanceStatus = 'yellow';
        }

        return {
          templateName: row.template_name,
          type,
          totalPages: parseInt(row.total_pages || '0'),
          published: parseInt(row.published || '0'),
          avgSeoScore: parseFloat(row.avg_seo_score || '0'),
          avgLocalSignals: parseFloat(row.avg_local_signals || '0'),
          avgSessionsPerDay: avgSessions,
          targetSessionsPerDay: targetSessions,
          avgConversionRate: avgConversion,
          targetConversionRate: {
            'local': 0.30,
            'problem-solution': 0.45,
            'feature': 0.50,
            'comparison': 0.80
          }[type] || 0,
          underperformingPages: parseInt(row.underperforming_pages || '0'),
          performanceStatus
        };
      }),
      growth: growth.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        pagesCreated: parseInt(row.pages_created || '0'),
        pagesPublished: parseInt(row.pages_published || '0')
      }))
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo métricas:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

