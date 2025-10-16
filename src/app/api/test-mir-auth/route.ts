import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🔐 Verificando autenticación MIR con diferentes codificaciones...');
    
    const config = {
      baseUrl: process.env.MIR_BASE_URL || '',
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      aplicacion: 'Delfin_Check_in'
    };

    console.log('📋 Configuración actual:', {
      username: config.username,
      codigoArrendador: config.codigoArrendador,
      baseUrl: config.baseUrl
    });

    // Generar diferentes versiones de autenticación Base64
    const authTests = [
      {
        name: 'Codificación estándar (usuario:contraseña)',
        token: Buffer.from(`${config.username}:${config.password}`).toString('base64'),
        authHeader: `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`
      },
      {
        name: 'Codificación con espacios',
        token: Buffer.from(`${config.username} : ${config.password}`).toString('base64'),
        authHeader: `Basic ${Buffer.from(`${config.username} : ${config.password}`).toString('base64')}`
      },
      {
        name: 'Codificación solo usuario',
        token: Buffer.from(config.username).toString('base64'),
        authHeader: `Basic ${Buffer.from(config.username).toString('base64')}`
      },
      {
        name: 'Codificación con contraseña como usuario',
        token: Buffer.from(`${config.password}:${config.username}`).toString('base64'),
        authHeader: `Basic ${Buffer.from(`${config.password}:${config.username}`).toString('base64')}`
      }
    ];

    const resultados = [];

    for (const authTest of authTests) {
      try {
        console.log(`🧪 Probando: ${authTest.name}`);
        
        // Test simple con HEAD para verificar autenticación
        const res = await fetch(config.baseUrl, {
          method: 'HEAD',
          headers: {
            'Authorization': authTest.authHeader,
            'User-Agent': 'Delfin_Check_in/1.0',
            'Accept': 'text/xml, application/xml, */*'
          },
          signal: AbortSignal.timeout(30000)
        });

        resultados.push({
          test: authTest.name,
          token: authTest.token,
          authHeader: authTest.authHeader,
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          success: res.ok,
          isAuthenticated: res.status !== 401 && res.status !== 403,
          isEndpointValid: res.status !== 404
        });

        console.log(`📊 Resultado: ${res.status} ${res.statusText}`);

      } catch (error) {
        resultados.push({
          test: authTest.name,
          token: authTest.token,
          authHeader: authTest.authHeader,
          error: error instanceof Error ? error.message : 'Error desconocido',
          success: false,
          isAuthenticated: false,
          isEndpointValid: false
        });
      }
    }

    // Analizar resultados
    const authExitoso = resultados.find(r => r.isAuthenticated && r.isEndpointValid);
    const endpointValido = resultados.find(r => r.isEndpointValid);

    return NextResponse.json({
      success: true,
      message: 'Test de autenticación MIR completado',
      configuracion: {
        username: config.username,
        codigoArrendador: config.codigoArrendador,
        baseUrl: config.baseUrl,
        aplicacion: config.aplicacion
      },
      resultados,
      analisis: {
        totalTests: resultados.length,
        autenticacionesExitosas: resultados.filter(r => r.isAuthenticated).length,
        endpointsValidos: resultados.filter(r => r.isEndpointValid).length,
        mejorResultado: authExitoso || endpointValido || resultados[0]
      },
      recomendaciones: authExitoso ? [
        '✅ ¡Autenticación exitosa encontrada!',
        `Usar: ${authExitoso.test}`,
        `Header: ${authExitoso.authHeader}`,
        'El sistema está listo para enviar registros al MIR'
      ] : endpointValido ? [
        '⚠️ Endpoint válido pero problemas de autenticación',
        'Verificar credenciales en el registro del MIR',
        'Contactar soporte MIR si las credenciales son correctas'
      ] : [
        '❌ Problemas de conectividad o endpoint',
        'Verificar URL del MIR',
        'Verificar conectividad de red'
      ]
    });

  } catch (error) {
    console.error('❌ Error en test de autenticación MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test de autenticación MIR',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
