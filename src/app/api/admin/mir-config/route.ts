import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

interface MirConfig {
  propietarioId: string;
  usuario: string;
  contraseña: string;
  codigoArrendador: string;
  baseUrl: string;
  aplicacion: string;
  simulacion: boolean;
  activo: boolean;
  created_at?: string;
  updated_at?: string;
}

// GET: Obtener configuración MIR de un propietario
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propietarioId = searchParams.get('propietarioId');
    
    if (!propietarioId) {
      return NextResponse.json({
        success: false,
        error: 'propietarioId requerido'
      }, { status: 400 });
    }

    console.log('📋 Obteniendo configuración MIR para propietario:', propietarioId);

    // Obtener configuración de la base de datos
    const result = await sql`
      SELECT 
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
        error: 'Configuración MIR no encontrada para este propietario',
        message: 'El propietario no tiene configuración MIR'
      }, { status: 404 });
    }

    const config = result.rows[0];
    
    // No devolver la contraseña en la respuesta
    const configSegura = {
      propietarioId: config.propietario_id,
      usuario: config.usuario,
      codigoArrendador: config.codigo_arrendador,
      baseUrl: config.base_url,
      aplicacion: config.aplicacion,
      simulacion: config.simulacion,
      activo: config.activo,
      created_at: config.created_at,
      updated_at: config.updated_at
    };

    return NextResponse.json({
      success: true,
      message: 'Configuración MIR obtenida correctamente',
      config: configSegura
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

// POST: Crear o actualizar configuración MIR de un propietario
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

    console.log('💾 Guardando configuración MIR para propietario:', propietarioId);

    // Verificar si ya existe configuración
    const existingConfig = await sql`
      SELECT propietario_id FROM mir_configuraciones 
      WHERE propietario_id = ${propietarioId}
    `;

    if (existingConfig.rows.length > 0) {
      // Actualizar configuración existente
      await sql`
        UPDATE mir_configuraciones 
        SET 
          usuario = ${usuario},
          contraseña = ${contraseña},
          codigo_arrendador = ${codigoArrendador},
          base_url = ${baseUrl},
          aplicacion = ${aplicacion},
          simulacion = ${simulacion},
          activo = ${activo},
          updated_at = NOW()
        WHERE propietario_id = ${propietarioId}
      `;
      
      console.log('✅ Configuración MIR actualizada para propietario:', propietarioId);
    } else {
      // Crear nueva configuración
      await sql`
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
      `;
      
      console.log('✅ Configuración MIR creada para propietario:', propietarioId);
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración MIR guardada correctamente',
      propietarioId,
      config: {
        usuario,
        codigoArrendador,
        baseUrl,
        aplicacion,
        simulacion,
        activo
      }
    });

  } catch (error) {
    console.error('❌ Error guardando configuración MIR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error guardando configuración MIR',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE: Eliminar configuración MIR de un propietario
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propietarioId = searchParams.get('propietarioId');
    
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
        error: 'Configuración MIR no encontrada',
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

