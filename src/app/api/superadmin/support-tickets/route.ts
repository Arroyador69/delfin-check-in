import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifySuperAdmin } from '@/lib/auth-superadmin';

export async function GET(req: NextRequest) {
  const { error } = await verifySuperAdmin(req);
  if (error) return error;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const rows = status
      ? await sql`
          SELECT
            st.id,
            st.tenant_id,
            t.name AS tenant_name,
            t.email AS tenant_email,
            st.reporter_email,
            st.subject,
            st.category,
            st.status,
            st.created_at,
            st.updated_at,
            st.superadmin_notes
          FROM support_tickets st
          INNER JOIN tenants t ON t.id = st.tenant_id
          WHERE st.status = ${status}
          ORDER BY st.created_at DESC
          LIMIT 500
        `
      : await sql`
          SELECT
            st.id,
            st.tenant_id,
            t.name AS tenant_name,
            t.email AS tenant_email,
            st.reporter_email,
            st.subject,
            st.category,
            st.status,
            st.created_at,
            st.updated_at,
            st.superadmin_notes
          FROM support_tickets st
          INNER JOIN tenants t ON t.id = st.tenant_id
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
