import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 Test simple del servidor...');
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Servidor funcionando correctamente',
      timestamp: new Date().toISOString(),
      config: {
        usuario: '27380387Z',
        codigoArrendador: '0000146962',
        aplicacion: 'Delfin_Check_in',
        codigoEstablecimiento: '0000256653'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en test simple:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error en test simple',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test POST simple...');
    
    const body = await req.json().catch(() => ({}));
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Test POST funcionando',
      receivedData: body,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en test POST:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error en test POST',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
