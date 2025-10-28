import { NextRequest, NextResponse } from 'next/server';
import { getMarketData } from '@/lib/dynamic-pricing';

export async function GET(request: NextRequest) {
  // Deshabilitado temporalmente para MVP
  return NextResponse.json(
    { success: false, error: 'Endpoint deshabilitado temporalmente (MVP)' },
    { status: 404 }
  );
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('from');
    const endDate = searchParams.get('to');
    const roomType = searchParams.get('roomType') || 'standard';

    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Faltan parámetros requeridos: from, to'
      }, { status: 400 });
    }

    // Validar formato de fechas
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Formato de fecha inválido'
      }, { status: 400 });
    }

    if (start > end) {
      return NextResponse.json({
        success: false,
        error: 'La fecha de inicio debe ser anterior a la fecha de fin'
      }, { status: 400 });
    }

    const marketData = await getMarketData(startDate, endDate, roomType);

    return NextResponse.json({
      success: true,
      data: marketData,
      meta: {
        startDate,
        endDate,
        roomType,
        totalDays: marketData.length,
        avgSampleSize: marketData.length > 0 
          ? Math.round(marketData.reduce((sum, d) => sum + d.sampleSize, 0) / marketData.length)
          : 0
      }
    });

  } catch (error) {
    console.error('Error obteniendo datos de mercado:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}
