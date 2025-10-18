import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { MinisterioClient, getMinisterioConfigFromEnv } from '@/lib/ministerio-client';

export async function POST(req: NextRequest) {
  try {
    const { lotes } = await req.json();
    
    if (!lotes || !Array.isArray(lotes) || lotes.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Se requiere un array de lotes para consultar'
      }, { status: 400 });
    }

    if (lotes.length > 10) {
      return NextResponse.json({
        success: false,
        error: 'Máximo 10 lotes por consulta según normas MIR'
      }, { status: 400 });
    }

    console.log(`🔍 Consultando ${lotes.length} lotes al MIR:`, lotes);

    // Configurar cliente MIR
    const config = getMinisterioConfigFromEnv();
    const cliente = new MinisterioClient(config);

    // Consultar lotes al MIR
    const resultado = await cliente.consultaLote({ lotes });
    
    console.log('📊 Resultado consulta lotes:', resultado);

    if (!resultado.ok) {
      console.error('❌ Error en consulta MIR:', resultado.descripcion);
      return NextResponse.json({
        success: false,
        error: `Error del MIR: ${resultado.descripcion}`,
        codigo: resultado.codigo,
        descripcion: resultado.descripcion
      }, { status: 500 });
    }

    // Procesar resultados y actualizar base de datos
    const cambios = [];
    const resultados = [];

    if (resultado.resultados) {
      for (const loteResult of resultado.resultados) {
        resultados.push(loteResult);
        
        // Determinar el nuevo estado según el código MIR
        let nuevoEstado = 'enviado';
        let codigoComunicacion = null;
        let descEstado = loteResult.descEstado || '';

        switch (loteResult.codigoEstado) {
          case '1': // Procesado correctamente
            nuevoEstado = 'confirmado';
            // Buscar código de comunicación si está disponible
            if (loteResult.resultadoComunicaciones && loteResult.resultadoComunicaciones.length > 0) {
              const primeraComunicacion = loteResult.resultadoComunicaciones[0];
              if (primeraComunicacion.codigoComunicacion) {
                codigoComunicacion = primeraComunicacion.codigoComunicacion;
              }
            }
            break;
          case '4': // Pendiente de procesamiento
            nuevoEstado = 'enviado';
            break;
          case '5': // Error en procesamiento
            nuevoEstado = 'error';
            descEstado = 'Error en procesamiento por el MIR';
            break;
          case '6': // Anulado
            nuevoEstado = 'error';
            descEstado = 'Comunicación anulada';
            break;
        }

        // Actualizar base de datos con el nuevo estado
        try {
          await sql`
            UPDATE guest_registrations 
            SET data = jsonb_set(
              jsonb_set(
                COALESCE(data, '{}'::jsonb),
                '{mir_status}',
                COALESCE(data->'mir_status', '{}'::jsonb) || jsonb_build_object(
                  'lote', ${loteResult.lote},
                  'codigoEstado', ${loteResult.codigoEstado},
                  'descEstado', ${descEstado},
                  'ultimaConsulta', ${new Date().toISOString()},
                  ${codigoComunicacion ? `'codigoComunicacion', ${codigoComunicacion},` : ''}
                  'error', ${nuevoEstado === 'error' ? descEstado : null}
                )
              ),
              '{mir_status}',
              COALESCE(data->'mir_status', '{}'::jsonb) || jsonb_build_object(
                'estado', ${nuevoEstado}
              )
            )
            WHERE data->'mir_status'->>'lote' = ${loteResult.lote}
          `;

          // Registrar cambio
          cambios.push({
            lote: loteResult.lote,
            codigoEstado: loteResult.codigoEstado,
            nuevoEstado,
            descripcion: descEstado || `Estado actualizado a ${nuevoEstado}`,
            codigoComunicacion
          });

          console.log(`✅ Actualizado lote ${loteResult.lote}: ${nuevoEstado} (${loteResult.codigoEstado})`);

        } catch (dbError) {
          console.error(`❌ Error actualizando lote ${loteResult.lote} en BD:`, dbError);
        }
      }
    }

    // Log de cambios realizados
    if (cambios.length > 0) {
      console.log(`📝 Se realizaron ${cambios.length} cambios de estado:`, cambios);
    }

    return NextResponse.json({
      success: true,
      mensaje: `Consulta realizada correctamente - ${lotes.length} lotes consultados`,
      lotesConsultados: lotes.length,
      resultados: resultados,
      cambios: cambios,
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error consultando lotes MIR:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno consultando lotes',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}