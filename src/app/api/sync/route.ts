import { NextRequest, NextResponse } from 'next/server';
import { manualSync } from '@/lib/ical-sync';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando sincronización manual...');
    
    const result = await manualSync();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        reservationsAdded: result.reservationsAdded
      });
    } else {
      return NextResponse.json({
        success: false,
        message: result.message
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error en sincronización:', error);
    return NextResponse.json({
      success: false,
      message: 'Error interno del servidor'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint de sincronización disponible. Usa POST para sincronizar.',
    endpoints: {
      sync: 'POST /api/sync - Sincronizar todos los iCal',
      ical: 'GET /api/ical/[roomId] - Obtener iCal de una habitación'
    }
  });
}
