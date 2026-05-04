import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';

/**
 * GET /api/superadmin/waitlist
 * Obtiene la lista de espera (solo para superadmin)
 */
export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const payload = verifyToken(authToken);
    if (!isEffectiveSuperAdminPayload(payload)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener estadísticas
    const statsResult = await sql`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE activated_at IS NULL) as pending,
        COUNT(*) FILTER (WHERE activated_at IS NOT NULL) as activated
      FROM waitlist
    `;

    // Obtener todos los registros
    // Nota: La tabla waitlist puede tener o no las columnas name, source, notes
    // Usamos COALESCE para manejar columnas que pueden no existir
    const entriesResult = await sql`
      SELECT 
        id, 
        email, 
        COALESCE(name, NULL) as name,
        COALESCE(source, NULL) as source,
        COALESCE(notes, NULL) as notes,
        created_at, 
        activated_at, 
        tenant_id
      FROM waitlist
      ORDER BY created_at DESC
    `;

    return NextResponse.json({
      success: true,
      stats: statsResult.rows[0],
      entries: entriesResult.rows
    });

  } catch (error) {
    console.error('Error obteniendo waitlist:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener la lista de espera'
      },
      { status: 500 }
    );
  }
}

