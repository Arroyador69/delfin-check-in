import { NextRequest, NextResponse } from 'next/server';
import { MinisterioClientOfficial } from '@/lib/ministerio-client-official';
import { updateMirComunicacion } from '@/lib/mir-db';

export async function POST(req: NextRequest) {
  try {
    console.log('🚫 Anulación oficial de lote MIR iniciada...');
    
    const json = await req.json().catch(() => undefined);
    
    if (!json) {
      console.error('❌ Datos JSON inválidos o vacíos');
      return NextResponse.json({ 
        error: 'Datos JSON inválidos o vacíos' 
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { lote, referencia } = json;
    
    if (!lote) {
      return NextResponse.json({
        success: false,
        error: 'Lote requerido',
        message: 'Debe proporcionar el código de lote a anular'
      }, { status: 400 });
    }

    console.log('📋 Anulando lote:', lote, 'referencia:', referencia);

    // Verificar credenciales MIR
    if (!process.env.MIR_HTTP_USER || !process.env.MIR_HTTP_PASS || !process.env.MIR_CODIGO_ARRENDADOR) {
      return NextResponse.json({
        success: false,
        error: 'Credenciales MIR no configuradas',
        message: 'Falta configurar MIR_HTTP_USER, MIR_HTTP_PASS o MIR_CODIGO_ARRENDADOR'
      }, { status: 400 });
    }

    // Configuración del MIR con credenciales correctas
    const config = {
      baseUrl: process.env.MIR_BASE_URL || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      username: process.env.MIR_HTTP_USER,
      password: process.env.MIR_HTTP_PASS,
      codigoArrendador: process.env.MIR_CODIGO_ARRENDADOR,
      aplicacion: process.env.MIR_APLICACION || 'Delfin_Check_in',
      simulacion: process.env.MIR_SIMULACION === 'true'
    };

    console.log('📋 Configuración MIR oficial para anulación:', {
      baseUrl: config.baseUrl,
      username: config.username,
      codigoArrendador: config.codigoArrendador,
      simulacion: config.simulacion
    });

    // Crear cliente MIR oficial
    const client = new MinisterioClientOfficial(config);
    
    // Anular lote
    const resultado = await client.anulacionLote({ lote });
    
    console.log('✅ Resultado de la anulación oficial:', resultado);

    // Actualizar estado en base de datos si se proporciona referencia
    if (referencia && resultado.ok) {
      try {
        await updateMirComunicacion(referencia, {
          estado: 'anulado',
          resultado: JSON.stringify(resultado),
          error: null
        });
        console.log('💾 Estado actualizado en BD para referencia:', referencia);
      } catch (dbError) {
        console.warn('⚠️ Error actualizando BD:', dbError);
        // No fallar la operación por error de BD
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Anulación oficial completada',
      resultado: {
        exito: resultado.ok,
        codigo: resultado.codigo,
        descripcion: resultado.descripcion
      },
      interpretacion: {
        exito: resultado.ok,
        mensaje: resultado.ok ? 
          `✅ Lote ${lote} anulado correctamente` : 
          `❌ Error anulando lote: ${resultado.descripcion}`,
        codigo: resultado.codigo,
        lote: lote
      },
      debug: {
        loteAnulado: lote,
        referencia: referencia || 'No proporcionada',
        config: {
          baseUrl: config.baseUrl,
          username: config.username,
          codigoArrendador: config.codigoArrendador,
          simulacion: config.simulacion
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en anulación oficial:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en anulación oficial',
      message: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

