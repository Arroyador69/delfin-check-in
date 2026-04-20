import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantById } from '@/lib/tenant';
import type { Tenant } from '@/lib/tenant';
import { getTenantPlanPresentation } from '@/lib/tenant-plan-billing';
import { getRoomsForTenant } from '@/lib/tenant-rooms';

function maskCredentialRow(row: any) {
  return {
    id: Number(row.id),
    tenant_id: String(row.tenant_id),
    nombre: String(row.nombre || 'Credencial MIR'),
    usuario: String(row.usuario || ''),
    contraseña: '', // nunca devolver
    hasPassword: Boolean(row.contraseña && String(row.contraseña).trim().length > 0),
    codigoArrendador: String(row.codigo_arrendador || ''),
    codigoEstablecimiento: String(row.codigo_establecimiento || ''),
    baseUrl: String(row.base_url || ''),
    activo: Boolean(row.activo),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { getTenantId } = await import('@/lib/tenant');
    const tenantId =
      (await getTenantId(req)) ||
      req.headers.get('x-tenant-id') ||
      req.headers.get('X-Tenant-ID') ||
      null;

    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { ensureMirMultiSchema } = await import('@/lib/mir-multi');
    await ensureMirMultiSchema();

    const res = await sql`
      SELECT *
      FROM mir_credenciales
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY created_at ASC, id ASC
    `;

    return NextResponse.json({
      success: true,
      credenciales: res.rows.map(maskCredentialRow),
      total: res.rows.length,
    });
  } catch (e: any) {
    console.error('❌ [GET /api/ministerio/credenciales] Error:', e);
    return NextResponse.json({ success: false, error: 'Error obteniendo credenciales' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { getTenantId } = await import('@/lib/tenant');
    const tenantId =
      (await getTenantId(req)) ||
      req.headers.get('x-tenant-id') ||
      req.headers.get('X-Tenant-ID') ||
      null;

    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const nombre = String(body?.nombre || 'Credencial MIR').trim().slice(0, 120) || 'Credencial MIR';
    const usuario = String(body?.usuario || '').trim().toUpperCase();
    const contraseña = String(body?.contraseña || '').trim();
    const codigoArrendador = String(body?.codigoArrendador || body?.codigo_arrendador || '').trim();
    const codigoEstablecimiento = String(body?.codigoEstablecimiento || body?.codigo_establecimiento || '').trim();
    const baseUrl =
      String(body?.baseUrl || body?.base_url || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion').trim();

    if (!usuario || !contraseña || !codigoArrendador || !codigoEstablecimiento || !baseUrl) {
      return NextResponse.json(
        { success: false, error: 'Credenciales incompletas' },
        { status: 400 }
      );
    }

    const { ensureMirMultiSchema } = await import('@/lib/mir-multi');
    await ensureMirMultiSchema();

    // Límite: credenciales activas <= unidades contratadas (misma lógica que /api/tenant/limits)
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json({ success: false, error: 'Tenant no encontrado' }, { status: 404 });
    }

    const rooms = await getRoomsForTenant(tenantId);
    const roomsUsed = rooms.length;
    const presentation = await getTenantPlanPresentation(tenant as Tenant, roomsUsed);
    const maxRooms = Number(presentation.max_rooms_effective ?? 0);
    if (!maxRooms || maxRooms < 1) {
      return NextResponse.json(
        { success: false, error: 'No se pudo determinar el límite del plan' },
        { status: 400 }
      );
    }

    const countRes = await sql`
      SELECT COUNT(*)::int AS n
      FROM mir_credenciales
      WHERE tenant_id = ${tenantId}::uuid
        AND activo = true
    `;
    const configured = Number(countRes.rows?.[0]?.n ?? 0);
    if (configured >= maxRooms) {
      return NextResponse.json(
        {
          success: false,
          error: 'Has alcanzado el máximo de credenciales MIR según tu plan',
          configured,
          maxAllowed: maxRooms,
        },
        { status: 403 }
      );
    }

    const inserted = await sql`
      INSERT INTO mir_credenciales (
        tenant_id, nombre, usuario, contraseña, codigo_arrendador, codigo_establecimiento, base_url, activo, created_at, updated_at
      ) VALUES (
        ${tenantId}::uuid, ${nombre}, ${usuario}, ${contraseña}, ${codigoArrendador}, ${codigoEstablecimiento}, ${baseUrl}, true, NOW(), NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({
      success: true,
      credencial: maskCredentialRow(inserted.rows[0]),
    });
  } catch (e: any) {
    console.error('❌ [POST /api/ministerio/credenciales] Error:', e);
    return NextResponse.json({ success: false, error: 'Error creando credencial' }, { status: 500 });
  }
}

