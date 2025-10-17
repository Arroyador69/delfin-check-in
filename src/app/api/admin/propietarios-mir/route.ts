import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET: Listar todos los propietarios con configuración MIR
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activo = searchParams.get('activo');
    
    console.log('📋 Obteniendo lista de propietarios MIR');

    let query = `
      SELECT 
        id,
        propietario_id,
        usuario,
        codigo_arrendador,
        base_url,
        aplicacion,
        simulacion,
        activo,
        created_at,
        updated_at
      FROM mir_configuraciones
    `;
    
    const params: any[] = [];
    
    if (activo !== null) {
      query += ` WHERE activo = $1`;
      params.push(activo === 'true');
    }
    
    query += ` ORDER BY created_at DESC`;

    const result = await sql.query(query, params);

    const propietarios = result.rows.map(row => ({
      id: row.id,
      propietarioId: row.propietario_id,
      usuario: row.usuario,
      codigoArrendador: row.codigo_arrendador,
      baseUrl: row.base_url,
      aplicacion: row.aplicacion,
      simulacion: row.simulacion,
      activo: row.activo,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      message: 'Lista de propietarios MIR obtenida correctamente',
      total: propietarios.length,
      propietarios
    });

  } catch (error) {
    console.error('❌ Error obteniendo lista de propietarios MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo lista de propietarios MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST: Crear nueva configuración MIR para un propietario
export async function POST(req: NextRequest) {
  try {
    const json = await req.json().catch(() => undefined);
    
    if (!json) {
      return NextResponse.json({
        success: false,
        error: 'Datos JSON inválidos o vacíos'
      }, { status: 400 });
    }

    const {
      propietarioId,
      usuario,
      contraseña,
      codigoArrendador,
      baseUrl = 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
      aplicacion = 'Delfin_Check_in',
      simulacion = false,
      activo = true
    } = json;

    // Validaciones
    if (!propietarioId || !usuario || !contraseña || !codigoArrendador) {
      return NextResponse.json({
        success: false,
        error: 'Datos requeridos faltantes',
        message: 'propietarioId, usuario, contraseña y codigoArrendador son obligatorios'
      }, { status: 400 });
    }

    console.log('💾 Creando nueva configuración MIR para propietario:', propietarioId);

    // Verificar si ya existe
    const existingConfig = await sql`
      SELECT propietario_id FROM mir_configuraciones 
      WHERE propietario_id = ${propietarioId}
    `;

    if (existingConfig.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Configuración ya existe',
        message: 'Ya existe una configuración MIR para este propietario'
      }, { status: 409 });
    }

    // Crear nueva configuración
    const result = await sql`
      INSERT INTO mir_configuraciones (
        propietario_id,
        usuario,
        contraseña,
        codigo_arrendador,
        base_url,
        aplicacion,
        simulacion,
        activo,
        created_at,
        updated_at
      ) VALUES (
        ${propietarioId},
        ${usuario},
        ${contraseña},
        ${codigoArrendador},
        ${baseUrl},
        ${aplicacion},
        ${simulacion},
        ${activo},
        NOW(),
        NOW()
      )
      RETURNING id, propietario_id, usuario, codigo_arrendador, base_url, aplicacion, simulacion, activo, created_at, updated_at
    `;

    const newConfig = result.rows[0];
    
    console.log('✅ Configuración MIR creada para propietario:', propietarioId);

    return NextResponse.json({
      success: true,
      message: 'Configuración MIR creada correctamente',
      config: {
        id: newConfig.id,
        propietarioId: newConfig.propietario_id,
        usuario: newConfig.usuario,
        codigoArrendador: newConfig.codigo_arrendador,
        baseUrl: newConfig.base_url,
        aplicacion: newConfig.aplicacion,
        simulacion: newConfig.simulacion,
        activo: newConfig.activo,
        created_at: newConfig.created_at,
        updated_at: newConfig.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error creando configuración MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error creando configuración MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
