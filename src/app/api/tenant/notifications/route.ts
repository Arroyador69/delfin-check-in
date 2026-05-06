import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTenantId } from '@/lib/tenant';

async function ensureSchema() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS tenant_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        type VARCHAR(48) NOT NULL DEFAULT 'generic',
        title TEXT NOT NULL,
        body TEXT,
        link TEXT,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        read_at TIMESTAMPTZ
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_tenant_notifications_tenant_unread
      ON tenant_notifications(tenant_id, is_read, created_at DESC)
    `;
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    await ensureSchema();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    const unread = type
      ? await sql`
          SELECT COUNT(*)::int AS count
          FROM tenant_notifications
          WHERE tenant_id = ${tenantId}::uuid AND is_read = FALSE AND type = ${type}
        `
      : await sql`
          SELECT COUNT(*)::int AS count
          FROM tenant_notifications
          WHERE tenant_id = ${tenantId}::uuid AND is_read = FALSE
        `;

    const items = type
      ? await sql`
          SELECT id, type, title, body, link, is_read, created_at, read_at
          FROM tenant_notifications
          WHERE tenant_id = ${tenantId}::uuid AND type = ${type}
          ORDER BY created_at DESC
          LIMIT 25
        `
      : await sql`
          SELECT id, type, title, body, link, is_read, created_at, read_at
          FROM tenant_notifications
          WHERE tenant_id = ${tenantId}::uuid
          ORDER BY created_at DESC
          LIMIT 25
        `;

    return NextResponse.json({ success: true, unreadCount: unread.rows[0]?.count ?? 0, items: items.rows });
  } catch (e) {
    console.error('tenant notifications GET:', e);
    return NextResponse.json({ success: true, unreadCount: 0, items: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    await ensureSchema();

    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? (body.ids as string[]).map(String) : [];
    if (!ids.length) return NextResponse.json({ success: true, updated: 0 });

    // Construir placeholders para un IN seguro
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
    const result = await sql.query(
      `
        UPDATE tenant_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE tenant_id = $1::uuid
          AND id IN (${placeholders})
          AND is_read = FALSE
      `,
      [tenantId, ...ids]
    );

    return NextResponse.json({ success: true, updated: result.rowCount ?? 0 });
  } catch (e) {
    console.error('tenant notifications POST:', e);
    return NextResponse.json({ error: 'Error al actualizar notificaciones' }, { status: 500 });
  }
}

