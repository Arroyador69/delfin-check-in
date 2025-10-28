import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Debug: Revisando datos de registros...');
    
    // Obtener un registro de ejemplo
    const registrosResult = await sql`
      SELECT 
        id,
        reserva_ref,
        fecha_entrada,
        fecha_salida,
        data,
        created_at
      FROM guest_registrations 
      ORDER BY created_at DESC
      LIMIT 3
    `;

    const debugData = registrosResult.rows.map(registro => {
      // Extraer datos del huésped
      let personas = [];
      let nombreCompleto = 'Datos no disponibles';
      
      try {
        if (registro.data?.comunicaciones?.[0]?.personas?.[0]) {
          const persona = registro.data.comunicaciones[0].personas[0];
          nombreCompleto = `${persona.nombre || ''} ${persona.apellido1 || ''} ${persona.apellido2 || ''}`.trim();
          personas = registro.data.comunicaciones[0].personas;
        }
      } catch (error) {
        console.log('Error extrayendo datos del huésped:', error);
      }

      return {
        id: registro.id,
        nombreCompleto,
        reserva_ref: registro.reserva_ref,
        fecha_entrada_original: registro.fecha_entrada,
        fecha_salida_original: registro.fecha_salida,
        fecha_entrada_tipo: typeof registro.fecha_entrada,
        fecha_salida_tipo: typeof registro.fecha_salida,
        fecha_entrada_iso: new Date(registro.fecha_entrada).toISOString(),
        fecha_salida_iso: new Date(registro.fecha_salida).toISOString(),
        fecha_entrada_mir: new Date(registro.fecha_entrada).toISOString().replace(/\.\d{3}Z$/, ''),
        fecha_salida_mir: new Date(registro.fecha_salida).toISOString().replace(/\.\d{3}Z$/, ''),
        personas: personas,
        data_completa: registro.data
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Debug de datos completado',
      registros: debugData,
      total: debugData.length
    });

  } catch (error) {
    console.error('❌ Error en debug de datos:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error en debug de datos',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
