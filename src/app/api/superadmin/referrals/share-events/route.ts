import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { ensureReferralShareEventsSchema } from '@/lib/referral-share-events';

/**
 * GET /api/superadmin/referrals/share-events
 * Lista eventos de compartir/copiar de los tenants en su sección de referidos.
 */
export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const payload = verifyToken(authToken);
    if (!payload || !payload.isPlatformAdmin) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    await ensureReferralShareEventsSchema();

    const url = new URL(req.url);
    const limitRaw = url.searchParams.get('limit');
    const tenantId = url.searchParams.get('tenant_id');
    const action = url.searchParams.get('action');

    const limit = Math.min(Math.max(parseInt(limitRaw || '200', 10) || 200, 1), 1000);

    let text = `
      SELECT
        e.id,
        e.tenant_id,
        t.name as tenant_name,
        t.email as tenant_email,
        t.referral_code as tenant_referral_code,
        e.referral_code,
        e.action,
        e.page,
        e.target,
        e.metadata,
        e.created_at
      FROM referral_share_events e
      LEFT JOIN tenants t ON t.id = e.tenant_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tenantId) {
      params.push(tenantId);
      text += ` AND e.tenant_id = $${params.length}::uuid`;
    }
    if (action) {
      params.push(action);
      text += ` AND e.action = $${params.length}`;
    }

    text += ` ORDER BY e.created_at DESC LIMIT ${limit}`;

    const rows = await (sql as any).query(text, params);

    return NextResponse.json({
      success: true,
      events: rows.rows.map((r: any) => ({
        id: r.id,
        tenantId: r.tenant_id,
        tenantName: r.tenant_name,
        tenantEmail: r.tenant_email,
        tenantReferralCode: r.tenant_referral_code,
        referralCode: r.referral_code,
        action: r.action,
        page: r.page,
        target: r.target,
        metadata: r.metadata,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('❌ Error fetching referral share-events:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

