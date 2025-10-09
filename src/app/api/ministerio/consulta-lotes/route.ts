import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClient } from '@/lib/ministerio-client';
import { getMirComunicaciones, updateMirComunicacion } from '@/lib/mir-db';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Consulta de lotes MIR iniciada...');
    
    // Obtener todas las comunicaciones enviadas que tienen lote
    const comunicacionesEnviadas = await getMirComunicaciones('enviado');
    const lotes = comunicacionesEnviadas
      .filter(com => com.lote)
      .map(com => com.lote!);
    
    if (lotes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay lotes para consultar',
        lotes: [],
        resultados: []
      }, {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('📋 Consultando lotes:', lotes);
    
    // Configuración del MIR
    // Las credenciales DEBEN estar en variables de entorno (Vercel/local .env)
    const config = {
      baseUrl: process.env.MIR_BASE_URL || 'https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: process.env.MIR_HTTP_USER || '',
      password: process.env.MIR_HTTP_PASS || '',
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR || '',
      aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in',
      simulacion: false // CONSULTA REAL AL MIR
    };
    
    // Crear cliente MIR
    const client = new MinisterioClient(config);
    
    // Consultar estado de los lotes
    const resultado = await client.consultaLote(lotes);
    
    console.log('✅ Resultado de consulta de lotes:', resultado);
    
    // Actualizar estado de las comunicaciones según el resultado
    if (resultado.ok && resultado.resultados) {
      for (const resultadoLote of resultado.resultados) {
        const comunicacion = comunicacionesEnviadas.find(com => com.lote === resultadoLote.lote);
        if (comunicacion) {
          let nuevoEstado = 'enviado';
          
          // Mapear códigos de estado del MIR
          switch (resultadoLote.codigoEstado) {
            case '1': // Procesado correctamente
              nuevoEstado = 'confirmado';
              break;
            case '4': // Pendiente de procesamiento
            case '5': // En proceso
              nuevoEstado = 'enviado';
              break;
            case '6': // Procesado con errores
              nuevoEstado = 'error';
              break;
            default:
              nuevoEstado = 'enviado';
          }
          
          // Actualizar en base de datos
          await updateMirComunicacion(comunicacion.referencia, {
            estado: nuevoEstado as any,
            resultado: resultadoLote
          });
          
          console.log(`✅ Actualizada comunicación ${comunicacion.referencia} a estado: ${nuevoEstado}`);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Consulta de lotes completada',
      lotes: lotes,
      resultado: resultado,
      actualizadas: resultado.ok ? resultado.resultados?.length || 0 : 0
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error en consulta de lotes:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en consulta de lotes',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
