import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getTenantId } from '@/lib/tenant';

async function ensureSchema() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS platform_updates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        created_by_email TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT,
        link TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_platform_updates_created_at ON platform_updates(created_at DESC)`;
  } catch (_) {}
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    await ensureSchema();

    const rows = await sql`
      SELECT id, created_by_email, title, body, link, created_at
      FROM platform_updates
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return NextResponse.json({ success: true, updates: rows.rows });
  } catch (e) {
    console.error('tenant updates GET:', e);
    return NextResponse.json({ success: true, updates: [] });
  }
}

