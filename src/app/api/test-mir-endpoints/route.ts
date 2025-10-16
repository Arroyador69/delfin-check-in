import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Probando diferentes endpoints MIR...');
    
    const config = {
      baseUrl: process.env.MIR_BASE_URL || '',
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      aplicacion: 'Delfin_Check_in'
    };

    // Generar Basic Auth
    const token = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    const authHeader = `Basic ${token}`;

    // Diferentes endpoints a probar
    const endpoints = [
      {
        name: 'Endpoint actual',
        url: config.baseUrl,
        method: 'POST'
      },
      {
        name: 'Sin /comunicacion',
        url: config.baseUrl.replace('/comunicacion', ''),
        method: 'POST'
      },
      {
        name: 'Con /comunicacion/',
        url: config.baseUrl.replace('/comunicacion', '/comunicacion/'),
        method: 'POST'
      },
      {
        name: 'Con /ws/',
        url: config.baseUrl.replace('/ws/v1/comunicacion', '/ws/'),
        method: 'POST'
      },
      {
        name: 'Solo base',
        url: 'https://hospedajes.ses.mir.es/hospedajes-web/',
        method: 'POST'
      }
    ];

    const resultados = [];

    for (const endpoint of endpoints) {
      try {
        console.log(`🧪 Probando: ${endpoint.name} - ${endpoint.url}`);
        
        // Test simple con GET primero
        const res = await fetch(endpoint.url, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'User-Agent': 'Delfin_Check_in/1.0',
            'Accept': 'text/xml, application/xml, */*'
          },
          signal: AbortSignal.timeout(30000)
        });

        const text = await res.text();
        
        resultados.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          method: 'GET',
          status: res.status,
          statusText: res.statusText,
          headers: Object.fromEntries(res.headers.entries()),
          body: text.substring(0, 500),
          success: res.ok
        });

        // Si GET funciona, probar POST
        if (res.ok || res.status === 405) { // 405 = Method Not Allowed, pero endpoint existe
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
              success: resPost.ok
            });
          } catch (errorPost) {
            resultados.push({
              endpoint: `${endpoint.name} (POST)`,
              url: endpoint.url,
              method: 'POST',
              error: errorPost instanceof Error ? errorPost.message : 'Error desconocido',
              success: false
            });
          }
        }

      } catch (error) {
        resultados.push({
          endpoint: endpoint.name,
          url: endpoint.url,
          method: endpoint.method,
          error: error instanceof Error ? error.message : 'Error desconocido',
          success: false
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test de endpoints MIR completado',
      configuracion: {
        baseUrl: config.baseUrl,
        username: config.username,
        codigoArrendador: config.codigoArrendador,
        aplicacion: config.aplicacion
      },
      resultados,
      resumen: {
        totalTests: resultados.length,
        exitosos: resultados.filter(r => r.success).length,
        fallidos: resultados.filter(r => !r.success).length,
        endpointsConectados: resultados.filter(r => r.status && r.status !== 404).length
      },
      recomendaciones: resultados.filter(r => r.success).length > 0 ? [
        '✅ Se encontraron endpoints funcionales',
        'Revisar cuál es el endpoint correcto según la documentación MIR'
      ] : [
        '⚠️ Ningún endpoint responde correctamente',
        'Verificar credenciales y configuración',
        'Contactar soporte MIR si el problema persiste'
      ]
    });

  } catch (error) {
    console.error('❌ Error en test de endpoints MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en test de endpoints MIR',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
