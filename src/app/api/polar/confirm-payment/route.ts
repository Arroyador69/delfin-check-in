import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';
import { confirmPolarPaymentForTenant } from '@/lib/polar-confirm-payment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/polar/confirm-payment
 * Tras volver del checkout Polar: sincroniza suscripción si el webhook aún no actualizó el tenant.
 */
export async function POST(req: NextRequest) {
  const tenantId = await getTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'Tenant no identificado' }, { status: 401 });
  }

  try {
    const result = await confirmPolarPaymentForTenant(tenantId);
    const status = result.success ? 200 : result.error === 'no_subscription_found' ? 202 : 500;
    return NextResponse.json(result, { status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('❌ [polar confirm-payment]', e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
