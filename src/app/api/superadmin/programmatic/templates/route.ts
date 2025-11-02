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
    const { name, type, prompt_base, variables_schema, target_length, cta_url, pricing_eur } = body;

    if (!name || !type || !prompt_base || !variables_schema) {
      return NextResponse.json(
        { error: 'name, type, prompt_base y variables_schema son requeridos' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO content_templates (
        name, type, prompt_base, variables_schema, target_length, cta_url, pricing_eur
      ) VALUES (
        ${name},
        ${type},
        ${prompt_base},
        ${JSON.stringify(variables_schema)}::jsonb,
        ${target_length || 800},
        ${cta_url || 'https://delfincheckin.com'},
        ${pricing_eur || 29.99}
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
    const { id, name, prompt_base, variables_schema, target_length, cta_url, pricing_eur, active } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id es requerido' },
        { status: 400 }
      );
    }

    // Construir actualización dinámica
    let query = sql`UPDATE content_templates SET updated_at = now()`;
    const params: any[] = [];

    if (name !== undefined) {
      query = sql`${query}, name = ${name}`;
    }
    if (prompt_base !== undefined) {
      query = sql`${query}, prompt_base = ${prompt_base}`;
    }
    if (variables_schema !== undefined) {
      query = sql`${query}, variables_schema = ${JSON.stringify(variables_schema)}::jsonb`;
    }
    if (target_length !== undefined) {
      query = sql`${query}, target_length = ${target_length}`;
    }
    if (cta_url !== undefined) {
      query = sql`${query}, cta_url = ${cta_url}`;
    }
    if (pricing_eur !== undefined) {
      query = sql`${query}, pricing_eur = ${pricing_eur}`;
    }
    if (active !== undefined) {
      query = sql`${query}, active = ${active}`;
    }

    query = sql`${query} WHERE id = ${id} RETURNING *`;

    const result = await query;

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

