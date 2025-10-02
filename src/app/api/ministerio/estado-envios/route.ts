import { NextRequest, NextResponse } from 'next/server';
import { getMirComunicaciones, getMirEstadisticas } from '@/lib/mir-db';

export async function GET(req: NextRequest) {
  try {
    console.log('📊 Obteniendo estado de envíos al MIR...');
    
    let estadisticas, estados;
    
    try {
      // Obtener estadísticas
      estadisticas = await getMirEstadisticas();
      
      // Obtener comunicaciones por estado
      const [pendientes, enviados, confirmados, errores] = await Promise.all([
        getMirComunicaciones('pendiente'),
        getMirComunicaciones('enviado'),
        getMirComunicaciones('confirmado'),
        getMirComunicaciones('error')
      ]);
      
      estados = {
        pendientes,
        enviados,
        confirmados,
        errores
      };
      
      console.log('📈 Estadísticas de envíos:', estadisticas);
    } catch (dbError) {
      console.log('⚠️ Tabla mir_comunicaciones no existe, usando datos vacíos');
      
      // Si la tabla no existe, devolver datos vacíos
      estadisticas = {
        total: 0,
        pendientes: 0,
        enviados: 0,
        confirmados: 0,
        errores: 0
      };
      
      estados = {
        pendientes: [],
        enviados: [],
        confirmados: [],
        errores: []
      };
    }
    
    return NextResponse.json({
      success: true,
      estadisticas,
      comunicaciones: {
        pendientes: estados.pendientes,
        enviados: estados.enviados,
        confirmados: estados.confirmados,
        errores: estados.errores
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
