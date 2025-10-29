import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';

export async function GET(req: NextRequest) {
  try {
    // Priorizar tenant desde JWT
    let tenantId = await getTenantId(req);
    if (!tenantId) {
      const headerTenantId = req.headers.get('x-tenant-id') || '';
      const { searchParams } = new URL(req.url);
      const queryTenantId = searchParams.get('tenantId') || '';
      tenantId = headerTenantId || queryTenantId;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant in context' }, { status: 401 });
    }

    const result = await sql`
      SELECT id, name, email, telegram_chat_id, telegram_enabled, ai_tokens_used, ai_token_limit
      FROM tenants
      WHERE id = ${tenantId}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Tenant not found', tenantId }, { status: 404 });
    }

    return NextResponse.json({ success: true, tenant: result.rows[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unknown error' }, { status: 500 });
  }
}


