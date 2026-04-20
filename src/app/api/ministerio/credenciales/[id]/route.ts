import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

function maskCredentialRow(row: any) {
  return {
    id: Number(row.id),
    tenant_id: String(row.tenant_id),
    nombre: String(row.nombre || 'Credencial MIR'),
    usuario: String(row.usuario || ''),
    contraseña: '',
    hasPassword: Boolean(row.contraseña && String(row.contraseña).trim().length > 0),
    codigoArrendador: String(row.codigo_arrendador || ''),
    codigoEstablecimiento: String(row.codigo_establecimiento || ''),
    baseUrl: String(row.base_url || ''),
    activo: Boolean(row.activo),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  const { getTenantId } = await import('@/lib/tenant');
  return (
    (await getTenantId(req)) ||
    req.headers.get('x-tenant-id') ||
    req.headers.get('X-Tenant-ID') ||
    null
  );
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { id: rawId } = await params;
    const id = parseInt(String(rawId), 10);
    if (!Number.isFinite(id) || id < 1) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const nombre = body?.nombre != null ? String(body.nombre).trim().slice(0, 120) : undefined;
    const usuarioRaw = body?.usuario != null ? String(body.usuario).trim().toUpperCase() : undefined;
    const contraseñaRaw = body?.contraseña != null ? String(body.contraseña) : undefined;
    const codigoArrendador =
      body?.codigoArrendador != null || body?.codigo_arrendador != null
        ? String(body.codigoArrendador ?? body.codigo_arrendador).trim()
        : undefined;
    const codigoEstablecimiento =
      body?.codigoEstablecimiento != null || body?.codigo_establecimiento != null
        ? String(body.codigoEstablecimiento ?? body.codigo_establecimiento).trim()
        : undefined;
    const baseUrl =
      body?.baseUrl != null || body?.base_url != null
        ? String(body.baseUrl ?? body.base_url).trim()
        : undefined;
    const activo = body?.activo != null ? Boolean(body.activo) : undefined;

    const { ensureMirMultiSchema } = await import('@/lib/mir-multi');
    await ensureMirMultiSchema();

    const existing = await sql`
      SELECT *
      FROM mir_credenciales
      WHERE id = ${id}
        AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Credencial no encontrada' }, { status: 404 });
    }

    const row = existing.rows[0] as Record<string, unknown>;
    let finalPassword = typeof contraseñaRaw === 'string' ? contraseñaRaw.trim() : '';
    if (!finalPassword) {
      finalPassword = String(row.contraseña || '').trim();
    }

    const u = usuarioRaw !== undefined ? usuarioRaw : String(row.usuario || '').trim().toUpperCase();
    const usuarioPatternOficial = /^[A-Z0-9]{6,15}---WS$/;
    const usuarioPatternLegacy = /^[A-Z0-9]{6,15}WS$/;
    if (!usuarioPatternOficial.test(u) && !usuarioPatternLegacy.test(u)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Formato de usuario incorrecto',
          message:
            'El usuario debe ser el del Servicio Web del MIR. Formato habitual: NIF/CIF/NIE + "---WS" (ej: 12345678A---WS).',
        },
        { status: 400 }
      );
    }

    const nextNombre = nombre !== undefined ? nombre || 'Credencial MIR' : String(row.nombre || 'Credencial MIR');
    const nextArr = codigoArrendador !== undefined ? codigoArrendador : String(row.codigo_arrendador || '').trim();
    const nextEst =
      codigoEstablecimiento !== undefined ? codigoEstablecimiento : String(row.codigo_establecimiento || '').trim();
    const nextBase =
      baseUrl !== undefined && baseUrl.length > 0
        ? baseUrl
        : String(row.base_url || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion');

    if (!nextArr || !nextEst || !finalPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'Credenciales incompletas',
          message: 'Usuario, contraseña, código de arrendador y código de establecimiento son obligatorios',
        },
        { status: 400 }
      );
    }

    const nextActivo = activo !== undefined ? activo : Boolean(row.activo);

    const updated = await sql`
      UPDATE mir_credenciales
      SET
        nombre = ${nextNombre},
        usuario = ${u},
        contraseña = ${finalPassword},
        codigo_arrendador = ${nextArr},
        codigo_establecimiento = ${nextEst},
        base_url = ${nextBase},
        activo = ${nextActivo},
        updated_at = NOW()
      WHERE id = ${id}
        AND tenant_id = ${tenantId}::uuid
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      credencial: maskCredentialRow(updated.rows[0]),
    });
  } catch (e: any) {
    console.error('❌ [PATCH /api/ministerio/credenciales/[id]] Error:', e);
    return NextResponse.json({ success: false, error: 'Error actualizando credencial' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { id: rawId } = await params;
    const id = parseInt(String(rawId), 10);
    if (!Number.isFinite(id) || id < 1) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    const { ensureMirMultiSchema } = await import('@/lib/mir-multi');
    await ensureMirMultiSchema();

    const del = await sql`
      DELETE FROM mir_credenciales
      WHERE id = ${id}
        AND tenant_id = ${tenantId}::uuid
      RETURNING id
    `;

    if (del.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Credencial no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    console.error('❌ [DELETE /api/ministerio/credenciales/[id]] Error:', e);
    return NextResponse.json({ success: false, error: 'Error eliminando credencial' }, { status: 500 });
  }
}
