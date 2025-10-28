import { NextRequest } from 'next/server';
import { MinisterioClient, getMinisterioConfigFromEnv } from '@/lib/ministerio-client';

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 Test endpoint de consulta de lote MIR...');
    
    const body = await req.json();
    const lotes = body.lotes || ["SIM-TEST-001", "SIM-TEST-002"];
    
    console.log('📋 Consultando lotes:', lotes);
    
    // Configuración para test (usa variables de entorno)
    const config = {
      baseUrl: 'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      aplicacion: 'Delfin_Check_in',
      simulacion: true // Forzar modo simulación
    };
    
    const client = new MinisterioClient(config);
    const result = await client.consultaLote({ lotes });
    
    console.log('✅ Resultado de consulta:', result);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Test de consulta MIR completado',
      config: {
        simulacion: config.simulacion,
        codigoArrendador: config.codigoArrendador
      },
      resultado: result,
      lotesConsultados: lotes
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en test consulta MIR:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Error en test consulta MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

