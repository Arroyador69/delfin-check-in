import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';

// GET: Listar dataset
export async function GET(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    let query;
    if (type) {
      query = sql`
        SELECT * FROM content_datasets
        WHERE type = ${type} AND active = true
        ORDER BY label ASC
      `;
    } else {
      query = sql`
        SELECT * FROM content_datasets
        WHERE active = true
        ORDER BY type, label ASC
      `;
    }

    const result = await query;

    return NextResponse.json({
      datasets: result.rows
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo dataset:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Crear o actualizar item del dataset
export async function POST(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json();
    const { type, key, label, data } = body;

    if (!type || !key || !label || !data) {
      return NextResponse.json(
        { error: 'type, key, label y data son requeridos' },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const existing = await sql`
      SELECT * FROM content_datasets WHERE type = ${type} AND key = ${key}
    `;

    if (existing.rows.length > 0) {
      // Actualizar
      const result = await sql`
        UPDATE content_datasets
        SET label = ${label}, data = ${JSON.stringify(data)}::jsonb, updated_at = now()
        WHERE type = ${type} AND key = ${key}
        RETURNING *
      `;

      return NextResponse.json({
        success: true,
        dataset: result.rows[0],
        updated: true
      });
    } else {
      // Crear
      const result = await sql`
        INSERT INTO content_datasets (type, key, label, data)
        VALUES (${type}, ${key}, ${label}, ${JSON.stringify(data)}::jsonb)
        RETURNING *
      `;

      return NextResponse.json({
        success: true,
        dataset: result.rows[0],
        updated: false
      });
    }

  } catch (error: any) {
    console.error('❌ Error guardando dataset:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

