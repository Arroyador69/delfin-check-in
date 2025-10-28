import { NextRequest, NextResponse } from 'next/server';
import { 
  generatePriceRecommendations, 
  savePriceRecommendations,
  getPriceRecommendations 
} from '@/lib/dynamic-pricing';

export async function GET(request: NextRequest) {
  // Deshabilitado temporalmente para MVP
  return NextResponse.json(
    { success: false, error: 'Endpoint deshabilitado temporalmente (MVP)' },
    { status: 404 }
  );
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const startDate = searchParams.get('from');
    const endDate = searchParams.get('to');

    if (!roomId || !startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Faltan parámetros requeridos: roomId, from, to'
      }, { status: 400 });
    }

    // Validar roomId
    const validRoomIds = ['room_1', 'room_2', 'room_3', 'room_4', 'room_5', 'room_6'];
    if (!validRoomIds.includes(roomId)) {
      return NextResponse.json({
        success: false,
        error: 'roomId inválido. Debe ser: room_1, room_2, room_3, room_4, room_5, o room_6'
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

    // Limitar el rango a 90 días máximo
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      return NextResponse.json({
        success: false,
        error: 'El rango de fechas no puede exceder 90 días'
      }, { status: 400 });
    }

    // Obtener recomendaciones existentes o generar nuevas
    const forceRegenerate = searchParams.get('regenerate') === 'true';
    
    let recommendations;
    if (forceRegenerate) {
      recommendations = await generatePriceRecommendations(roomId, startDate, endDate);
      await savePriceRecommendations(recommendations);
    } else {
      recommendations = await getPriceRecommendations(roomId, startDate, endDate);
      
      // Si no hay recomendaciones, generar nuevas
      if (recommendations.length === 0) {
        recommendations = await generatePriceRecommendations(roomId, startDate, endDate);
        await savePriceRecommendations(recommendations);
      }
    }

    // Calcular estadísticas
    const stats = {
      totalDays: recommendations.length,
      avgRecommendedPrice: recommendations.length > 0 
        ? Math.round(recommendations.reduce((sum, r) => sum + r.recommendedPrice, 0) / recommendations.length * 100) / 100
        : 0,
      avgConfidence: recommendations.length > 0
        ? Math.round(recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length * 100) / 100
        : 0,
      appliedCount: recommendations.filter(r => r.applied).length,
      highConfidenceCount: recommendations.filter(r => r.confidence >= 0.7).length
    };

    return NextResponse.json({
      success: true,
      data: recommendations,
      stats,
      meta: {
        roomId,
        startDate,
        endDate,
        generated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error obteniendo recomendaciones:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Deshabilitado temporalmente para MVP
  return NextResponse.json(
    { success: false, error: 'Endpoint deshabilitado temporalmente (MVP)' },
    { status: 404 }
  );
  try {
    const body = await request.json();
    const { roomId, startDate, endDate } = body;

    if (!roomId || !startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Faltan parámetros requeridos: roomId, from, to'
      }, { status: 400 });
    }

    // Generar nuevas recomendaciones
    const recommendations = await generatePriceRecommendations(roomId, startDate, endDate);
    await savePriceRecommendations(recommendations);

    return NextResponse.json({
      success: true,
      message: `${recommendations.length} recomendaciones generadas`,
      data: recommendations
    });

  } catch (error) {
    console.error('Error generando recomendaciones:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}
