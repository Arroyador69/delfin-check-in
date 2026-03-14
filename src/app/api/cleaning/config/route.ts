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

    const result = await sql`
      SELECT cc.*, r.name AS room_name
      FROM cleaning_config cc
      LEFT JOIN "Room" r ON r.id = cc.room_id
      WHERE cc.tenant_id = ${tenantId}::uuid
      ORDER BY r.name ASC
    `;

    return NextResponse.json({ success: true, configs: result.rows });
  } catch (error) {
    console.error('[cleaning/config] GET error:', error);
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
    const {
      room_id,
      checkout_time = '11:00',
      checkin_time = '16:00',
      cleaning_duration_minutes = 120,
      cleaning_trigger = 'on_checkout',
      same_day_alert = true,
      ical_enabled = true,
      cleaner_name = null,
    } = body;

    if (!room_id) {
      return NextResponse.json({ success: false, error: 'room_id requerido' }, { status: 400 });
    }

    const validTriggers = ['on_checkout', 'day_before_checkin', 'both'];
    if (!validTriggers.includes(cleaning_trigger)) {
      return NextResponse.json({ success: false, error: 'cleaning_trigger inválido' }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO cleaning_config (
        tenant_id, room_id, checkout_time, checkin_time,
        cleaning_duration_minutes, cleaning_trigger, same_day_alert,
        ical_enabled, cleaner_name
      ) VALUES (
        ${tenantId}::uuid, ${String(room_id)}, ${checkout_time}::time, ${checkin_time}::time,
        ${cleaning_duration_minutes}, ${cleaning_trigger}::cleaning_trigger_type, ${same_day_alert},
        ${ical_enabled}, ${cleaner_name}
      )
      ON CONFLICT (tenant_id, room_id) DO UPDATE SET
        checkout_time = EXCLUDED.checkout_time,
        checkin_time = EXCLUDED.checkin_time,
        cleaning_duration_minutes = EXCLUDED.cleaning_duration_minutes,
        cleaning_trigger = EXCLUDED.cleaning_trigger,
        same_day_alert = EXCLUDED.same_day_alert,
        ical_enabled = EXCLUDED.ical_enabled,
        cleaner_name = EXCLUDED.cleaner_name,
        updated_at = NOW()
      RETURNING *
    `;

    return NextResponse.json({ success: true, config: result.rows[0] });
  } catch (error) {
    console.error('[cleaning/config] PUT error:', error);
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
    const roomId = searchParams.get('room_id');
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'room_id requerido' }, { status: 400 });
    }

    await sql`
      DELETE FROM cleaning_config
      WHERE tenant_id = ${tenantId}::uuid AND room_id = ${roomId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[cleaning/config] DELETE error:', error);
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

    const { room_id } = await req.json();
    if (!room_id) {
      return NextResponse.json({ success: false, error: 'room_id requerido' }, { status: 400 });
    }

    const result = await sql`
      UPDATE cleaning_config
      SET ical_token = encode(gen_random_bytes(32), 'hex'),
          updated_at = NOW()
      WHERE tenant_id = ${tenantId}::uuid AND room_id = ${String(room_id)}
      RETURNING ical_token
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Config no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ical_token: result.rows[0].ical_token });
  } catch (error) {
    console.error('[cleaning/config] POST (regenerate token) error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
