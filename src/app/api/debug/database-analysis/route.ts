import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Analizando estructura de base de datos...');
    
    // 1. Verificar estructura de guest_registrations
    const guestRegistrations = await sql`
      SELECT 
        COUNT(*) as total_registros,
        COUNT(DISTINCT reserva_ref) as reservas_unicas,
        COUNT(DISTINCT id) as ids_unicos
      FROM guest_registrations
    `;
    
    // 2. Verificar estructura de mir_comunicaciones
    const mirComunicaciones = await sql`
      SELECT 
        COUNT(*) as total_comunicaciones,
        COUNT(DISTINCT referencia) as referencias_unicas,
        COUNT(DISTINCT lote) as lotes_unicos
      FROM mir_comunicaciones
    `;
    
    // 3. Verificar duplicados en guest_registrations por reserva_ref
    const duplicadosGuest = await sql`
      SELECT 
        reserva_ref,
        COUNT(*) as cantidad
      FROM guest_registrations
      GROUP BY reserva_ref
      HAVING COUNT(*) > 1
      ORDER BY cantidad DESC
      LIMIT 10
    `;
    
    // 4. Verificar duplicados en mir_comunicaciones por referencia
    const duplicadosMir = await sql`
      SELECT 
        referencia,
        COUNT(*) as cantidad
      FROM mir_comunicaciones
      GROUP BY referencia
      HAVING COUNT(*) > 1
      ORDER BY cantidad DESC
      LIMIT 10
    `;
    
    // 5. Verificar JOIN entre las tablas
    const joinAnalysis = await sql`
      SELECT 
        COUNT(*) as total_guest_registrations,
        COUNT(mc.id) as con_mir_comunicacion,
        COUNT(*) - COUNT(mc.id) as sin_mir_comunicacion
      FROM guest_registrations gr
      LEFT JOIN mir_comunicaciones mc ON gr.reserva_ref = mc.resultado::jsonb->>'codigoArrendador'
    `;
    
    // 6. Verificar algunos ejemplos de reserva_ref
    const ejemplosReservaRef = await sql`
      SELECT 
        reserva_ref,
        COUNT(*) as cantidad,
        MIN(created_at) as primer_registro,
        MAX(created_at) as ultimo_registro
      FROM guest_registrations
      GROUP BY reserva_ref
      ORDER BY cantidad DESC
      LIMIT 5
    `;
    
    // 7. Verificar algunos ejemplos de mir_comunicaciones
    const ejemplosMirComunicaciones = await sql`
      SELECT 
        referencia,
        tipo,
        estado,
        lote,
        resultado::jsonb->>'codigoArrendador' as codigo_arrendador,
        created_at
      FROM mir_comunicaciones
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    return NextResponse.json({
      success: true,
      analisis: {
        guest_registrations: {
          total_registros: guestRegistrations.rows[0].total_registros,
          reservas_unicas: guestRegistrations.rows[0].reservas_unicas,
          ids_unicos: guestRegistrations.rows[0].ids_unicos
        },
        mir_comunicaciones: {
          total_comunicaciones: mirComunicaciones.rows[0].total_comunicaciones,
          referencias_unicas: mirComunicaciones.rows[0].referencias_unicas,
          lotes_unicos: mirComunicaciones.rows[0].lotes_unicos
        },
        duplicados_guest_registrations: duplicadosGuest.rows,
        duplicados_mir_comunicaciones: duplicadosMir.rows,
        join_analysis: joinAnalysis.rows[0],
        ejemplos_reserva_ref: ejemplosReservaRef.rows,
        ejemplos_mir_comunicaciones: ejemplosMirComunicaciones.rows
      },
      timestamp: new Date().toISOString()
    }, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Error analizando base de datos:', error);
    return NextResponse.json({
      success: false,
      error: 'Error analizando base de datos',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}




