import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('📋 Obteniendo registros completos (huéspedes + comunicaciones MIR)...');
    
    // Obtener todos los registros de huéspedes
    const registrosResult = await sql`
      SELECT 
        id,
        reserva_ref,
        fecha_entrada,
        fecha_salida,
        data,
        created_at,
        updated_at
      FROM guest_registrations 
      ORDER BY created_at DESC
      LIMIT 100
    `;

    // Obtener comunicaciones MIR para hacer match
    const comunicacionesResult = await sql`
      SELECT 
        id,
        referencia,
        tipo,
        estado,
        lote,
        resultado,
        error,
        xml_enviado,
        xml_respuesta,
        created_at,
        updated_at
      FROM mir_comunicaciones 
      ORDER BY created_at DESC
    `;

    // Crear un mapa de comunicaciones por referencia
    const comunicacionesMap = new Map();
    comunicacionesResult.rows.forEach(com => {
      comunicacionesMap.set(com.referencia, com);
    });

    // Combinar registros con sus comunicaciones
    const registrosCompletos = registrosResult.rows.map(registro => {
      // Buscar comunicación MIR correspondiente
      const comunicacion = comunicacionesMap.get(registro.reserva_ref);
      
      // Extraer datos del huésped
      let nombreCompleto = 'Datos no disponibles';
      let habitacion = 'N/A';
      
      try {
        if (registro.data?.comunicaciones?.[0]?.personas?.[0]) {
          const persona = registro.data.comunicaciones[0].personas[0];
          nombreCompleto = `${persona.nombre || ''} ${persona.apellido1 || ''} ${persona.apellido2 || ''}`.trim();
          habitacion = persona.habitacion || 'N/A';
        }
      } catch (error) {
        console.log('Error extrayendo datos del huésped:', error);
      }

      return {
        id: registro.id,
        tipo: 'registro_guest',
        nombreCompleto,
        habitacion,
        fecha_entrada: registro.fecha_entrada,
        fecha_salida: registro.fecha_salida,
        reserva_ref: registro.reserva_ref,
        created_at: registro.created_at,
        updated_at: registro.updated_at,
        // Datos de comunicación MIR si existe
        comunicacion_mir: comunicacion ? {
          id: comunicacion.id,
          estado: comunicacion.estado,
          lote: comunicacion.lote,
          resultado: comunicacion.resultado,
          error: comunicacion.error,
          xml_enviado: comunicacion.xml_enviado,
          xml_respuesta: comunicacion.xml_respuesta,
          enviado_at: comunicacion.created_at
        } : null,
        // Estado combinado
        estado: comunicacion ? comunicacion.estado : 'pendiente',
        ya_enviado: !!comunicacion
      };
    });

    console.log(`📊 Encontrados ${registrosCompletos.length} registros completos`);

    return NextResponse.json({
      success: true,
      message: 'Registros completos obtenidos correctamente',
      registros: registrosCompletos,
      total: registrosCompletos.length,
      estadisticas: {
        total_registros: registrosCompletos.length,
        pendientes: registrosCompletos.filter(r => !r.ya_enviado).length,
        enviados: registrosCompletos.filter(r => r.ya_enviado).length
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo registros completos:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo registros completos',
      message: error instanceof Error ? error.message : 'Error desconocido',
      registros: [],
      total: 0
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
