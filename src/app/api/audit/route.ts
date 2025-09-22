import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    if (!entityId) {
      return NextResponse.json({ success: false, error: 'Falta entityId' }, { status: 400 });
    }

    const result = await sql`
      SELECT action, entity_type, entity_id, payload_hash, at, ip, meta
      FROM audit_log
      WHERE entity_id = ${entityId}
      ORDER BY at ASC
      LIMIT ${limit}
    `;

    return NextResponse.json({ success: true, items: result.rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
