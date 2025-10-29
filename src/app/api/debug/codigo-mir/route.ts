import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const codigo = searchParams.get('codigo');
    
    if (!codigo) {
      return NextResponse.json({
        error: 'Código requerido'
      }, { status: 400 });
    }

    console.log(`🔍 Debugging código: ${codigo}`);

    // 1. Buscar en guest_registrations
    const guestResult = await sql`
      SELECT 
        id, reserva_ref, fecha_entrada, fecha_salida, 
        data, comunicacion_id, tenant_id, created_at
      FROM guest_registrations 
      WHERE reserva_ref = ${codigo} OR comunicacion_id = ${codigo}
      ORDER BY created_at DESC
    `;

    // 2. Buscar en mir_comunicaciones
    const mirResult = await sql`
      SELECT 
        id, referencia, tipo, estado, lote, 
        resultado, error, xml_enviado, xml_respuesta,
        tenant_id, created_at
      FROM mir_comunicaciones 
      WHERE referencia = ${codigo} OR referencia LIKE ${codigo + '%'}
      ORDER BY created_at DESC
    `;

    // 3. Buscar por UUID parcial
    const uuidResult = await sql`
      SELECT 
        id, reserva_ref, fecha_entrada, fecha_salida, 
        data, comunicacion_id, tenant_id, created_at
      FROM guest_registrations 
      WHERE reserva_ref LIKE '%${codigo}%' OR comunicacion_id LIKE '%${codigo}%'
      ORDER BY created_at DESC
    `;

    // 4. Buscar en mir_comunicaciones por UUID parcial
    const mirUuidResult = await sql`
      SELECT 
        id, referencia, tipo, estado, lote, 
        resultado, error, xml_enviado, xml_respuesta,
        tenant_id, created_at
      FROM mir_comunicaciones 
      WHERE referencia LIKE '%${codigo}%'
      ORDER BY created_at DESC
    `;

    const debugInfo = {
      codigo_buscado: codigo,
      timestamp: new Date().toISOString(),
      resultados: {
        guest_registrations_exacto: guestResult.rows,
        mir_comunicaciones_exacto: mirResult.rows,
        guest_registrations_parcial: uuidResult.rows,
        mir_comunicaciones_parcial: mirUuidResult.rows
      },
      estadisticas: {
        total_guest_exacto: guestResult.rows.length,
        total_mir_exacto: mirResult.rows.length,
        total_guest_parcial: uuidResult.rows.length,
        total_mir_parcial: mirUuidResult.rows.length
      }
    };

    console.log('🔍 Debug info:', JSON.stringify(debugInfo, null, 2));

    return NextResponse.json(debugInfo);

  } catch (error) {
    console.error('❌ Error en debug:', error);
    return NextResponse.json({
      error: 'Error interno',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}

