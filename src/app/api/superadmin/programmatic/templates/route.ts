import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';

// GET: Listar plantillas
export async function GET(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const result = await sql`
      SELECT * FROM content_templates
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      templates: result.rows
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo plantillas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Crear plantilla
export async function POST(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json();
    const { name, type, prompt_base, variables_schema, target_length, is_test } = body;

    if (!name || !type || !prompt_base || !variables_schema) {
      return NextResponse.json(
        { error: 'name, type, prompt_base y variables_schema son requeridos' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO content_templates (
        name, type, prompt_base, variables_schema, target_length, is_test
      ) VALUES (
        ${name},
        ${type},
        ${prompt_base},
        ${JSON.stringify(variables_schema)}::jsonb,
        ${target_length || 800},
        ${is_test || false}
      ) RETURNING *
    `;

    return NextResponse.json({
      success: true,
      template: result.rows[0]
    });

  } catch (error: any) {
    console.error('❌ Error creando plantilla:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT: Actualizar plantilla
export async function PUT(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json();
    const { id, name, prompt_base, variables_schema, target_length, active, is_test } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id es requerido' },
        { status: 400 }
      );
    }

    // Construir actualización dinámica usando sql template literal
    const updateParts: any[] = [];
    
    if (name !== undefined) {
      updateParts.push(sql`name = ${name}`);
    }
    if (prompt_base !== undefined) {
      updateParts.push(sql`prompt_base = ${prompt_base}`);
    }
    if (variables_schema !== undefined) {
      updateParts.push(sql`variables_schema = ${JSON.stringify(variables_schema)}::jsonb`);
    }
    if (target_length !== undefined) {
      updateParts.push(sql`target_length = ${target_length}`);
    }
    if (active !== undefined) {
      updateParts.push(sql`active = ${active}`);
    }
    if (is_test !== undefined) {
      updateParts.push(sql`is_test = ${is_test}`);
    }

    if (updateParts.length === 0) {
      return NextResponse.json(
        { error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    // Construir query usando sql template literal
    const result = await sql`
      UPDATE content_templates 
      SET ${sql.join(updateParts, sql`, `)}, updated_at = now()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      template: result.rows[0]
    });

  } catch (error: any) {
    console.error('❌ Error actualizando plantilla:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar plantilla
export async function DELETE(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'id es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la plantilla existe
    const checkResult = await sql`
      SELECT id FROM content_templates WHERE id = ${id}
    `;

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Plantilla no encontrada' },
        { status: 404 }
      );
    }

    // Eliminar plantilla
    await sql`
      DELETE FROM content_templates WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Plantilla eliminada correctamente'
    });

  } catch (error: any) {
    console.error('❌ Error eliminando plantilla:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

