import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTenantId } from '@/lib/tenant';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const { id } = await context.params;

    const ticket = await sql`
      SELECT id, tenant_id, reporter_email, subject, body, category, status, created_at, updated_at
      FROM support_tickets
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      LIMIT 1
    `;
    if (!ticket.rows.length) {
      return NextResponse.json({ error: 'Incidencia no encontrada' }, { status: 404 });
    }

    // Mensajes del hilo (si la tabla no existe aún, devolvemos solo el body del ticket)
    let messages: Array<{
      id: string;
      sender_type: string;
      sender_email: string;
      message: string;
      created_at: string;
    }> = [];

    try {
      const msg = await sql`
        SELECT id, sender_type, sender_email, message, created_at
        FROM support_ticket_messages
        WHERE ticket_id = ${id}::uuid
        ORDER BY created_at ASC
        LIMIT 200
      `;
      messages = msg.rows as any;
    } catch (_) {}

    return NextResponse.json({ success: true, ticket: ticket.rows[0], messages });
  } catch (e) {
    console.error('tenant support ticket GET:', e);
    return NextResponse.json({ error: 'Error al cargar' }, { status: 500 });
  }
}

