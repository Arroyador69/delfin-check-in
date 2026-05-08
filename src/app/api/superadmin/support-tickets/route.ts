import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/auth-superadmin';

async function ensureTenantNotificationsSchema() {
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
  const { error } = await verifySuperAdmin(req);
  if (error) return error;

  try {
    await ensureTenantNotificationsSchema();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const q = String(searchParams.get('q') || '').trim();
    const like = q ? `%${q}%` : null;

    // Añadimos read status del último reply de soporte al tenant para este ticket.
    const baseSelect = sql`
      SELECT
        st.id,
        st.ticket_code,
        st.tenant_id,
        t.name AS tenant_name,
        t.email AS tenant_email,
        st.reporter_email,
        st.subject,
        st.category,
        st.status,
        st.created_at,
        st.updated_at,
        st.superadmin_notes,
        (
          SELECT tn.is_read
          FROM tenant_notifications tn
          WHERE tn.tenant_id = st.tenant_id
            AND tn.type = 'support_reply'
            AND tn.link LIKE ('%ticket=' || st.id::text || '%')
          ORDER BY tn.created_at DESC
          LIMIT 1
        ) AS last_support_reply_is_read,
        (
          SELECT tn.read_at
          FROM tenant_notifications tn
          WHERE tn.tenant_id = st.tenant_id
            AND tn.type = 'support_reply'
            AND tn.link LIKE ('%ticket=' || st.id::text || '%')
          ORDER BY tn.created_at DESC
          LIMIT 1
        ) AS last_support_reply_read_at
      FROM support_tickets st
      INNER JOIN tenants t ON t.id = st.tenant_id
    `;

    const rows =
      status && like
        ? await sql`
            ${baseSelect}
            WHERE st.status = ${status}
              AND (
                st.reporter_email ILIKE ${like}
                OR st.subject ILIKE ${like}
                OR t.name ILIKE ${like}
                OR t.email ILIKE ${like}
                OR st.ticket_code ILIKE ${like}
              )
            ORDER BY st.created_at DESC
            LIMIT 500
          `
        : status
          ? await sql`
              ${baseSelect}
              WHERE st.status = ${status}
              ORDER BY st.created_at DESC
              LIMIT 500
            `
          : like
            ? await sql`
                ${baseSelect}
                WHERE (
                  st.reporter_email ILIKE ${like}
                  OR st.subject ILIKE ${like}
                  OR t.name ILIKE ${like}
                  OR t.email ILIKE ${like}
                  OR st.ticket_code ILIKE ${like}
                )
                ORDER BY st.created_at DESC
                LIMIT 500
              `
            : await sql`
                ${baseSelect}
                ORDER BY st.created_at DESC
                LIMIT 500
              `;

    return NextResponse.json({ success: true, tickets: rows.rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('support_tickets') || msg.includes('does not exist')) {
      return NextResponse.json(
        { success: false, error: 'Ejecuta database/support-tickets.sql en la base de datos.' },
        { status: 503 }
      );
    }
    console.error('superadmin support-tickets GET:', e);
    return NextResponse.json({ error: 'Error al cargar incidencias' }, { status: 500 });
  }
}
