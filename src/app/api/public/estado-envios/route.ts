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
      LIMIT 10
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
    
    result.rows.forEach((row: any) => {
      const data = row.data || {};
      const mirStatus = data.mir_status || {};
      
      const comunicacion = {
        id: row.id,
        timestamp: row.created_at,
        fecha_entrada: row.fecha_entrada,
        fecha_salida: row.fecha_salida,
        reserva_ref: row.reserva_ref,
        datos: data,
        resultado: mirStatus,
        estado: 'pendiente',
        lote: mirStatus.lote || null,
        error: mirStatus.error || null,
        codigoComunicacion: mirStatus.codigoComunicacion || null
      };
      
      // Determinar estado basado en mir_status
      if (mirStatus.error) {
        comunicacion.estado = 'error';
        comunicaciones.errores.push(comunicacion);
        estadisticas.errores++;
      } else if (mirStatus.codigoComunicacion) {
        comunicacion.estado = 'confirmado';
        comunicaciones.confirmados.push(comunicacion);
        estadisticas.confirmados++;
      } else if (mirStatus.lote) {
        comunicacion.estado = 'enviado';
        comunicaciones.enviados.push(comunicacion);
        estadisticas.enviados++;
      } else {
        comunicacion.estado = 'pendiente';
        comunicaciones.pendientes.push(comunicacion);
        estadisticas.pendientes++;
      }
      
      estadisticas.total++;
    });
    
    return NextResponse.json({
      success: true,
      estadisticas,
      comunicaciones,
      timestamp: new Date().toISOString(),
      resumen: {
        totalRegistros: estadisticas.total,
        pendientes: estadisticas.pendientes,
        enviados: estadisticas.enviados,
        confirmados: estadisticas.confirmados,
        errores: estadisticas.errores,
        porcentajeExito: estadisticas.total > 0 ? 
          Math.round(((estadisticas.confirmados + estadisticas.enviados) / estadisticas.total) * 100) : 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estado de envíos:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo estado de envíos',
      message: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}


