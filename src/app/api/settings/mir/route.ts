import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { canTenantConfigureMirAutoSubmit } from '@/lib/tenant';

/**
 * API para actualizar la configuración MIR del tenant
 */
export async function POST(req: NextRequest) {
  try {
    // Obtener tenant_id autenticado (robusto multi-tenant). Header solo como fallback.
    const { getTenantId } = await import('@/lib/tenant');
    const tenantId =
      (await getTenantId(req)) ||
      req.headers.get('x-tenant-id') ||
      req.headers.get('X-Tenant-ID') ||
      null;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { mir } = body;

    if (!mir) {
      return NextResponse.json(
        { error: 'Configuración MIR requerida' },
        { status: 400 }
      );
    }

    // Validar campos requeridos si MIR está habilitado
    if (mir.enabled) {
      if (!mir.codigoEstablecimiento || !mir.denominacion || !mir.direccionCompleta) {
        return NextResponse.json(
          { error: 'Los campos código de establecimiento, denominación y dirección son requeridos cuando MIR está habilitado' },
          { status: 400 }
        );
      }
    }

    // Config actual + plan (envío automático solo si módulo legal y no plan básico gratis)
    const tenantResult = await sql`
      SELECT config, legal_module, plan_type FROM tenants WHERE id = ${tenantId}
    `;

    if (tenantResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    const row = tenantResult.rows[0] as {
      config: Record<string, unknown> | null;
      legal_module: boolean | null;
      plan_type: string | null;
    };
    const currentConfig = row.config || {};
    const autoSubmitAllowed = canTenantConfigureMirAutoSubmit({
      legal_module: Boolean(row.legal_module),
      plan_type: row.plan_type,
    });
    const autoSubmit = autoSubmitAllowed && Boolean(mir.autoSubmit);

    // Actualizar solo la sección MIR de la configuración
    const updatedConfig = {
      ...currentConfig,
      mir: {
        enabled: Boolean(mir.enabled),
        codigoEstablecimiento: String(mir.codigoEstablecimiento || '').trim(),
        denominacion: String(mir.denominacion || '').trim(),
        direccionCompleta: String(mir.direccionCompleta || '').trim(),
        autoSubmit,
        testMode: Boolean(mir.testMode)
      }
    };

    // Actualizar en la base de datos
    await sql`
      UPDATE tenants
      SET 
        config = ${JSON.stringify(updatedConfig)}::jsonb,
        updated_at = NOW()
      WHERE id = ${tenantId}
    `;

    console.log(`✅ Configuración MIR actualizada para tenant ${tenantId}`);

    return NextResponse.json({
      success: true,
      message: 'Configuración MIR actualizada correctamente',
      mir: updatedConfig.mir
    });

  } catch (error) {
    console.error('Error actualizando configuración MIR:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la configuración MIR' },
      { status: 500 }
    );
  }
}

/**
 * API para obtener la configuración MIR del tenant
 */
export async function GET(req: NextRequest) {
  try {
    // Obtener tenant_id autenticado (robusto multi-tenant). Header solo como fallback.
    const { getTenantId } = await import('@/lib/tenant');
    const tenantId =
      (await getTenantId(req)) ||
      req.headers.get('x-tenant-id') ||
      req.headers.get('X-Tenant-ID') ||
      null;
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No se pudo identificar el tenant' },
        { status: 401 }
      );
    }

    const result = await sql`
      SELECT config, legal_module, plan_type FROM tenants WHERE id = ${tenantId}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Tenant no encontrado' },
        { status: 404 }
      );
    }

    const row = result.rows[0] as {
      config: Record<string, unknown> | null;
      legal_module: boolean | null;
      plan_type: string | null;
    };
    const config = row.config || {};
    const rawMir = (config.mir || {}) as Record<string, unknown>;
    const autoSubmitAllowed = canTenantConfigureMirAutoSubmit({
      legal_module: Boolean(row.legal_module),
      plan_type: row.plan_type,
    });
    const mir = {
      enabled: rawMir.enabled !== false,
      codigoEstablecimiento: String(rawMir.codigoEstablecimiento || ''),
      denominacion: String(rawMir.denominacion || ''),
      direccionCompleta: String(rawMir.direccionCompleta || ''),
      autoSubmit: autoSubmitAllowed && Boolean(rawMir.autoSubmit),
      testMode: rawMir.testMode !== false,
    };

    return NextResponse.json({ mir });

  } catch (error) {
    console.error('Error obteniendo configuración MIR:', error);
    return NextResponse.json(
      { error: 'Error al obtener la configuración MIR' },
      { status: 500 }
    );
  }
}

