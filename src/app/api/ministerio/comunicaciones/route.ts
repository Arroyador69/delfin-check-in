import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    console.log('📋 Obteniendo comunicaciones MIR...');
    
    // Obtener comunicaciones de la base de datos
    const result = await sql`
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
      LIMIT 100
    `;

    console.log(`📊 Encontradas ${result.rows.length} comunicaciones`);

    return NextResponse.json({
      success: true,
      message: 'Comunicaciones obtenidas correctamente',
      comunicaciones: result.rows,
      total: result.rows.length
    });

  } catch (error) {
    console.error('❌ Error obteniendo comunicaciones:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo comunicaciones',
      message: error instanceof Error ? error.message : 'Error desconocido',
      comunicaciones: [],
      total: 0
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('📋 Obteniendo comunicaciones MIR con filtros...');
    
    const json = await req.json().catch(() => ({}));
    const { estado, tipo, limit = 100, offset = 0 } = json;
    
    // Construir consulta con filtros opcionales
    let query = `
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
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (estado) {
      query += ` AND estado = $${paramIndex}`;
      params.push(estado);
      paramIndex++;
    }
    
    if (tipo) {
      query += ` AND tipo = $${paramIndex}`;
      params.push(tipo);
      paramIndex++;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const result = await sql.query(query, params);

    console.log(`📊 Encontradas ${result.rows.length} comunicaciones con filtros`);

    return NextResponse.json({
      success: true,
      message: 'Comunicaciones obtenidas correctamente',
      comunicaciones: result.rows,
      total: result.rows.length,
      filtros: { estado, tipo, limit, offset }
    });

  } catch (error) {
    console.error('❌ Error obteniendo comunicaciones con filtros:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo comunicaciones',
      message: error instanceof Error ? error.message : 'Error desconocido',
      comunicaciones: [],
      total: 0
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}