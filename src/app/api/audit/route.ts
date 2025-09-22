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
