import { NextRequest, NextResponse } from 'next/server';

/**
 * Test muy simple de conectividad al MIR
 * Solo intenta hacer una petición básica sin autenticación ni SSL complejo
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Test simple de conectividad al MIR...');
    
    const baseUrl = process.env.MIR_BASE_URL || '';
    console.log('🌐 URL del MIR:', baseUrl);
    
    if (!baseUrl) {
      return NextResponse.json({
        success: false,
        error: 'Variable MIR_BASE_URL no configurada'
      }, { status: 400 });
    }
    
    // Test 1: DNS resolution y conectividad básica
    console.log('📡 Test 1: Intentando resolver DNS y conectar...');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(baseUrl, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      console.log('✅ Test 1 exitoso:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      return NextResponse.json({
        success: true,
        message: '✅ Conectividad básica exitosa',
        test1: {
          status: response.status,
          statusText: response.statusText,
          reachable: true
        }
      });
      
    } catch (error: any) {
      console.error('❌ Test 1 fallido:', error);
      
      return NextResponse.json({
        success: false,
        error: 'No se pudo conectar al MIR',
        message: error.message,
        details: {
          name: error.name,
          code: error.code,
          cause: error.cause?.toString()
        }
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test simple',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
