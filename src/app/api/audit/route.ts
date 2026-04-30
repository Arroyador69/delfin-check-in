import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const payload = verifyToken(authToken);
    const tenantId = payload?.tenantId ? String(payload.tenantId) : '';
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || undefined;
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const text = searchParams.get('q') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    // Asegurar tabla (no rompe si ya existe)
    await sql`CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      tenant_id UUID,
      actor_id UUID,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload_hash CHAR(64) NOT NULL,
      at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ip TEXT,
      meta JSONB
    );`;

    const clauses: string[] = [];
    const values: any[] = [];
    const push = (sqlSnippet: string, v?: any) => { clauses.push(sqlSnippet); if (typeof v !== 'undefined') values.push(v); };

    // 🔒 Multi-tenant: siempre filtrar por tenant autenticado
    push(`tenant_id = $${values.length + 1}::uuid`, tenantId);

    if (action) push(`action = $${values.length + 1}`, action);
    if (entityType) push(`entity_type = $${values.length + 1}`, entityType);
    if (entityId) push(`entity_id = $${values.length + 1}`, entityId);
    if (from) push(`at >= $${values.length + 1}`, from);
    if (to) push(`at < ($${values.length + 1}::timestamptz + INTERVAL '1 day')`, to);
    if (text) push(`(action ILIKE $${values.length + 1} OR entity_type ILIKE $${values.length + 1} OR entity_id ILIKE $${values.length + 1})`, `%${text}%`);

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const query = `
      SELECT id, tenant_id, actor_id, action, entity_type, entity_id, payload_hash, at, ip, meta
      FROM audit_log
      ${where}
      ORDER BY at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await sql.query(query, values);
    return NextResponse.json({ success: true, items: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
