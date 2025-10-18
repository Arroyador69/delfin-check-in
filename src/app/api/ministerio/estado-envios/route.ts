import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Obteniendo estado de envíos al MIR...');
    
    // Obtener todos los registros de guest_registrations CON sus comunicaciones MIR
    const result = await sql`
      SELECT 
        gr.id,
        gr.created_at,
        gr.fecha_entrada,
        gr.fecha_salida,
        gr.data,
        gr.reserva_ref,
        mc.id as mir_id,
        mc.estado as mir_estado,
        mc.lote as mir_lote,
        mc.resultado as mir_resultado,
        mc.error as mir_error,
        mc.created_at as mir_created_at,
        mc.xml_respuesta as mir_xml_respuesta
      FROM guest_registrations gr
      LEFT JOIN mir_comunicaciones mc ON gr.reserva_ref = mc.referencia
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
      // Usar datos reales de la tabla mir_comunicaciones
      const hasMirComunicacion = registro.mir_id !== null;
      const mirEstado = registro.mir_estado;
      const mirLote = registro.mir_lote;
      const mirError = registro.mir_error;
      
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
      
      // Crear objeto base de comunicación
      const comunicacion = {
        id: registro.id,
        timestamp: registro.created_at,
        datos: registro.data,
        nombreCompleto: nombreCompleto,
        referencia: registro.reserva_ref,
        lote: mirLote,
        error: mirError,
        fechaEnvio: registro.mir_created_at,
        estado: mirEstado || 'pendiente'
      };
      
      if (!hasMirComunicacion) {
        // No se ha enviado al MIR
        comunicaciones.pendientes.push({
          ...comunicacion,
          estado: 'pendiente'
        });
        estadisticas.pendientes++;
      } else if (mirEstado === 'error' || mirError) {
        // Error en el envío
        comunicaciones.errores.push({
          ...comunicacion,
          estado: 'error'
        });
        estadisticas.errores++;
      } else if (mirEstado === 'confirmado') {
        // Confirmado por el MIR
        comunicaciones.confirmados.push({
          ...comunicacion,
          estado: 'confirmado'
        });
        estadisticas.confirmados++;
      } else if (mirEstado === 'enviado') {
        // Enviado pero pendiente de confirmación
        comunicaciones.enviados.push({
          ...comunicacion,
          estado: 'enviado'
        });
        estadisticas.enviados++;
      } else {
        // Estado desconocido, poner como enviado por defecto si tiene lote
        if (mirLote) {
          comunicaciones.enviados.push({
            ...comunicacion,
            estado: 'enviado'
          });
          estadisticas.enviados++;
        } else {
          comunicaciones.pendientes.push({
            ...comunicacion,
            estado: 'pendiente'
          });
          estadisticas.pendientes++;
        }
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
