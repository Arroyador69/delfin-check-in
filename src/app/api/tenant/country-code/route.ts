import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTenantId } from '@/lib/tenant';

/**
 * PUT - Actualizar country_code del tenant
 * Solo disponible para planes FREE+LEGAL (PRO puede tener todos los países)
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

    const { country_code } = await req.json();

    // Validar formato de country_code (2 letras ISO)
    if (country_code && !/^[A-Z]{2}$/i.test(country_code)) {
      return NextResponse.json(
        { success: false, error: 'Código de país inválido. Debe ser un código ISO de 2 letras (ej: ES, IT, PT)' },
        { status: 400 }
      );
    }

    // Obtener información del tenant
    const tenantResult = await sql`
      SELECT plan_type, legal_module FROM tenants WHERE id = ${tenantId}
    `;

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    const tenant = tenantResult.rows[0];

    // Solo permitir cambiar country_code si tiene legal_module activo
    if (!tenant.legal_module) {
      return NextResponse.json(
        { success: false, error: 'El módulo legal no está activo. Actualiza tu plan para acceder.' },
        { status: 403 }
      );
    }

    // Si es PRO, puede tener country_code null (todos los países)
    // Si es FREE+LEGAL, debe tener un country_code específico
    if (tenant.plan_type === 'pro' && country_code === null) {
      // PRO puede tener null (todos los países)
    } else if (tenant.plan_type === 'free_legal' && !country_code) {
      return NextResponse.json(
        { success: false, error: 'El plan FREE+LEGAL requiere un código de país específico' },
        { status: 400 }
      );
    }

    // Actualizar country_code
    await sql`
      UPDATE tenants
      SET country_code = ${country_code || null}, updated_at = NOW()
      WHERE id = ${tenantId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Código de país actualizado correctamente',
      country_code: country_code || null
    });

  } catch (error: any) {
    console.error('Error actualizando country_code:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar código de país' },
      { status: 500 }
    );
  }
}

/**
 * GET - Obtener country_code del tenant
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || await getTenantId(req);
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }

    const result = await sql`
      SELECT country_code, plan_type, legal_module
      FROM tenants
      WHERE id = ${tenantId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      country_code: result.rows[0].country_code,
      plan_type: result.rows[0].plan_type,
      legal_module: result.rows[0].legal_module
    });

  } catch (error: any) {
    console.error('Error obteniendo country_code:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener código de país' },
      { status: 500 }
    );
  }
}

