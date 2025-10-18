import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { MinisterioClient, getMinisterioConfigFromEnv } from '@/lib/ministerio-client';

export async function POST(req: NextRequest) {
  try {
    console.log('🔍 Consultando estado real con el MIR...');

    // Obtener todos los lotes que están en estado "enviado" para consultar su estado real
    const result = await sql`
      SELECT 
        mc.id,
        mc.referencia,
        mc.lote,
        mc.estado as mir_estado,
        mc.created_at as fecha_envio,
        gr.id as registro_id,
        gr.data
      FROM mir_comunicaciones mc
      LEFT JOIN guest_registrations gr ON mc.referencia = gr.reserva_ref
      WHERE mc.estado = 'enviado' AND mc.lote IS NOT NULL
      ORDER BY mc.created_at DESC
    `;

    console.log(`📋 Encontrados ${result.rows.length} lotes para consultar`);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay lotes enviados para consultar',
        consultados: 0,
        actualizados: 0
      });
    }

    // Configurar cliente MIR
    const config = getMinisterioConfigFromEnv();
    const cliente = new MinisterioClient(config);

    // Obtener lotes únicos para consultar
    const lotesUnicos = [...new Set(result.rows.map(r => r.lote).filter(Boolean))];
    
    if (lotesUnicos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay lotes válidos para consultar',
        consultados: 0,
        actualizados: 0
      });
    }

    console.log(`🔍 Consultando ${lotesUnicos.length} lotes únicos al MIR`);

    // Consultar lotes al MIR
    const resultado = await cliente.consultaLote({ lotes: lotesUnicos });
    
    console.log('📊 Resultado consulta MIR:', resultado);

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
    const actualizados = [];
    let totalActualizados = 0;

    if (resultado.resultados) {
      for (const loteResult of resultado.resultados) {
        // Determinar el nuevo estado según el código MIR oficial
        let nuevoEstado = 'enviado';
        let descripcionEstado = 'Enviado al MIR';

        switch (loteResult.codigoEstado) {
          case '1': // Procesado correctamente
            nuevoEstado = 'confirmado';
            descripcionEstado = 'Confirmado por el MIR';
            break;
          case '4': // Pendiente de procesamiento
            nuevoEstado = 'enviado';
            descripcionEstado = 'Pendiente de procesamiento por el MIR';
            break;
          case '5': // Error en procesamiento
            nuevoEstado = 'error';
            descripcionEstado = 'Error en procesamiento por el MIR';
            break;
          case '6': // Anulado
            nuevoEstado = 'error';
            descripcionEstado = 'Comunicación anulada por el MIR';
            break;
        }

        // Actualizar la tabla mir_comunicaciones
        await sql`
          UPDATE mir_comunicaciones 
          SET 
            estado = ${nuevoEstado},
            resultado = jsonb_set(
              COALESCE(resultado, '{}'::jsonb),
              '{codigoEstado}', 
              ${loteResult.codigoEstado}::jsonb
            ),
            resultado = jsonb_set(
              resultado,
              '{descEstado}', 
              ${descripcionEstado}::jsonb
            ),
            resultado = jsonb_set(
              resultado,
              '{ultimaConsulta}', 
              ${new Date().toISOString()}::jsonb
            )
          WHERE lote = ${loteResult.lote}
        `;

        // Actualizar también guest_registrations para sincronización
        await sql`
          UPDATE guest_registrations 
          SET data = jsonb_set(
            COALESCE(data, '{}'::jsonb),
            '{mir_status}',
            jsonb_build_object(
              'estado', ${nuevoEstado},
              'lote', ${loteResult.lote},
              'codigoEstado', ${loteResult.codigoEstado},
              'descEstado', ${descripcionEstado},
              'ultimaConsulta', ${new Date().toISOString()}
            )
          )
          WHERE reserva_ref IN (
            SELECT referencia FROM mir_comunicaciones WHERE lote = ${loteResult.lote}
          )
        `;

        actualizados.push({
          lote: loteResult.lote,
          codigoEstado: loteResult.codigoEstado,
          nuevoEstado,
          descripcion: descripcionEstado
        });

        totalActualizados++;
        console.log(`✅ Actualizado lote ${loteResult.lote}: ${nuevoEstado} (${loteResult.codigoEstado})`);
      }
    }

    console.log(`📝 Se actualizaron ${totalActualizados} comunicaciones`);

    return NextResponse.json({
      success: true,
      mensaje: `Consulta realizada correctamente - ${lotesUnicos.length} lotes consultados, ${totalActualizados} actualizados`,
      lotesConsultados: lotesUnicos.length,
      actualizados: totalActualizados,
      detalles: actualizados,
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error consultando estado real MIR:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno consultando estado MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
