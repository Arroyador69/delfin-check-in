import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = sql`
      SELECT 
        pp.*,
        ct.name as template_name
      FROM programmatic_pages pp
      LEFT JOIN content_templates ct ON ct.id = pp.template_id
      WHERE 1=1
    `;

    if (status) {
      query = sql`${query} AND pp.status = ${status}`;
    }

    if (type) {
      query = sql`${query} AND pp.type = ${type}`;
    }

    query = sql`${query} ORDER BY pp.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const result = await query;

    // Total count para paginación
    let countQuery = sql`SELECT COUNT(*) as total FROM programmatic_pages WHERE 1=1`;
    if (status) countQuery = sql`${countQuery} AND status = ${status}`;
    if (type) countQuery = sql`${countQuery} AND type = ${type}`;

    const countResult = await countQuery;

    return NextResponse.json({
      pages: result.rows,
      total: parseInt(countResult.rows[0]?.total || '0'),
      limit,
      offset
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo páginas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

