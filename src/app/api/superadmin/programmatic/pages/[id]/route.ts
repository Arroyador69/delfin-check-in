import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const pageId = params.id;

    const result = await sql`
      SELECT 
        pp.*,
        ct.name as template_name
      FROM programmatic_pages pp
      LEFT JOIN content_templates ct ON ct.id = pp.template_id
      WHERE pp.id = ${pageId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Página no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      page: result.rows[0]
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo página:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

