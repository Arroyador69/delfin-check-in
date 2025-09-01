import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Limpiar todas las reservas del almacenamiento del servidor
    global.serverStorage.reservations = [];
    
    return NextResponse.json({
      success: true,
      message: 'Todas las reservas han sido eliminadas',
      count: 0
    });
  } catch (error) {
    console.error('Error clearing reservations:', error);
    return NextResponse.json(
      { error: 'Error al limpiar las reservas' },
      { status: 500 }
    );
  }
}
