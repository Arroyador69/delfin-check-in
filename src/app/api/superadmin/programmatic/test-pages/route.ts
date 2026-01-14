import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    // Verificar SuperAdmin
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    // Obtener todas las páginas de prueba
    const testPages = await sql`
      SELECT 
        id,
        slug,
        title,
        status,
        github_file_path,
        created_at,
        published_at
      FROM programmatic_pages
      WHERE is_test = true
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      success: true,
      pages: testPages.rows
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo páginas de prueba:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
