import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Obteniendo estado de envíos al MIR...');
    
    // Obtener todos los registros de guest_registrations
    const result = await sql`
      SELECT 
        id,
        created_at,
        fecha_entrada,
        fecha_salida,
        data,
        reserva_ref
      FROM guest_registrations 
      ORDER BY created_at DESC
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
      const mirStatus = registro.data?.mir_status || {};
      const hasMirData = mirStatus.lote || mirStatus.error || mirStatus.codigoComunicacion;
      
      if (!hasMirData) {
        // No se ha enviado al MIR
        comunicaciones.pendientes.push({
          id: registro.id,
          timestamp: registro.created_at,
          datos: registro.data,
          resultado: null,
          estado: 'pendiente',
          lote: null,
          error: null,
          referencia: registro.reserva_ref
        });
        estadisticas.pendientes++;
      } else if (mirStatus.error) {
        // Error en el envío
        comunicaciones.errores.push({
          id: registro.id,
          timestamp: registro.created_at,
          datos: registro.data,
          resultado: mirStatus,
          estado: 'error',
          lote: mirStatus.lote,
          error: mirStatus.error,
          referencia: registro.reserva_ref
        });
        estadisticas.errores++;
      } else if (mirStatus.codigoComunicacion) {
        // Enviado y confirmado
        comunicaciones.confirmados.push({
          id: registro.id,
          timestamp: registro.created_at,
          datos: registro.data,
          resultado: mirStatus,
          estado: 'confirmado',
          lote: mirStatus.lote,
          error: null,
          referencia: registro.reserva_ref
        });
        estadisticas.confirmados++;
      } else if (mirStatus.lote) {
        // Enviado pero pendiente de confirmación
        comunicaciones.enviados.push({
          id: registro.id,
          timestamp: registro.created_at,
          datos: registro.data,
          resultado: mirStatus,
          estado: 'enviado',
          lote: mirStatus.lote,
          error: null,
          referencia: registro.reserva_ref
        });
        estadisticas.enviados++;
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
