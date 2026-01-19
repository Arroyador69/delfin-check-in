import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendTelegramMessage, formatWeeklyReport } from '@/lib/telegram';

/**
 * ========================================
 * CRON: Resumen Semanal de Waitlist
 * ========================================
 * Se ejecuta automáticamente cada domingo a las 8:00 AM (hora española)
 * Envía resumen de registros de la última semana vía Telegram
 */

export async function GET(req: NextRequest) {
  try {
    // Verificar que la request viene de Vercel Cron o tiene el secret correcto
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🕐 [WEEKLY REPORT] Iniciando resumen semanal...');

    // Obtener registros de los últimos 7 días
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const weeklyLeadsResult = await sql`
      SELECT COUNT(*) as total
      FROM waitlist
      WHERE created_at >= ${weekAgo}
    `;

    // Obtener total de registros en waitlist
    const totalResult = await sql`
      SELECT COUNT(*) as total
      FROM waitlist
    `;

    // Obtener desglose diario
    const dailyBreakdownResult = await sql`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count
      FROM waitlist
      WHERE created_at >= ${weekAgo}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // Obtener top fuentes de la semana
    const topSourcesResult = await sql`
      SELECT 
        COALESCE(source, 'landing') as source,
        COUNT(*) as count
      FROM waitlist
      WHERE created_at >= ${weekAgo}
      GROUP BY source
      ORDER BY count DESC
      LIMIT 5
    `;

    const weeklyLeads = parseInt(weeklyLeadsResult.rows[0].total);
    const totalLeads = parseInt(totalResult.rows[0].total);
    const dailyBreakdown = dailyBreakdownResult.rows.map(row => ({
      date: row.date,
      count: parseInt(row.count)
    }));
    const topSources = topSourcesResult.rows.map(row => ({
      source: row.source,
      count: parseInt(row.count)
    }));

    console.log(`📊 [WEEKLY REPORT] Semana: ${weeklyLeads}, Total: ${totalLeads}`);

    // Formatear mensaje
    const message = formatWeeklyReport({
      weeklyLeads,
      totalLeads,
      dailyBreakdown,
      topSources,
    });

    // Enviar a Telegram
    const sent = await sendTelegramMessage(message);

    if (!sent) {
      throw new Error('Failed to send Telegram message');
    }

    console.log('✅ [WEEKLY REPORT] Resumen semanal enviado correctamente');

    return NextResponse.json({
      success: true,
      message: 'Weekly report sent',
      stats: {
        weeklyLeads,
        totalLeads,
        dailyBreakdown,
        topSources,
      },
    });

  } catch (error: any) {
    console.error('❌ [WEEKLY REPORT] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
