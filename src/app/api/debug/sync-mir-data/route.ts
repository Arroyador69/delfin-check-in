import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { insertMirComunicacion } from '@/lib/mir-db';

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 Iniciando sincronización de datos MIR...');

    // 1. Obtener registros con mir_status pero sin entrada en mir_comunicaciones
    const inconsistencias = await sql`
      SELECT 
        gr.id,
        gr.reserva_ref,
        gr.data,
        gr.created_at,
        gr.fecha_entrada,
        gr.fecha_salida
      FROM guest_registrations gr
      WHERE gr.data->'mir_status' IS NOT NULL
        AND gr.data->'mir_status'->>'estado' = 'enviado'
        AND NOT EXISTS (
          SELECT 1 FROM mir_comunicaciones mc 
          WHERE mc.referencia = gr.reserva_ref
        )
      ORDER BY gr.created_at DESC
    `;

    console.log(`📋 Encontradas ${inconsistencias.rows.length} inconsistencias para sincronizar`);

    if (inconsistencias.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay inconsistencias que sincronizar',
        sincronizados: 0,
        errores: 0
      });
    }

    const resultados = {
      sincronizados: 0,
      errores: 0,
      detalles: []
    };

    // 2. Procesar cada inconsistencia
    for (const registro of inconsistencias.rows) {
      try {
        const mirStatus = registro.data?.mir_status || {};
        const referencia = registro.reserva_ref;
        
        // Extraer datos del registro
        let nombreCompleto = 'Datos no disponibles';
        let tipoComunicacion = 'PV'; // Por defecto PV según normas MIR
        
        try {
          if (registro.data?.comunicaciones?.[0]?.personas?.[0]) {
            const persona = registro.data.comunicaciones[0].personas[0];
            nombreCompleto = `${persona.nombre || ''} ${persona.apellido1 || ''} ${persona.apellido2 || ''}`.trim();
          }
        } catch (error) {
          console.log('Error extrayendo nombre del huésped:', error);
        }

        // Crear entrada en mir_comunicaciones
        const comunicacion = {
          referencia: referencia,
          tipo: tipoComunicacion as 'PV',
          estado: 'enviado',
          lote: mirStatus.lote || null,
          resultado: JSON.stringify({
            codigo: 0,
            descripcion: 'Sincronizado automáticamente',
            lote: mirStatus.lote,
            fechaEnvio: mirStatus.fechaEnvio,
            sincronizado: true,
            nombreCompleto: nombreCompleto
          }),
          error: null,
          xml_enviado: null,
          xml_respuesta: null
        };

        // Insertar en mir_comunicaciones
        const id = await insertMirComunicacion(comunicacion);
        
        console.log(`✅ Sincronizado: ${referencia} -> ID: ${id}`);
        
        resultados.sincronizados++;
        resultados.detalles.push({
          referencia,
          nombreCompleto,
          lote: mirStatus.lote,
          estado: 'enviado',
          id: id,
          accion: 'creado'
        });

      } catch (error) {
        console.error(`❌ Error sincronizando ${registro.reserva_ref}:`, error);
        resultados.errores++;
        resultados.detalles.push({
          referencia: registro.reserva_ref,
          error: error instanceof Error ? error.message : 'Error desconocido',
          accion: 'error'
        });
      }
    }

    console.log(`📊 Sincronización completada: ${resultados.sincronizados} sincronizados, ${resultados.errores} errores`);

    return NextResponse.json({
      success: true,
      message: `Sincronización completada: ${resultados.sincronizados} comunicaciones sincronizadas`,
      resultados,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    return NextResponse.json({
      success: false,
      error: 'Error realizando sincronización',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Verificando estado de sincronización...');

    // Obtener estadísticas de sincronización
    const estadisticas = await sql`
      SELECT 
        COUNT(*) as total_guest_registrations,
        COUNT(*) FILTER (WHERE data->'mir_status' IS NOT NULL) as con_mir_status,
        COUNT(*) FILTER (WHERE data->'mir_status'->>'estado' = 'enviado') as enviados_guest,
        COUNT(*) FILTER (WHERE data->'mir_status' IS NOT NULL 
                         AND data->'mir_status'->>'estado' = 'enviado'
                         AND NOT EXISTS (
                           SELECT 1 FROM mir_comunicaciones mc 
                           WHERE mc.referencia = reserva_ref
                         )) as inconsistencias
      FROM guest_registrations
    `;

    const mirStats = await sql`
      SELECT 
        COUNT(*) as total_mir_comunicaciones,
        COUNT(*) FILTER (WHERE estado = 'enviado') as enviados_mir,
        COUNT(*) FILTER (WHERE estado = 'error') as errores_mir,
        COUNT(DISTINCT lote) as lotes_unicos
      FROM mir_comunicaciones
    `;

    const stats = estadisticas.rows[0];
    const mirStatsData = mirStats.rows[0];

    return NextResponse.json({
      success: true,
      estadisticas: {
        guest_registrations: {
          total: parseInt(stats.total_guest_registrations),
          con_mir_status: parseInt(stats.con_mir_status),
          enviados: parseInt(stats.enviados_guest),
          inconsistencias: parseInt(stats.inconsistencias)
        },
        mir_comunicaciones: {
          total: parseInt(mirStatsData.total_mir_comunicaciones),
          enviados: parseInt(mirStatsData.enviados_mir),
          errores: parseInt(mirStatsData.errores_mir),
          lotes_unicos: parseInt(mirStatsData.lotes_unicos)
        },
        sincronizacion: {
          necesita_sincronizacion: parseInt(stats.inconsistencias) > 0,
          porcentaje_sincronizado: stats.con_mir_status > 0 ? 
            Math.round(((parseInt(stats.con_mir_status) - parseInt(stats.inconsistencias)) / parseInt(stats.con_mir_status)) * 100) : 100
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error verificando sincronización:', error);
    return NextResponse.json({
      success: false,
      error: 'Error verificando sincronización',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
