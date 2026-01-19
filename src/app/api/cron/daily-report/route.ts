import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendTelegramMessage, formatDailyReport } from '@/lib/telegram';

/**
 * ========================================
 * CRON: Resumen Diario de Waitlist
 * ========================================
 * Se ejecuta automáticamente cada día a las 8:00 AM (hora española)
 * Envía resumen de registros del día anterior vía Telegram
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

    console.log('🕐 [DAILY REPORT] Iniciando resumen diario...');

    // Obtener registros de las últimas 24 horas
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const newLeadsResult = await sql`
      SELECT email, name, source, created_at
      FROM waitlist
      WHERE created_at >= ${yesterday}
      ORDER BY created_at DESC
    `;

    // Obtener total de registros en waitlist
    const totalResult = await sql`
      SELECT COUNT(*) as total
      FROM waitlist
    `;

    const newLeads = newLeadsResult.rows.length;
    const totalLeads = parseInt(totalResult.rows[0].total);
    const newLeadsList = newLeadsResult.rows.map(row => ({
      email: row.email,
      name: row.name,
      source: row.source,
      created_at: row.created_at
    }));

    console.log(`📊 [DAILY REPORT] Nuevos: ${newLeads}, Total: ${totalLeads}`);

    // Formatear mensaje
    const message = formatDailyReport({
      newLeads,
      totalLeads,
      newLeadsList,
    });

    // Enviar a Telegram
    const sent = await sendTelegramMessage(message);

    if (!sent) {
      throw new Error('Failed to send Telegram message');
    }

    console.log('✅ [DAILY REPORT] Resumen enviado correctamente');

    return NextResponse.json({
      success: true,
      message: 'Daily report sent',
      stats: {
        newLeads,
        totalLeads,
      },
    });

  } catch (error: any) {
    console.error('❌ [DAILY REPORT] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
