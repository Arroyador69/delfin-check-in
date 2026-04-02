import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/auth-superadmin';

const STATUSES = ['open', 'in_review', 'resolved', 'closed'] as const;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await verifySuperAdmin(req);
  if (error) return error;

  const { id } = await context.params;

  try {
    const result = await sql`
      SELECT
        st.*,
        t.name AS tenant_name,
        t.email AS tenant_email
      FROM support_tickets st
      INNER JOIN tenants t ON t.id = st.tenant_id
      WHERE st.id = ${id}::uuid
      LIMIT 1
    `;

    if (!result.rows.length) {
      return NextResponse.json({ error: 'Incidencia no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, ticket: result.rows[0] });
  } catch (e) {
    console.error('superadmin support ticket GET:', e);
    return NextResponse.json({ error: 'Error al cargar' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await verifySuperAdmin(req);
  if (error) return error;

  const { id } = await context.params;

  try {
    const body = await req.json();
    const cur = await sql`
      SELECT status, superadmin_notes FROM support_tickets WHERE id = ${id}::uuid LIMIT 1
    `;
    if (!cur.rows.length) {
      return NextResponse.json({ error: 'Incidencia no encontrada' }, { status: 404 });
    }

    let nextStatus = cur.rows[0].status as string;
    let nextNotes = (cur.rows[0].superadmin_notes as string | null) ?? null;

    if (body.status != null && String(body.status).trim() !== '') {
      const s = String(body.status).trim();
      if (!STATUSES.includes(s as (typeof STATUSES)[number])) {
        return NextResponse.json({ error: 'Estado no válido' }, { status: 400 });
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
      WHERE id = ${id}::uuid
    `;

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('superadmin support ticket PATCH:', e);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
