import { NextRequest, NextResponse } from 'next/server';
import { applyPriceRecommendation } from '@/lib/dynamic-pricing';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, date, price, applyToAll = false } = body;

    if (!roomId || !date || price === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Faltan parámetros requeridos: roomId, date, price'
      }, { status: 400 });
    }

    // Validar roomId
    const validRoomIds = ['room_1', 'room_2', 'room_3', 'room_4', 'room_5', 'room_6'];
    if (!validRoomIds.includes(roomId)) {
      return NextResponse.json({
        success: false,
        error: 'roomId inválido'
      }, { status: 400 });
    }

    // Validar precio
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Precio inválido'
      }, { status: 400 });
    }

    // Validar fecha
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json({
        success: false,
        error: 'Fecha inválida'
      }, { status: 400 });
    }

    // Aplicar recomendación
    await applyPriceRecommendation(roomId, date, priceNum);

    // Si se solicita aplicar a todas las fechas similares (mismo día de la semana)
    if (applyToAll) {
      const dayOfWeek = dateObj.getDay();
      const today = new Date();
      
      // Aplicar a los próximos 90 días para el mismo día de la semana
      for (let i = 0; i < 90; i++) {
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + i);
        
        if (futureDate.getDay() === dayOfWeek) {
          await applyPriceRecommendation(roomId, futureDate.toISOString().split('T')[0], priceNum);
        }
      }
    }

    // Registrar la aplicación en logs
    await sql`
      INSERT INTO price_recommendations (room_id, date, current_price, recommended_price, applied)
      VALUES (${roomId}, ${date}, ${priceNum}, ${priceNum}, true)
      ON CONFLICT (room_id, date) 
      DO UPDATE SET 
        current_price = EXCLUDED.current_price,
        recommended_price = EXCLUDED.recommended_price,
        applied = true
    `;

    return NextResponse.json({
      success: true,
      message: `Precio aplicado: €${priceNum} para ${roomId} el ${date}`,
      data: {
        roomId,
        date,
        price: priceNum,
        appliedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error aplicando precio:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}
