import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Obteniendo estado de envíos al MIR...');
    
    // Obtener registros únicos de guest_registrations CON sus comunicaciones MIR
    // Usar una subconsulta para evitar duplicados por JOIN múltiple
    const result = await sql`
      SELECT 
        gr.id,
        gr.created_at,
        gr.fecha_entrada,
        gr.fecha_salida,
        gr.data,
        gr.reserva_ref,
        mc.id as mir_id,
        mc.referencia as mir_referencia,
        mc.tipo as mir_tipo,
        mc.estado as mir_estado,
        mc.lote as mir_lote,
        mc.resultado as mir_resultado,
        mc.error as mir_error,
        mc.created_at as mir_created_at,
        mc.xml_respuesta as mir_xml_respuesta
      FROM guest_registrations gr
      LEFT JOIN (
        SELECT DISTINCT ON (resultado::jsonb->>'codigoArrendador')
          id,
          referencia,
          tipo,
          estado,
          lote,
          resultado,
          error,
          created_at,
          xml_respuesta,
          resultado::jsonb->>'codigoArrendador' as codigo_arrendador
        FROM mir_comunicaciones
        WHERE resultado::jsonb->>'codigoArrendador' IS NOT NULL
        ORDER BY resultado::jsonb->>'codigoArrendador', created_at DESC
      ) mc ON gr.comunicacion_id = mc.referencia
      ORDER BY gr.created_at DESC
    `;
    
    console.log(`📋 Encontrados ${result.rows.length} registros`);
    
    // Procesar registros y categorizar por estado MIR
    const comunicaciones = {
      pendientes: [],
      enviados: [],
      confirmados: [],
      errores: []
    };
    
    let estadisticas = {
      total: 0,
      pendientes: 0,
      enviados: 0,
      confirmados: 0,
      errores: 0
    };
    
    result.rows.forEach(registro => {
      // Usar datos reales de la tabla mir_comunicaciones Y del campo mir_status en guest_registrations
      const hasMirComunicacion = registro.mir_id !== null;
      const mirEstado = registro.mir_estado;
      const mirLote = registro.mir_lote;
      const mirError = registro.mir_error;
      
      // También verificar el campo mir_status dentro de los datos del registro
      const mirStatusFromData = registro.data?.mir_status || {};
      const estadoFromData = mirStatusFromData.estado;
      const loteFromData = mirStatusFromData.lote;
      
      // Extraer nombre del huésped
      let nombreCompleto = 'Datos no disponibles';
      try {
        if (registro.data?.comunicaciones?.[0]?.personas?.[0]) {
          const persona = registro.data.comunicaciones[0].personas[0];
          nombreCompleto = `${persona.nombre || ''} ${persona.apellido1 || ''} ${persona.apellido2 || ''}`.trim();
        }
      } catch (error) {
        console.log('Error extrayendo nombre del huésped:', error);
      }
      
      // Crear objeto base de comunicación con datos consistentes
      const comunicacion = {
        id: registro.id,
        timestamp: registro.created_at,
        datos: registro.data,
        nombreCompleto: nombreCompleto,
        referencia: registro.mir_referencia || registro.reserva_ref, // Priorizar referencia MIR si existe
        tipo: registro.mir_tipo || 'PV', // Priorizar tipo MIR si existe
        lote: mirLote || loteFromData, // Priorizar lote MIR si existe
        error: mirError,
        fechaEnvio: registro.mir_created_at,
        estado: mirEstado || 'pendiente',
        // Información de vinculación para debugging
        vinculacion: {
          guest_registration_id: registro.id,
          mir_comunicacion_id: registro.mir_id,
          reserva_ref: registro.reserva_ref,
          codigo_arrendador: registro.codigo_arrendador,
          codigo_establecimiento: registro.data?.codigoEstablecimiento
        }
      };
      
      // Determinar el estado real considerando tanto mir_comunicaciones como mir_status en datos
      let estadoFinal = 'pendiente';
      let loteFinal = mirLote || loteFromData;

      // Prioridad 1: Error (cualquier fuente)
      if (mirEstado === 'error' || mirError || estadoFromData === 'error') {
        estadoFinal = 'error';
      }
      // Prioridad 2: Confirmado (cualquier fuente)
      else if (mirEstado === 'confirmado' || estadoFromData === 'confirmado') {
        estadoFinal = 'confirmado';
      }
      // Prioridad 3: Enviado (cualquier fuente)
      else if (mirEstado === 'enviado' || estadoFromData === 'enviado' || mirLote || loteFromData) {
        estadoFinal = 'enviado';
      }
      // Prioridad 4: Si tiene comunicación MIR pero estado desconocido, considerar enviado
      else if (hasMirComunicacion) {
        estadoFinal = 'enviado';
      }

      // Si no hay lote pero hay comunicación MIR, generar uno temporal
      if (!loteFinal && hasMirComunicacion) {
        loteFinal = `LOTE-${registro.mir_referencia?.substring(0, 8) || registro.id.substring(0, 8)}-${Date.now()}`;
      }
      
      // Actualizar el objeto comunicación con el estado final
      comunicacion.estado = estadoFinal;
      comunicacion.lote = loteFinal;
      
      // Clasificar según el estado final
      if (estadoFinal === 'error') {
        comunicaciones.errores.push(comunicacion);
        estadisticas.errores++;
      } else if (estadoFinal === 'confirmado') {
        comunicaciones.confirmados.push(comunicacion);
        estadisticas.confirmados++;
      } else if (estadoFinal === 'enviado') {
        comunicaciones.enviados.push(comunicacion);
        estadisticas.enviados++;
      } else {
        comunicaciones.pendientes.push(comunicacion);
        estadisticas.pendientes++;
      }
    });
    
    estadisticas.total = result.rows.length;
    
    console.log('📈 Estadísticas de envíos:', estadisticas);
    
    return NextResponse.json({
      success: true,
      estadisticas,
      comunicaciones: {
        pendientes: comunicaciones.pendientes,
        enviados: comunicaciones.enviados,
        confirmados: comunicaciones.confirmados,
        errores: comunicaciones.errores
      },
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estado de envíos:', error);
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo estado de envíos',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
