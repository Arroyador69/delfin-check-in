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
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const category = searchParams.get('category');

    let query;
    if (from && to) {
      if (category) {
        query = await sql`
          SELECT * FROM local_events
          WHERE tenant_id = ${tenantId}::uuid
            AND starts_at >= ${from}::timestamp
            AND starts_at <= ${to}::timestamp
            AND category = ${category}
          ORDER BY starts_at ASC
        `;
      } else {
        query = await sql`
          SELECT * FROM local_events
          WHERE tenant_id = ${tenantId}::uuid
            AND starts_at >= ${from}::timestamp
            AND starts_at <= ${to}::timestamp
          ORDER BY starts_at ASC
        `;
      }
    } else {
      query = await sql`
        SELECT * FROM local_events
        WHERE tenant_id = ${tenantId}::uuid
          AND starts_at >= NOW()
        ORDER BY starts_at ASC
        LIMIT 100
      `;
    }

    return NextResponse.json({ success: true, events: query.rows });
  } catch (error) {
    console.error('[market/events] GET error:', error);
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

    const body = await req.json();
    const { title, description, startsAt, endsAt, venue, city, category, impactLevel, url } = body;

    if (!title || !startsAt) {
      return NextResponse.json(
        { success: false, error: 'title and startsAt are required' },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO local_events (
        tenant_id, title, description, starts_at, ends_at, venue, city,
        category, impact_level, url, source
      ) VALUES (
        ${tenantId}::uuid, ${title}, ${description || null},
        ${startsAt}::timestamp, ${endsAt || null}::timestamp,
        ${venue || null}, ${city || null},
        ${category || 'other'}, ${impactLevel || 2},
        ${url || null}, 'manual'
      )
      RETURNING *
    `;

    return NextResponse.json({ success: true, event: result.rows[0] });
  } catch (error) {
    console.error('[market/events] POST error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No tenant' }, { status: 401 });
    }

    const body = await req.json();
    const { id, title, description, startsAt, endsAt, venue, city, category, impactLevel, url } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const result = await sql`
      UPDATE local_events SET
        title = ${title},
        description = ${description || null},
        starts_at = ${startsAt}::timestamp,
        ends_at = ${endsAt || null}::timestamp,
        venue = ${venue || null},
        city = ${city || null},
        category = ${category || 'other'},
        impact_level = ${impactLevel || 2},
        url = ${url || null},
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}::uuid
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, event: result.rows[0] });
  } catch (error) {
    console.error('[market/events] PUT error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No tenant' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    await sql`
      DELETE FROM local_events
      WHERE id = ${id}::bigint AND tenant_id = ${tenantId}::uuid
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[market/events] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
