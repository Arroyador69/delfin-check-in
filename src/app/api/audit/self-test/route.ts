import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTenantId } from '@/lib/tenant';
import { logAudit } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const tenantId = (await getTenantId(req)) || req.headers.get('x-tenant-id') || '';
    if (!tenantId || tenantId === 'default' || tenantId.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'No autorizado - tenant_id requerido' },
        { status: 401 }
      );
    }

    const correlationId = crypto.randomBytes(8).toString('hex');
    const payloadHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ correlationId, ts: Date.now() }))
      .digest('hex');

    await logAudit({
      action: 'VALIDATE_OK',
      entityType: 'AUDIT_SELF_TEST',
      entityId: correlationId,
      payloadHash,
      tenantId,
      ip: req.headers.get('x-forwarded-for') || null,
      meta: { test: true, stage: 'created' },
    });

    return NextResponse.json({ success: true, id: correlationId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

