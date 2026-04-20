import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    const { getTenantId, getTenantById } = await import('@/lib/tenant');
    const tenantId =
      (await getTenantId(req)) ||
      req.headers.get('x-tenant-id') ||
      req.headers.get('X-Tenant-ID') ||
      null;

    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const tenant = await getTenantById(tenantId);
    const lodgingId =
      tenant?.lodging_id && String(tenant.lodging_id).trim() !== ''
        ? String(tenant.lodging_id)
        : String(tenantId);

    const { ensureMirMultiSchema, getMirUnitCredentialMap } = await import('@/lib/mir-multi');
    await ensureMirMultiSchema();

    const roomsRes = await sql`
      SELECT id::text AS id
      FROM "Room"
      WHERE "lodgingId" = ${lodgingId}
    `;
    const rooms = roomsRes.rows.map((r) => String(r.id));
    const map = await getMirUnitCredentialMap(tenantId);
    const missing = rooms.filter((roomId) => !map.get(roomId)).length;

    return NextResponse.json({ success: true, missing });
  } catch (e: any) {
    console.error('❌ [GET /api/ministerio/pending-config-count] Error:', e);
    return NextResponse.json({ success: false, error: 'Error obteniendo pendientes' }, { status: 500 });
  }
}

