import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';
import { validateRoomIdsBelongToTenant } from '@/lib/tenant-room-validation';
import { ensureCleaningPublicLinkTables } from '@/lib/ensure-cleaning-public-links-tables';
import { ensureCleaningConfigForRoomIds } from '@/lib/ensure-cleaning-config-for-rooms';

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  let tenantId = await getTenantId(req);
  if (!tenantId || tenantId.trim() === '') tenantId = req.headers.get('x-tenant-id');
  if (!tenantId || tenantId === 'default' || tenantId.trim() === '') return null;
  return tenantId;
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No tenant' }, { status: 401 });
    }

    await ensureCleaningPublicLinkTables();

    const links = await sql`
      SELECT id, label, public_token, created_at, updated_at
      FROM cleaning_public_links
      WHERE tenant_id = ${tenantId}::uuid
      ORDER BY created_at DESC
    `;

    const rooms = await sql`
      SELECT link_id, room_id
      FROM cleaning_link_rooms
      WHERE tenant_id = ${tenantId}::uuid
    `;

    const byLink = new Map<string, string[]>();
    for (const row of rooms.rows) {
      const lid = row.link_id as string;
      if (!byLink.has(lid)) byLink.set(lid, []);
      byLink.get(lid)!.push(row.room_id as string);
    }

    const enriched = links.rows.map((l: Record<string, unknown>) => ({
      ...l,
      room_ids: byLink.get(l.id as string) || [],
    }));

    return NextResponse.json({ success: true, links: enriched });
  } catch (error) {
    console.error('[cleaning/links] GET error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No tenant' }, { status: 401 });
    }

    await ensureCleaningPublicLinkTables();

    const body = await req.json();
    const label = String(body.label || '').trim();
    const room_ids: string[] = Array.isArray(body.room_ids)
      ? body.room_ids.map((x: unknown) => String(x))
      : [];

    if (!label || label.length > 255) {
      return NextResponse.json({ success: false, error: 'Nombre requerido' }, { status: 400 });
    }
    if (room_ids.length === 0) {
      return NextResponse.json({ success: false, error: 'Selecciona al menos una habitación' }, { status: 400 });
    }

    const ok = await validateRoomIdsBelongToTenant(tenantId, room_ids);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Alguna habitación no es válida para tu cuenta' },
        { status: 400 }
      );
    }

    const token = await sql`
      SELECT md5(gen_random_uuid()::text || now()::text || random()::text) AS t
    `;
    const publicToken = token.rows[0].t as string;

    const ins = await sql`
      INSERT INTO cleaning_public_links (tenant_id, label, public_token)
      VALUES (${tenantId}::uuid, ${label}, ${publicToken})
      RETURNING id, label, public_token, created_at
    `;

    const linkId = ins.rows[0].id as string;

    for (const rid of room_ids) {
      await sql`
        INSERT INTO cleaning_link_rooms (link_id, room_id, tenant_id)
        VALUES (${linkId}::uuid, ${rid}, ${tenantId}::uuid)
      `;
    }

    await ensureCleaningConfigForRoomIds(tenantId, room_ids);

    return NextResponse.json({
      success: true,
      link: { ...ins.rows[0], room_ids },
    });
  } catch (error: unknown) {
    console.error('[cleaning/links] POST error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Error' }, { status: 500 });
  }
}
