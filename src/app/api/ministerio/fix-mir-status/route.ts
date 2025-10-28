import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    console.log('🔧 Iniciando corrección de estados MIR...');

    // Obtener todos los registros que tienen comunicaciones MIR pero no tienen mir_status actualizado
    const result = await sql`
      SELECT 
        gr.id,
        gr.reserva_ref,
        gr.data,
        gr.created_at,
        mc.lote,
        mc.estado as mir_estado,
        mc.error,
        mc.resultado,
        mc.created_at as mir_created_at
      FROM guest_registrations gr
      LEFT JOIN mir_comunicaciones mc ON gr.reserva_ref = mc.referencia
      WHERE 
        mc.id IS NOT NULL 
        AND (gr.data->>'mir_status' IS NULL OR gr.data->'mir_status'->>'estado' IS NULL)
      ORDER BY gr.created_at DESC
    `;

    console.log(`📋 Encontrados ${result.rows.length} registros para corregir`);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: '✅ No hay registros que necesiten corrección',
        corregidos: 0,
        detalles: []
      });
    }

    const correcciones = [];
    let corregidos = 0;

    for (const registro of result.rows) {
      try {
        // Determinar el estado correcto basado en la comunicación MIR
        let estadoCorrecto = 'enviado';
        let error = null;

        if (registro.mir_estado === 'error' || registro.error) {
          estadoCorrecto = 'error';
          error = registro.error || 'Error en comunicación MIR';
        } else if (registro.mir_estado === 'confirmado') {
          estadoCorrecto = 'confirmado';
        }

        // Actualizar el registro con el mir_status correcto
        const datosActualizados = {
          ...registro.data,
          mir_status: {
            lote: registro.lote,
            fechaEnvio: registro.mir_created_at,
            estado: estadoCorrecto,
            referencia: registro.reserva_ref,
            error: error,
            ultimaActualizacion: new Date().toISOString(),
            corregido: true
          }
        };

        await sql`
          UPDATE guest_registrations 
          SET data = ${JSON.stringify(datosActualizados)}::jsonb
          WHERE id = ${registro.id}
        `;

        correcciones.push({
          id: registro.id,
          reserva_ref: registro.reserva_ref,
          estado_anterior: registro.data?.mir_status?.estado || 'sin_estado',
          estado_nuevo: estadoCorrecto,
          lote: registro.lote,
          error: error
        });

        corregidos++;
        console.log(`✅ Corregido registro ${registro.id}: ${estadoCorrecto}`);

      } catch (error) {
        console.error(`❌ Error corrigiendo registro ${registro.id}:`, error);
        correcciones.push({
          id: registro.id,
          reserva_ref: registro.reserva_ref,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    console.log(`🎉 Corrección completada: ${corregidos} registros corregidos`);

    return NextResponse.json({
      success: true,
      message: `✅ Corrección completada: ${corregidos} registros actualizados`,
      corregidos: corregidos,
      total_encontrados: result.rows.length,
      detalles: correcciones,
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error en corrección de estados MIR:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno corrigiendo estados MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando registros que necesitan corrección...');

    // Obtener estadísticas de registros que necesitan corrección
    const result = await sql`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(CASE WHEN mc.id IS NOT NULL THEN 1 END) as con_comunicacion_mir,
        COUNT(CASE WHEN mc.id IS NOT NULL AND (gr.data->>'mir_status' IS NULL OR gr.data->'mir_status'->>'estado' IS NULL) THEN 1 END) as necesitan_correccion,
        COUNT(CASE WHEN gr.data->'mir_status'->>'estado' = 'pendiente' THEN 1 END) as marcados_pendientes,
        COUNT(CASE WHEN gr.data->'mir_status'->>'estado' = 'enviado' THEN 1 END) as marcados_enviados,
        COUNT(CASE WHEN gr.data->'mir_status'->>'estado' = 'confirmado' THEN 1 END) as marcados_confirmados,
        COUNT(CASE WHEN gr.data->'mir_status'->>'estado' = 'error' THEN 1 END) as marcados_error
      FROM guest_registrations gr
      LEFT JOIN mir_comunicaciones mc ON gr.reserva_ref = mc.referencia
    `;

    const stats = result.rows[0];

    // Obtener algunos ejemplos de registros que necesitan corrección
    const ejemplos = await sql`
      SELECT 
        gr.id,
        gr.reserva_ref,
        gr.created_at,
        mc.lote,
        mc.estado as mir_estado,
        gr.data->>'mir_status' as mir_status_actual
      FROM guest_registrations gr
      LEFT JOIN mir_comunicaciones mc ON gr.reserva_ref = mc.referencia
      WHERE 
        mc.id IS NOT NULL 
        AND (gr.data->>'mir_status' IS NULL OR gr.data->'mir_status'->>'estado' IS NULL)
      ORDER BY gr.created_at DESC
      LIMIT 5
    `;

    return NextResponse.json({
      success: true,
      estadisticas: {
        total_registros: parseInt(stats.total_registros),
        con_comunicacion_mir: parseInt(stats.con_comunicacion_mir),
        necesitan_correccion: parseInt(stats.necesitan_correccion),
        estados_actuales: {
          pendientes: parseInt(stats.marcados_pendientes),
          enviados: parseInt(stats.marcados_enviados),
          confirmados: parseInt(stats.marcados_confirmados),
          error: parseInt(stats.marcados_error)
        }
      },
      ejemplos: ejemplos.rows,
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error verificando registros:', error);
    return NextResponse.json({
      success: false,
      error: 'Error verificando registros',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json boundary="----WebKitFormBoundary7MA4YWxkTrZu0gW"'}
    });
  }
}
