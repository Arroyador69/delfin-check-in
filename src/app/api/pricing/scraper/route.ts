import { NextRequest, NextResponse } from 'next/server';
import { initializeLocalCompetitors, scrapeLocalPrices, getLocalCompetitionStats } from '@/lib/fuengirola-scraper';

/**
 * GET - Obtener estadísticas del scraper local
 */
export async function GET(request: NextRequest) {
  // Deshabilitado temporalmente para MVP
  return NextResponse.json(
    { success: false, error: 'Endpoint deshabilitado temporalmente (MVP)' },
    { status: 404 }
  );
  try {
    const stats = await getLocalCompetitionStats();
    
    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        location: 'Fuengirola, Málaga',
        lastScrapedFormatted: stats.lastScraped 
          ? new Date(stats.lastScraped).toLocaleString('es-ES', {
              timeZone: 'Europe/Madrid',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Nunca'
      }
    });
  } catch (error) {
    console.error('Error obteniendo estadísticas del scraper:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor al obtener estadísticas del scraper' },
      { status: 500 }
    );
  }
}

/**
 * POST - Ejecutar scraping de competidores locales
 */
export async function POST(request: NextRequest) {
  // Deshabilitado temporalmente para MVP
  return NextResponse.json(
    { success: false, error: 'Endpoint deshabilitado temporalmente (MVP)' },
    { status: 404 }
  );
  try {
    const { action, startDate, endDate } = await request.json();
    
    if (action === 'initialize') {
      console.log('🏨 Inicializando competidores locales de Fuengirola...');
      await initializeLocalCompetitors();
      
      return NextResponse.json({
        success: true,
        message: 'Competidores locales de Fuengirola inicializados correctamente',
        data: {
          action: 'initialize',
          competitors: 4, // Número de competidores configurados
          location: 'Fuengirola, Málaga'
        }
      });
    }
    
    if (action === 'scrape') {
      const from = startDate || new Date().toISOString().split('T')[0];
      const to = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      console.log(`📊 Iniciando scraping de precios locales del ${from} al ${to}...`);
      await scrapeLocalPrices(from, to);
      
      // Obtener estadísticas actualizadas
      const stats = await getLocalCompetitionStats();
      
      return NextResponse.json({
        success: true,
        message: `Scraping completado para el rango ${from} - ${to}`,
        data: {
          action: 'scrape',
          dateRange: { from, to },
          ...stats,
          location: 'Fuengirola, Málaga'
        }
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Acción no válida. Use "initialize" o "scrape"' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error ejecutando scraper:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor al ejecutar scraper: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
