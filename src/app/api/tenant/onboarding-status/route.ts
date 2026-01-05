import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTenantId } from '@/lib/tenant';

/**
 * PUT - Actualizar onboarding_status del tenant
 */
export async function PUT(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || await getTenantId(req);
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }

    const { onboarding_status } = await req.json();

    // Validar status
    if (!['pending', 'in_progress', 'completed'].includes(onboarding_status)) {
      return NextResponse.json(
        { success: false, error: 'Estado de onboarding inválido' },
        { status: 400 }
      );
    }

    // Actualizar onboarding_status
    await sql`
      UPDATE tenants
      SET onboarding_status = ${onboarding_status}, updated_at = NOW()
      WHERE id = ${tenantId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Estado de onboarding actualizado',
      onboarding_status
    });

  } catch (error: any) {
    console.error('Error actualizando onboarding_status:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar estado de onboarding' },
      { status: 500 }
    );
  }
}

