import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/auth-superadmin';

// =====================================================
// GET: Obtener propiedades (para selectores en Radar Reach)
// =====================================================
export async function GET(req: NextRequest) {
  try {
    const { error, payload } = await verifySuperAdmin(req);
    if (error) return error;

    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');

    let query = sql`
      SELECT 
        tp.id,
        tp.tenant_id,
        tp.property_name,
        t.name as tenant_name,
        t.email as tenant_email
      FROM tenant_properties tp
      JOIN tenants t ON tp.tenant_id = t.id
      WHERE tp.is_active = true
    `;

    if (tenantId) {
      query = sql`${query} AND tp.tenant_id = ${tenantId}::uuid`;
    }

    query = sql`${query} ORDER BY t.name, tp.property_name`;

    const result = await query;

    return NextResponse.json({
      success: true,
      properties: result.rows
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo propiedades:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

