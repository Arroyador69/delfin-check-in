import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Diagnóstico de conexión MIR...');
    
    const urls = {
      pruebas: 'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      produccion: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion'
    };
    
    const resultados = [];
    
    for (const [entorno, url] of Object.entries(urls)) {
      try {
        console.log(`🔍 Probando ${entorno}: ${url}`);
        
        // Test básico de conectividad
        const startTime = Date.now();
        const response = await fetch(url, {
          method: 'GET',
          signal: AbortSignal.timeout(10000), // 10 segundos
          // @ts-ignore
          agent: new (require('https').Agent)({
            rejectUnauthorized: false
          })
        });
        const endTime = Date.now();
        
        resultados.push({
          entorno,
          url,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          tiempo: `${endTime - startTime}ms`,
          conectividad: 'OK'
        });
        
      } catch (error) {
        resultados.push({
          entorno,
          url,
          error: error instanceof Error ? error.message : 'Error desconocido',
          conectividad: 'ERROR',
          detalles: {
            code: (error as any)?.code,
            cause: (error as any)?.cause?.message
          }
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Diagnóstico completado',
      timestamp: new Date().toISOString(),
      resultados,
      configuracion: {
        usuario: process.env.MIR_HTTP_USER ? '***' : 'No configurado',
        codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR ? '***' : 'No configurado',
        aplicacion: 'Delfin_Check_in',
        codigoEstablecimiento: '0000256653'
      },
      recomendaciones: [
        '1. Verificar que las credenciales estén activas en el MIR',
        '2. Obtener el certificado SSL del MIR e importarlo',
        '3. Verificar conectividad de red',
        '4. Contactar con soporte del MIR si persisten los problemas'
      ]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error en diagnóstico',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
