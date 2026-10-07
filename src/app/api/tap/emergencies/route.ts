import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';
import { getTapAccountByTenant, isTapWallActiveStatus } from '@/lib/tap-wall';

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const account = await getTapAccountByTenant(tenantId);
    if (!account || !isTapWallActiveStatus(account.status as string)) {
      return NextResponse.json({ error: 'Suscripción no activa' }, { status: 403 });
    }
    const r = await sql`
      SELECT em.*, sp.name AS space_name, sp.public_code
      FROM tap_wall_emergencies em
      JOIN tap_wall_spaces sp ON sp.id = em.space_id
      WHERE sp.account_id = ${String(account.id)}::uuid
      ORDER BY em.created_at DESC
      LIMIT 50
    `;
    return NextResponse.json({ success: true, emergencies: r.rows });
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
    const account = await getTapAccountByTenant(tenantId);
    if (!account) return NextResponse.json({ error: 'Sin cuenta' }, { status: 404 });
    const body = await req.json().catch(() => ({}));
    const id = String(body.id || '').trim();
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });
    await sql`
      UPDATE tap_wall_emergencies em
      SET seen_at = NOW()
      FROM tap_wall_spaces sp
      WHERE em.id = ${id}::uuid
        AND em.space_id = sp.id
        AND sp.account_id = ${String(account.id)}::uuid
    `;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
