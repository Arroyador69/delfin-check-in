import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';
import {
  ensureTapWallSchema,
  getTapAccountByTenant,
  isTapWallActiveStatus,
  newPublicCode,
} from '@/lib/tap-wall';

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const account = await getTapAccountByTenant(tenantId);
    if (!account || !isTapWallActiveStatus(account.status as string)) {
      return NextResponse.json(
        { error: 'Suscripción Tap Wall no activa. Contrátala primero.', code: 'not_subscribed' },
        { status: 403 }
      );
    }
    const r = await sql`
      SELECT *
      FROM tap_wall_spaces
      WHERE account_id = ${String(account.id)}::uuid
      ORDER BY created_at ASC
    `;
    return NextResponse.json({ success: true, spaces: r.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    await ensureTapWallSchema();
    const account = await getTapAccountByTenant(tenantId);
    if (!account || !isTapWallActiveStatus(account.status as string)) {
      return NextResponse.json({ error: 'Suscripción Tap Wall no activa', code: 'not_subscribed' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body.name || 'Alojamiento').trim().slice(0, 120) || 'Alojamiento';
    const count = await sql`
      SELECT COUNT(*)::int AS n FROM tap_wall_spaces WHERE account_id = ${String(account.id)}::uuid
    `;
    const n = Number(count.rows[0]?.n || 0);
    const max = Number(account.properties_count || 1);
    if (n >= max) {
      return NextResponse.json(
        {
          error: `Tu plan Tap Wall incluye ${max} propiedad(es). Aumenta propiedades al contratar o contacta soporte.`,
        },
        { status: 403 }
      );
    }

    let code = newPublicCode();
    for (let i = 0; i < 5; i++) {
      const exists = await sql`SELECT 1 FROM tap_wall_spaces WHERE public_code = ${code} LIMIT 1`;
      if (exists.rows.length === 0) break;
      code = newPublicCode();
    }

    const ins = await sql`
      INSERT INTO tap_wall_spaces (
        account_id, tenant_id, name, public_code,
        wifi_ssid, wifi_password, wifi_notes, instructions_text,
        emergency_phone, emergency_message
      ) VALUES (
        ${String(account.id)}::uuid, ${tenantId}::uuid, ${name}, ${code},
        ${String(body.wifi_ssid || '').trim() || null},
        ${String(body.wifi_password || '').trim() || null},
        ${String(body.wifi_notes || '').trim() || null},
        ${String(body.instructions_text || '').trim() || null},
        ${String(body.emergency_phone || '').trim() || null},
        ${String(body.emergency_message || '').trim() || null}
      )
      RETURNING *
    `;
    return NextResponse.json({ success: true, space: ins.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const account = await getTapAccountByTenant(tenantId);
    if (!account || !isTapWallActiveStatus(account.status as string)) {
      return NextResponse.json({ error: 'Suscripción Tap Wall no activa', code: 'not_subscribed' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

    const upd = await sql`
      UPDATE tap_wall_spaces
      SET name = ${String(body.name || 'Alojamiento').trim().slice(0, 120)},
          wifi_ssid = ${String(body.wifi_ssid || '').trim() || null},
          wifi_password = ${String(body.wifi_password || '').trim() || null},
          wifi_notes = ${String(body.wifi_notes || '').trim() || null},
          instructions_text = ${String(body.instructions_text || '').trim() || null},
          emergency_phone = ${String(body.emergency_phone || '').trim() || null},
          emergency_message = ${String(body.emergency_message || '').trim() || null},
          updated_at = NOW()
      WHERE id = ${id}::uuid
        AND account_id = ${String(account.id)}::uuid
      RETURNING *
    `;
    if (!upd.rows[0]) return NextResponse.json({ error: 'Espacio no encontrado' }, { status: 404 });
    return NextResponse.json({ success: true, space: upd.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
