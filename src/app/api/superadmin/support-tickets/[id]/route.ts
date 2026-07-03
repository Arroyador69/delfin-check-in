import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { ensureSupportTicketsSchema } from '@/lib/support-tickets-schema';
import {
  isValidTicketUuid,
  normalizeSupportTicketStatus,
  SUPPORT_TICKET_STATUSES,
} from '@/lib/support-ticket-status';

async function ensureSupportMessageSchema() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS support_ticket_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        sender_type VARCHAR(16) NOT NULL,
        sender_email TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT support_ticket_messages_sender_check CHECK (sender_type IN ('tenant', 'superadmin'))
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket
      ON support_ticket_messages(ticket_id, created_at ASC)
    `;
  } catch (_) {}
}

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

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await verifySuperAdmin(req);
  if (error) return error;

  const { id } = await context.params;
  const ticketId = String(id || '').trim();

  if (!isValidTicketUuid(ticketId)) {
    return NextResponse.json(
      { success: false, error: 'Identificador de incidencia no válido' },
      { status: 400 }
    );
  }

  try {
    await ensureSupportTicketsSchema();
    await ensureSupportMessageSchema();
    const result = await sql`
      SELECT
        st.*,
        t.name AS tenant_name,
        t.email AS tenant_email
      FROM support_tickets st
      INNER JOIN tenants t ON t.id = st.tenant_id
      WHERE st.id = ${ticketId}::uuid
      LIMIT 1
    `;

    if (!result.rows.length) {
      return NextResponse.json(
        { success: false, error: 'Incidencia no encontrada' },
        { status: 404 }
      );
    }

    const ticket = result.rows[0] as Record<string, unknown>;
    ticket.status = normalizeSupportTicketStatus(String(ticket.status ?? 'open'));

    let messages: Array<Record<string, unknown>> = [];
    try {
      const msg = await sql`
        SELECT id, sender_type, sender_email, message, created_at
        FROM support_ticket_messages
        WHERE ticket_id = ${ticketId}::uuid
        ORDER BY created_at ASC
        LIMIT 200
      `;
      messages = msg.rows as Array<Record<string, unknown>>;
    } catch (_) {}

    if (messages.length === 0 && ticket.body) {
      messages = [
        {
          id: 'initial',
          sender_type: 'tenant',
          sender_email: ticket.reporter_email,
          message: ticket.body,
          created_at: ticket.created_at,
        },
      ];
    }

    return NextResponse.json({ success: true, ticket, messages });
  } catch (e) {
    console.error('superadmin support ticket GET:', e);
    const msg = e instanceof Error ? e.message : 'Error al cargar';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await verifySuperAdmin(req);
  if (error) return error;

  const { id } = await context.params;
  const ticketId = String(id || '').trim();
  if (!isValidTicketUuid(ticketId)) {
    return NextResponse.json({ success: false, error: 'ID no válido' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const cur = await sql`
      SELECT status, superadmin_notes FROM support_tickets WHERE id = ${ticketId}::uuid LIMIT 1
    `;
    if (!cur.rows.length) {
      return NextResponse.json({ success: false, error: 'Incidencia no encontrada' }, { status: 404 });
    }

    let nextStatus = normalizeSupportTicketStatus(cur.rows[0].status as string);
    let nextNotes = (cur.rows[0].superadmin_notes as string | null) ?? null;

    if (body.status != null && String(body.status).trim() !== '') {
      const s = normalizeSupportTicketStatus(String(body.status).trim());
      if (!SUPPORT_TICKET_STATUSES.includes(s)) {
        return NextResponse.json({ success: false, error: 'Estado no válido' }, { status: 400 });
      }
      nextStatus = s;
    }

    if (body.superadmin_notes !== undefined) {
      nextNotes = String(body.superadmin_notes);
    }

    await sql`
      UPDATE support_tickets
      SET
        status = ${nextStatus},
        superadmin_notes = ${nextNotes},
        updated_at = NOW()
      WHERE id = ${ticketId}::uuid
    `;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('superadmin support ticket PATCH:', e);
    return NextResponse.json({ success: false, error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error, payload } = await verifySuperAdmin(req);
  if (error) return error;

  const { id } = await context.params;
  const ticketId = String(id || '').trim();
  if (!isValidTicketUuid(ticketId)) {
    return NextResponse.json({ success: false, error: 'ID no válido' }, { status: 400 });
  }

  try {
    await ensureSupportMessageSchema();
    await ensureTenantNotificationsSchema();

    const body = await req.json();
    const message = String(body?.message ?? '').trim();
    if (message.length < 2 || message.length > 8000) {
      return NextResponse.json(
        { success: false, error: 'El mensaje debe tener entre 2 y 8000 caracteres.' },
        { status: 400 }
      );
    }

    const ticketRes = await sql`
      SELECT id, tenant_id, reporter_email, subject
      FROM support_tickets
      WHERE id = ${ticketId}::uuid
      LIMIT 1
    `;
    if (!ticketRes.rows.length) {
      return NextResponse.json({ success: false, error: 'Incidencia no encontrada' }, { status: 404 });
    }
    const ticket = ticketRes.rows[0] as any;

    const senderEmail = payload?.email ? String(payload.email) : 'contacto@delfincheckin.com';

    await sql`
      INSERT INTO support_ticket_messages (ticket_id, sender_type, sender_email, message)
      VALUES (${ticketId}::uuid, 'superadmin', ${senderEmail}, ${message})
    `;

    const shortSubject = String(ticket.subject || '').slice(0, 120);
    const preview = message.length > 160 ? `${message.slice(0, 157)}…` : message;
    const notifBody = shortSubject ? `${shortSubject} — ${preview}` : preview;
    const link = `/settings/support?ticket=${encodeURIComponent(ticketId)}`;
    await sql`
      INSERT INTO tenant_notifications (tenant_id, type, title, body, link)
      VALUES (
        ${ticket.tenant_id}::uuid,
        'support_reply',
        ${'Respuesta de soporte'},
        ${notifBody},
        ${link}
      )
    `;

    // Touch updated_at del ticket
    await sql`UPDATE support_tickets SET updated_at = NOW() WHERE id = ${ticketId}::uuid`;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('superadmin support ticket POST reply:', e);
    return NextResponse.json({ success: false, error: 'Error al enviar respuesta' }, { status: 500 });
  }
}
