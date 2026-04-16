import { NextRequest, NextResponse } from 'next/server';
import { sql, ensureFacturasTables } from '@/lib/db';

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  return req.headers.get('x-tenant-id') || req.headers.get('X-Tenant-ID');
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: 'No se pudo identificar el tenant' }, { status: 400 });
    }

    await ensureFacturasTables();

    const result = await sql`
      SELECT 
        nombre_empresa,
        nif_empresa,
        direccion_empresa,
        codigo_postal,
        ciudad,
        provincia,
        pais,
        telefono,
        email,
        web,
        logo_url,
        created_at,
        updated_at
      FROM empresa_config
      WHERE tenant_id = ${String(tenantId)}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, empresa: result.rows[0] });
  } catch (e) {
    console.error('[tenant empresa-config GET]', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ error: 'No se pudo identificar el tenant' }, { status: 400 });
    }

    const { requireActiveTenant } = await import('@/lib/payment-middleware');
    const paymentCheck = await requireActiveTenant(req, tenantId);
    if (paymentCheck) {
      return NextResponse.json(
        {
          error: paymentCheck.error,
          code: paymentCheck.code,
          reason: paymentCheck.reason,
        },
        { status: paymentCheck.status }
      );
    }

    await ensureFacturasTables();

    const data = await req.json();

    if (
      !data?.nombre_empresa ||
      !data?.nif_empresa ||
      !data?.direccion_empresa ||
      !data?.codigo_postal ||
      !data?.ciudad ||
      !data?.provincia ||
      !data?.telefono ||
      !data?.email
    ) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const tenantIdString = String(tenantId);

    const updateResult = await sql`
      UPDATE empresa_config SET
        nombre_empresa = ${data.nombre_empresa},
        nif_empresa = ${data.nif_empresa},
        direccion_empresa = ${data.direccion_empresa},
        codigo_postal = ${data.codigo_postal},
        ciudad = ${data.ciudad},
        provincia = ${data.provincia},
        pais = ${data.pais || 'España'},
        telefono = ${data.telefono},
        email = ${data.email},
        web = ${data.web || ''},
        logo_url = ${data.logo_url || ''},
        updated_at = NOW()
      WHERE tenant_id = ${tenantIdString}
      RETURNING *
    `;

    const result =
      updateResult.rows.length > 0
        ? updateResult.rows[0]
        : (
            await sql`
              INSERT INTO empresa_config (
                tenant_id, nombre_empresa, nif_empresa, direccion_empresa,
                codigo_postal, ciudad, provincia, pais, telefono, email, web, logo_url
              ) VALUES (
                ${tenantIdString}, ${data.nombre_empresa}, ${data.nif_empresa}, ${data.direccion_empresa},
                ${data.codigo_postal}, ${data.ciudad}, ${data.provincia}, ${data.pais || 'España'},
                ${data.telefono}, ${data.email}, ${data.web || ''}, ${data.logo_url || ''}
              )
              RETURNING *
            `
          ).rows[0];

    return NextResponse.json({ success: true, empresa: result });
  } catch (e) {
    console.error('[tenant empresa-config POST]', e);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

