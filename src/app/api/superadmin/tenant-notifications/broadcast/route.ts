import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/auth-superadmin';

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

  // Guardar auditoría de broadcasts (1 fila por envío)
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS platform_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_by_email TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        link TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_platform_updates_created_at ON platform_updates(created_at DESC)`;
  } catch (_) {}
}

export async function POST(req: NextRequest) {
  const { error, payload } = await verifySuperAdmin(req);
  if (error) return error;

  try {
    await ensureSchema();

    const body = await req.json();
    const title = String(body?.title ?? '').trim();
    const text = String(body?.body ?? '').trim();
    const link = body?.link != null ? String(body.link).trim() : '';

    if (title.length < 3 || title.length > 120) {
      return NextResponse.json({ error: 'El título debe tener entre 3 y 120 caracteres.' }, { status: 400 });
    }
    if (text.length < 3 || text.length > 4000) {
      return NextResponse.json({ error: 'El mensaje debe tener entre 3 y 4000 caracteres.' }, { status: 400 });
    }
    if (link && !link.startsWith('/')) {
      return NextResponse.json({ error: 'El link debe ser una ruta interna que empiece por /' }, { status: 400 });
    }

    // Seleccionar tenants activos (fallback: si no existe status, coger todos)
    let tenantIds: string[] = [];
    try {
      const r = await sql`SELECT id::text AS id FROM tenants WHERE status = 'active' ORDER BY created_at DESC`;
      tenantIds = r.rows.map((x: any) => String(x.id));
      if (tenantIds.length === 0) {
        const all = await sql`SELECT id::text AS id FROM tenants ORDER BY created_at DESC`;
        tenantIds = all.rows.map((x: any) => String(x.id));
      }
    } catch {
      const all = await sql`SELECT id::text AS id FROM tenants ORDER BY created_at DESC`;
      tenantIds = all.rows.map((x: any) => String(x.id));
    }

    const createdBy = payload?.email ? String(payload.email) : 'contacto@delfincheckin.com';
    await sql`
      INSERT INTO platform_updates (created_by_email, title, body, link)
      VALUES (${createdBy}, ${title}, ${text}, ${link || null})
    `;

    // Inserción por lotes (simple): una notificación por tenant
    let inserted = 0;
    for (const tenantId of tenantIds) {
      try {
        await sql`
          INSERT INTO tenant_notifications (tenant_id, type, title, body, link)
          VALUES (${tenantId}::uuid, 'product_update', ${title}, ${text}, ${link || null})
        `;
        inserted += 1;
      } catch (_) {
        // evitar bloquear si algún tenant está corrupto
      }
    }

    return NextResponse.json({ success: true, recipients: inserted });
  } catch (e) {
    console.error('superadmin broadcast notifications:', e);
    return NextResponse.json({ error: 'Error al enviar la actualización' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { error } = await verifySuperAdmin(req);
  if (error) return error;

  try {
    await ensureSchema();
    const rows = await sql`
      SELECT id, created_by_email, title, body, link, created_at
      FROM platform_updates
      ORDER BY created_at DESC
      LIMIT 25
    `;
    return NextResponse.json({ success: true, updates: rows.rows });
  } catch (e) {
    console.error('superadmin updates GET:', e);
    return NextResponse.json({ success: true, updates: [] });
  }
}

