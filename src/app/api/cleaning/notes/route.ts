import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';

async function resolveTenantId(req: NextRequest): Promise<string | null> {
  let tenantId = await getTenantId(req);
  if (!tenantId || tenantId.trim() === '') {
    tenantId = req.headers.get('x-tenant-id');
  }
  if (!tenantId || tenantId === 'default' || tenantId.trim() === '') return null;
  return tenantId;
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No tenant' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('room_id');
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    let query = `
      SELECT cn.*, r.name AS room_name
      FROM cleaning_notes cn
      LEFT JOIN "Room" r ON r.id = cn.room_id
      WHERE cn.tenant_id = $1::uuid
    `;
    const params: any[] = [tenantId];

    if (roomId) {
      params.push(roomId);
      query += ` AND cn.room_id = $${params.length}`;
    }
    if (unreadOnly) {
      query += ` AND cn.read_at IS NULL AND cn.author_type = 'cleaner'`;
    }

    params.push(limit);
    query += ` ORDER BY cn.created_at DESC LIMIT $${params.length}`;

    const result = await sql.query(query, params);

    return NextResponse.json({ success: true, notes: result.rows });
  } catch (error) {
    console.error('[cleaning/notes] GET error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No tenant' }, { status: 401 });
    }

    const { room_id, cleaning_date, note, reservation_id } = await req.json();

    if (!room_id || !cleaning_date || !note?.trim()) {
      return NextResponse.json({ success: false, error: 'room_id, cleaning_date y note son requeridos' }, { status: 400 });
    }

    if (note.length > 2000) {
      return NextResponse.json({ success: false, error: 'Nota demasiado larga (max 2000 caracteres)' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO cleaning_notes (tenant_id, room_id, reservation_id, cleaning_date, author_type, note)
      VALUES (${tenantId}::uuid, ${String(room_id)}, ${reservation_id || null}::uuid, ${cleaning_date}::date, 'owner', ${note.trim()})
      RETURNING *
    `;

    return NextResponse.json({ success: true, note: result.rows[0] });
  } catch (error) {
    console.error('[cleaning/notes] POST error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No tenant' }, { status: 401 });
    }

    const { note_ids } = await req.json();
    if (!note_ids?.length) {
      return NextResponse.json({ success: false, error: 'note_ids requerido' }, { status: 400 });
    }

    await sql.query(
      `UPDATE cleaning_notes SET read_at = NOW()
       WHERE tenant_id = $1::uuid AND id = ANY($2::uuid[]) AND read_at IS NULL`,
      [tenantId, note_ids]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[cleaning/notes] PATCH error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
