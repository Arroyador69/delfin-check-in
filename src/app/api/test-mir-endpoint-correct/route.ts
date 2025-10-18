import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Probando endpoint correcto del MIR...');
    
    const config = {
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      aplicacion: 'Delfin_Check_in'
    };

    // Generar autenticación
    const token = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    const authHeader = `Basic ${token}`;

    // Según la documentación del MIR, probar diferentes endpoints
    const endpoints = [
      {
        name: 'Endpoint actual (producción)',
        url: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion'
      },
      {
        name: 'Endpoint sin /v1',
        url: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/comunicacion'
      },
      {
        name: 'Endpoint con /ws/soap',
        url: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/soap/comunicacion'
      },
      {
        name: 'Endpoint con /ws/soap/v1',
        url: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/soap/v1/comunicacion'
      },
      {
        name: 'Endpoint base + /comunicacion',
        url: 'https://hospedajes.ses.mir.es/hospedajes-web/comunicacion'
      },
      {
        name: 'Endpoint con /services',
        url: 'https://hospedajes.ses.mir.es/hospedajes-web/services/comunicacion'
      }
    ];

    const resultados = [];

    for (const endpoint of endpoints) {
      try {
        console.log(`🧪 Probando: ${endpoint.name} - ${endpoint.url}`);
        
        // Test con HEAD para verificar si el endpoint existe
        const res = await fetch(endpoint.url, {
          method: 'HEAD',
          headers: {
            'Authorization': authHeader,
            'User-Agent': 'Delfin_Check_in/1.0',
            'Accept': 'text/xml, application/xml, */*'
          },
          signal: AbortSignal.timeout(30000)
        });

        resultados.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          method: 'HEAD',
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          success: res.ok,
          isEndpointValid: res.status !== 404 && res.status !== 500,
          isAuthenticated: res.status !== 401 && res.status !== 403
        });

        console.log(`📊 Resultado: ${res.status} ${res.statusText}`);

        // Si el endpoint responde bien, probar POST
        if (res.status === 200 || res.status === 405) { // 405 = Method Not Allowed pero endpoint existe
          try {
            const resPost = await fetch(endpoint.url, {
              method: 'POST',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'text/xml; charset=utf-8',
                'User-Agent': 'Delfin_Check_in/1.0',
                'Accept': 'text/xml, application/xml, */*'
              },
              body: '<?xml version="1.0" encoding="UTF-8"?><test>test</test>',
              signal: AbortSignal.timeout(30000)
            });

            const textPost = await resPost.text();
            
            resultados.push({
              endpoint: `${endpoint.name} (POST)`,
              url: endpoint.url,
              method: 'POST',
              status: resPost.status,
              statusText: resPost.statusText,
              headers: Object.fromEntries(resPost.headers.entries()),
              body: textPost.substring(0, 500),
              success: resPost.ok,
              isEndpointValid: resPost.status !== 404 && resPost.status !== 500,
              isAuthenticated: resPost.status !== 401 && resPost.status !== 403
            });
          } catch (errorPost) {
            resultados.push({
              endpoint: `${endpoint.name} (POST)`,
              url: endpoint.url,
              method: 'POST',
              error: errorPost instanceof Error ? errorPost.message : 'Error desconocido',
              success: false,
              isEndpointValid: false,
              isAuthenticated: false
            });
          }
        }

      } catch (error) {
        resultados.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          method: 'HEAD',
          error: error instanceof Error ? error.message : 'Error desconocido',
          success: false,
          isEndpointValid: false,
          isAuthenticated: false
        });
      }
    }

    // Analizar resultados
    const endpointValido = resultados.find(r => r.isEndpointValid);
    const endpointConPOST = resultados.find(r => r.method === 'POST' && r.isEndpointValid);

    return NextResponse.json({
      success: true,
      message: 'Test de endpoint correcto MIR completado',
      configuracion: {
        username: config.username,
        codigoArrendador: config.codigoArrendador,
        aplicacion: config.aplicacion
      },
      resultados,
      analisis: {
        totalTests: resultados.length,
        endpointsValidos: resultados.filter(r => r.isEndpointValid).length,
        endpointsConPOST: resultados.filter(r => r.method === 'POST' && r.isEndpointValid).length,
        mejorEndpoint: endpointConPOST || endpointValido
      },
      recomendaciones: endpointConPOST ? [
        '🎉 ¡Endpoint correcto encontrado!',
        `Usar: ${endpointConPOST.endpoint}`,
        `URL: ${endpointConPOST.url}`,
        'El sistema está listo para configurar con este endpoint'
      ] : endpointValido ? [
        '⚠️ Endpoint válido encontrado pero sin soporte POST',
        `URL: ${endpointValido.url}`,
        'Verificar documentación MIR para método correcto'
      ] : [
        '❌ Ningún endpoint responde correctamente',
        'Verificar documentación MIR actualizada',
        'Contactar soporte MIR para endpoint correcto'
      ]
    });

  } catch (error) {
    console.error('❌ Error en test de endpoint correcto MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test de endpoint correcto MIR',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}





