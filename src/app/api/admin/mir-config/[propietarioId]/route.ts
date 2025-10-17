import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET: Obtener configuración MIR específica de un propietario
export async function GET(
  req: NextRequest,
  { params }: { params: { propietarioId: string } }
) {
  try {
    const { propietarioId } = params;
    
    if (!propietarioId) {
      return NextResponse.json({
        success: false,
        error: 'propietarioId requerido'
      }, { status: 400 });
    }

    console.log('📋 Obteniendo configuración MIR para propietario:', propietarioId);

    const result = await sql`
      SELECT 
        id,
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
      FROM mir_configuraciones 
      WHERE propietario_id = ${propietarioId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Configuración MIR no encontrada',
        message: 'No se encontró configuración MIR para este propietario'
      }, { status: 404 });
    }

    const config = result.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Configuración MIR obtenida correctamente',
      config: {
        id: config.id,
        propietarioId: config.propietario_id,
        usuario: config.usuario,
        contraseña: config.contraseña, // Solo para administradores
        codigoArrendador: config.codigo_arrendador,
        baseUrl: config.base_url,
        aplicacion: config.aplicacion,
        simulacion: config.simulacion,
        activo: config.activo,
        created_at: config.created_at,
        updated_at: config.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo configuración MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error obteniendo configuración MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT: Actualizar configuración MIR específica de un propietario
export async function PUT(
  req: NextRequest,
  { params }: { params: { propietarioId: string } }
) {
  try {
    const { propietarioId } = params;
    const json = await req.json().catch(() => undefined);
    
    if (!propietarioId) {
      return NextResponse.json({
        success: false,
        error: 'propietarioId requerido'
      }, { status: 400 });
    }
    
    if (!json) {
      return NextResponse.json({
        success: false,
        error: 'Datos JSON inválidos o vacíos'
      }, { status: 400 });
    }

    const {
      usuario,
      contraseña,
      codigoArrendador,
      baseUrl,
      aplicacion,
      simulacion,
      activo
    } = json;

    console.log('💾 Actualizando configuración MIR para propietario:', propietarioId);

    // Verificar si existe la configuración
    const existingConfig = await sql`
      SELECT id FROM mir_configuraciones 
      WHERE propietario_id = ${propietarioId}
    `;

    if (existingConfig.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Configuración no encontrada',
        message: 'No se encontró configuración MIR para este propietario'
      }, { status: 404 });
    }

    // Construir query de actualización dinámicamente
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (usuario !== undefined) {
      updates.push(`usuario = $${paramIndex}`);
      values.push(usuario);
      paramIndex++;
    }
    
    if (contraseña !== undefined) {
      updates.push(`contraseña = $${paramIndex}`);
      values.push(contraseña);
      paramIndex++;
    }
    
    if (codigoArrendador !== undefined) {
      updates.push(`codigo_arrendador = $${paramIndex}`);
      values.push(codigoArrendador);
      paramIndex++;
    }
    
    if (baseUrl !== undefined) {
      updates.push(`base_url = $${paramIndex}`);
      values.push(baseUrl);
      paramIndex++;
    }
    
    if (aplicacion !== undefined) {
      updates.push(`aplicacion = $${paramIndex}`);
      values.push(aplicacion);
      paramIndex++;
    }
    
    if (simulacion !== undefined) {
      updates.push(`simulacion = $${paramIndex}`);
      values.push(simulacion);
      paramIndex++;
    }
    
    if (activo !== undefined) {
      updates.push(`activo = $${paramIndex}`);
      values.push(activo);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay campos para actualizar',
        message: 'Debe proporcionar al menos un campo para actualizar'
      }, { status: 400 });
    }

    // Agregar updated_at
    updates.push(`updated_at = NOW()`);
    
    // Agregar propietarioId al final para el WHERE
    values.push(propietarioId);

    const query = `
      UPDATE mir_configuraciones 
      SET ${updates.join(', ')}
      WHERE propietario_id = $${paramIndex}
      RETURNING id, propietario_id, usuario, codigo_arrendador, base_url, aplicacion, simulacion, activo, created_at, updated_at
    `;

    const result = await sql.query(query, values);
    const updatedConfig = result.rows[0];
    
    console.log('✅ Configuración MIR actualizada para propietario:', propietarioId);

    return NextResponse.json({
      success: true,
      message: 'Configuración MIR actualizada correctamente',
      config: {
        id: updatedConfig.id,
        propietarioId: updatedConfig.propietario_id,
        usuario: updatedConfig.usuario,
        codigoArrendador: updatedConfig.codigo_arrendador,
        baseUrl: updatedConfig.base_url,
        aplicacion: updatedConfig.aplicacion,
        simulacion: updatedConfig.simulacion,
        activo: updatedConfig.activo,
        created_at: updatedConfig.created_at,
        updated_at: updatedConfig.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error actualizando configuración MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error actualizando configuración MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE: Eliminar configuración MIR específica de un propietario
export async function DELETE(
  req: NextRequest,
  { params }: { params: { propietarioId: string } }
) {
  try {
    const { propietarioId } = params;
    
    if (!propietarioId) {
      return NextResponse.json({
        success: false,
        error: 'propietarioId requerido'
      }, { status: 400 });
    }

    console.log('🗑️ Eliminando configuración MIR para propietario:', propietarioId);

    const result = await sql`
      DELETE FROM mir_configuraciones 
      WHERE propietario_id = ${propietarioId}
    `;

    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'Configuración no encontrada',
        message: 'No se encontró configuración MIR para este propietario'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración MIR eliminada correctamente',
      propietarioId
    });

  } catch (error) {
    console.error('❌ Error eliminando configuración MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error eliminando configuración MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
