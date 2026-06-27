import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';
import { toFiniteNumber } from '@/lib/numbers';

// =====================================================
// GET: Obtener estadísticas de Radar Reach
// =====================================================
export async function GET(req: NextRequest) {
  try {
    const { error, payload } = await verifySuperAdmin(req);
    if (error) return error;

    // Estadísticas de Radar (Señales)
    const signalsStats = await sql`
      SELECT 
        COUNT(*) as total_signals,
        COUNT(*) FILTER (WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())) as active_signals,
        COUNT(*) FILTER (WHERE processed = true) as processed_signals,
        COUNT(*) FILTER (WHERE processed = false) as unprocessed_signals,
        AVG(signal_intensity) as avg_intensity
      FROM radar_signals
    `;

    // Estadísticas de Reach (Landings)
    const landingsStats = await sql`
      SELECT 
        COUNT(*) as total_landings,
        COUNT(*) FILTER (WHERE status = 'active' AND is_published = true) as published_landings,
        COUNT(*) FILTER (WHERE status = 'draft') as draft_landings,
        SUM(views) as total_views,
        SUM(conversions) as total_conversions,
        CASE 
          WHEN SUM(views) > 0 THEN ROUND((SUM(conversions)::DECIMAL / SUM(views)) * 100, 2)
          ELSE 0
        END as overall_conversion_rate
      FROM dynamic_landings
    `;

    // Señales por tipo
    const signalsByType = await sql`
      SELECT 
        signal_type,
        COUNT(*) as count,
        AVG(signal_intensity) as avg_intensity
      FROM radar_signals
      WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())
      GROUP BY signal_type
      ORDER BY count DESC
    `;

    // Landings más vistas
    const topLandings = await sql`
      SELECT 
        dl.slug,
        dl.views,
        dl.conversions,
        tp.property_name,
        t.name as tenant_name
      FROM dynamic_landings dl
      JOIN tenant_properties tp ON dl.property_id = tp.id
      JOIN tenants t ON dl.tenant_id = t.id
      WHERE dl.is_published = true
      ORDER BY dl.views DESC
      LIMIT 5
    `;

    // Señales recientes (últimas 5)
    const recentSignals = await sql`
      SELECT 
        rs.id,
        rs.signal_type,
        rs.signal_intensity,
        rs.detected_at,
        rs.processed,
        tp.property_name,
        t.name as tenant_name
      FROM radar_signals rs
      JOIN tenant_properties tp ON rs.property_id = tp.id
      JOIN tenants t ON rs.tenant_id = t.id
      ORDER BY rs.detected_at DESC
      LIMIT 5
    `;

    const signalsData = signalsStats.rows[0];
    const landingsData = landingsStats.rows[0];

    return NextResponse.json({
      success: true,
      stats: {
        signals: {
          total: toFiniteNumber(signalsData.total_signals, 0),
          active: toFiniteNumber(signalsData.active_signals, 0),
          processed: toFiniteNumber(signalsData.processed_signals, 0),
          unprocessed: toFiniteNumber(signalsData.unprocessed_signals, 0),
          avg_intensity: toFiniteNumber(signalsData.avg_intensity, 0),
        },
        landings: {
          total: toFiniteNumber(landingsData.total_landings, 0),
          published: toFiniteNumber(landingsData.published_landings, 0),
          draft: toFiniteNumber(landingsData.draft_landings, 0),
          total_views: toFiniteNumber(landingsData.total_views, 0),
          total_conversions: toFiniteNumber(landingsData.total_conversions, 0),
          conversion_rate: toFiniteNumber(landingsData.overall_conversion_rate, 0),
        },
        signals_by_type: signalsByType.rows.map((row: Record<string, unknown>) => ({
          signal_type: row.signal_type,
          count: toFiniteNumber(row.count, 0),
          avg_intensity: toFiniteNumber(row.avg_intensity, 0),
        })),
        top_landings: topLandings.rows,
        recent_signals: recentSignals.rows.map((row: Record<string, unknown>) => ({
          ...row,
          signal_intensity: toFiniteNumber(row.signal_intensity, 0),
        })),
      },
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo estadísticas de Radar Reach:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

