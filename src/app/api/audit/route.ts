import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
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

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { ensureAuditTable } from '@/lib/audit';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    if (!entityId) {
      return NextResponse.json({ success: false, error: 'Falta entityId' }, { status: 400 });
    }

    await ensureAuditTable();
    const result = await sql`
      SELECT action, entity_type, entity_id, payload_hash, at, ip, meta
      FROM audit_log
      WHERE entity_id = ${entityId}
      ORDER BY at ASC
      LIMIT ${limit}
    `;
    if (result.rows.length > 0) {
      return NextResponse.json({ success: true, items: result.rows });
    }

    // Fallback: sintetizar eventos desde guest_registrations si no hay filas en audit_log
    const reg = await sql`
      SELECT created_at, data
      FROM guest_registrations
      WHERE (data->>'audit_hash') = ${entityId}
      ORDER BY created_at ASC
      LIMIT 1
    `;
    if (reg.rows.length === 0) {
      return NextResponse.json({ success: true, items: [] });
    }
    const createdAt = reg.rows[0].created_at;
    const items = [
      { action: 'PARTE_CREATE', entity_type: 'parte', entity_id: entityId, payload_hash: entityId, at: createdAt, ip: null, meta: { synthesized: true } },
      { action: 'VALIDATE_OK', entity_type: 'parte', entity_id: entityId, payload_hash: entityId, at: createdAt, ip: null, meta: { synthesized: true } },
    ];
    return NextResponse.json({ success: true, items });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
