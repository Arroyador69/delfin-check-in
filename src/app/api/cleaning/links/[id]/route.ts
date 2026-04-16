import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';
import { validateRoomIdsBelongToTenant } from '@/lib/tenant-room-validation';
import { ensureCleaningPublicLinkTables } from '@/lib/ensure-cleaning-public-links-tables';

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  let tenantId = await getTenantId(req);
  if (!tenantId || tenantId.trim() === '') tenantId = req.headers.get('x-tenant-id');
  if (!tenantId || tenantId === 'default' || tenantId.trim() === '') return null;
  return tenantId;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No tenant' }, { status: 401 });
    }

    await ensureCleaningPublicLinkTables();

    const { id } = await params;
    const body = await req.json();

    const existing = await sql`
      SELECT id FROM cleaning_public_links
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Enlace no encontrado' }, { status: 404 });
    }

    if (body.regenerate_token === true) {
      const tok = await sql`
        SELECT md5(gen_random_uuid()::text || now()::text || random()::text) AS t
      `;
      const publicToken = tok.rows[0].t as string;
      await sql`
        UPDATE cleaning_public_links
        SET public_token = ${publicToken}, updated_at = NOW()
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
      return NextResponse.json({ success: true, public_token: publicToken });
    }

    const label = body.label != null ? String(body.label).trim() : null;
    if (label !== null && (!label || label.length > 255)) {
      return NextResponse.json({ success: false, error: 'Nombre inválido' }, { status: 400 });
    }

    if (label) {
      await sql`
        UPDATE cleaning_public_links
        SET label = ${label}, updated_at = NOW()
        WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      `;
    }

    if (Array.isArray(body.room_ids)) {
      const room_ids: string[] = body.room_ids.map((x: unknown) => String(x));
      if (room_ids.length === 0) {
        return NextResponse.json({ success: false, error: 'Selecciona al menos una habitación' }, { status: 400 });
      }
      const ok = await validateRoomIdsBelongToTenant(tenantId, room_ids);
      if (!ok) {
        return NextResponse.json(
          { success: false, error: 'Alguna habitación no es válida' },
          { status: 400 }
        );
      }
      await sql`DELETE FROM cleaning_link_rooms WHERE link_id = ${id}::uuid AND tenant_id = ${tenantId}::uuid`;
      for (const rid of room_ids) {
        await sql`
          INSERT INTO cleaning_link_rooms (link_id, room_id, tenant_id)
          VALUES (${id}::uuid, ${rid}, ${tenantId}::uuid)
        `;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[cleaning/links/PATCH] error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No tenant' }, { status: 401 });
    }

    await ensureCleaningPublicLinkTables();

    const { id } = await params;
    await sql`
      DELETE FROM cleaning_public_links
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[cleaning/links/DELETE] error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
