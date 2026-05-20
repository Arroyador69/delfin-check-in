import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { ensureSupportTicketsSchema } from '@/lib/support-tickets-schema';

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

const TICKET_LIST_SELECT = `
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

export async function GET(req: NextRequest) {
  const { error } = await verifySuperAdmin(req);
  if (error) return error;

  try {
    await ensureSupportTicketsSchema();
    await ensureTenantNotificationsSchema();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const q = String(searchParams.get('q') || '').trim();
    const like = q ? `%${q}%` : null;

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (status) {
      params.push(status);
      conditions.push(`st.status = $${params.length}`);
    }
    if (like) {
      params.push(like);
      const p = `$${params.length}`;
      conditions.push(`(
        st.reporter_email ILIKE ${p}
        OR st.subject ILIKE ${p}
        OR t.name ILIKE ${p}
        OR t.email ILIKE ${p}
        OR COALESCE(st.ticket_code, '') ILIKE ${p}
      )`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const text = `${TICKET_LIST_SELECT} ${whereClause} ORDER BY st.created_at DESC LIMIT 500`;

    const result = await sql.query(text, params);

    return NextResponse.json({ success: true, tickets: result.rows });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('superadmin support-tickets GET:', e);
    if (msg.includes('support_tickets') && msg.includes('does not exist')) {
      return NextResponse.json(
        { success: false, error: 'Ejecuta database/support-tickets.sql en la base de datos.' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Error al cargar incidencias', details: msg }, { status: 500 });
  }
}
