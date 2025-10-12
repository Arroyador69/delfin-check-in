import { NextRequest, NextResponse } from 'next/server';

/**
 * Test básico de conectividad al MIR
 * Solo prueba si podemos hacer una petición HTTP básica
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Test básico de conectividad al MIR...');
    
    // Verificar variables de entorno
    const baseUrl = process.env.MIR_BASE_URL;
    const username = process.env.MIR_HTTP_USER;
    const password = process.env.MIR_HTTP_PASS;
    
    if (!baseUrl || !username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Variables de entorno faltantes',
        missing: {
          baseUrl: !baseUrl,
          username: !username,
          password: !password
        }
      }, { status: 400 });
    }

    console.log('📋 Variables disponibles:');
    console.log('  Base URL:', baseUrl);
    console.log('  Username:', username);
    console.log('  Password:', password ? '***' : 'NO');

    // Crear headers básicos
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/xml',
      'Accept': 'application/xml'
    };

    console.log('🔗 Headers preparados:', Object.keys(headers));

    // Intentar una petición básica (GET) al endpoint
    console.log('📡 Intentando petición GET básica...');
    
    try {
      const response = await fetch(baseUrl, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(10000) // 10 segundos timeout
      });

      console.log('📊 Respuesta recibida:');
      console.log('  Status:', response.status);
      console.log('  Status Text:', response.statusText);
      console.log('  Headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const text = await response.text();
        console.log('  Body (primeros 200 chars):', text.substring(0, 200));
        
        return NextResponse.json({
          success: true,
          message: '✅ Conexión básica exitosa',
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: text.substring(0, 500)
        });
      } else {
        const errorText = await response.text();
        console.log('  Error Body:', errorText);
        
        return NextResponse.json({
          success: false,
          message: `❌ Error HTTP ${response.status}`,
          status: response.status,
          statusText: response.statusText,
          error: errorText
        }, { status: response.status });
      }

    } catch (fetchError) {
      console.error('❌ Error en fetch:', fetchError);
      
      return NextResponse.json({
        success: false,
        error: 'Error de conectividad',
        message: fetchError instanceof Error ? fetchError.message : 'Error desconocido',
        type: fetchError instanceof Error ? fetchError.constructor.name : 'Unknown',
        cause: fetchError instanceof Error ? fetchError.cause : null
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
