import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';

/**
 * API admin opcional: listado de public_owner_leads (tras migración SQL).
 * v1 principal sigue siendo el CLI + CSV.
 */
async function requireSuperAdmin(req: NextRequest) {
  const authToken = req.cookies.get('auth_token')?.value;
  if (!authToken) return null;
  const payload = verifyToken(authToken);
  if (!isEffectiveSuperAdminPayload(payload)) return null;
  return payload;
}

export async function GET(req: NextRequest) {
  const admin = await requireSuperAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  try {
    const meta = await sql`SELECT to_regclass('public.public_owner_leads') AS reg`;
    if (!meta.rows[0]?.reg) {
      return NextResponse.json({
        ok: true,
        table_ready: false,
        message:
          'Tabla public_owner_leads no existe. Ejecuta database/migration-public-owner-leads.sql o usa el CSV del CLI.',
        leads: [],
      });
    }

    const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 100), 500);
    const rows = await sql`
      SELECT
        id, email, domain, source_url, status, opted_out,
        queued_at, sent_at, created_at, updated_at, notes
      FROM public_owner_leads
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    const stats = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE opted_out)::int AS opted_out,
        COUNT(*) FILTER (WHERE status = 'queued' AND NOT opted_out)::int AS queued,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent
      FROM public_owner_leads
    `;

    return NextResponse.json({
      ok: true,
      table_ready: true,
      stats: stats.rows[0] || {},
      leads: rows.rows,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
