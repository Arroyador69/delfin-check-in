import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';
import { sql } from '@vercel/postgres';

type UpgradePlanId = 'checkin' | 'standard' | 'pro';

function baseUrl(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`.replace(/\/+$/, '');
}

function productIdFor(planId: UpgradePlanId): string | null {
  const v =
    planId === 'checkin'
      ? process.env.POLAR_PRODUCT_CHECKIN_ID
      : planId === 'standard'
        ? process.env.POLAR_PRODUCT_STANDARD_ID
        : process.env.POLAR_PRODUCT_PRO_ID;
  const trimmed = String(v || '').trim();
  return trimmed ? trimmed : null;
}

/**
 * GET /api/polar/upgrade?plan=checkin|standard|pro&rooms=2&locale=es
 *
 * Redirige al checkout alojado de Polar (MoR) para "Mejorar plan".
 * Nota: hoy enviamos 1 producto base por plan. El pricing granular por unidades extra
 * se mantiene en UI/BD (límite de unidades) y puede ampliarse a add-ons en Polar.
 */
export async function GET(req: NextRequest) {
  const tenantId = await getTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'Tenant no identificado' }, { status: 401 });
  }

  const u = new URL(req.url);
  const plan = (u.searchParams.get('plan') || '').toLowerCase() as UpgradePlanId;
  const locale = (u.searchParams.get('locale') || 'es').toLowerCase();

  const safePlan: UpgradePlanId =
    plan === 'checkin' || plan === 'standard' || plan === 'pro' ? plan : 'pro';

  const productId = productIdFor(safePlan);
  if (!productId) {
    return NextResponse.json(
      { success: false, error: `Polar no configurado: falta POLAR_PRODUCT_${safePlan.toUpperCase()}_ID` },
      { status: 500 }
    );
  }

  // Guardamos intención en BD (útil para soporte/analytics).
  try {
    await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_last_upgrade_intent_at TIMESTAMP`;
    await sql`
      UPDATE tenants
      SET polar_last_upgrade_intent_at = NOW()
      WHERE id = ${tenantId}::uuid
    `;
  } catch {
    // No bloquear el checkout si falla el ALTER/UPDATE.
  }

  const app = baseUrl(req);
  const metadata = encodeURIComponent(JSON.stringify({ tenant_id: tenantId, plan: safePlan, source: 'upgrade_plan' }));
  const success =
    process.env.POLAR_SUCCESS_URL ||
    `${app}/${locale}/settings/billing?polar=success&checkout_id={CHECKOUT_ID}`;
  const returnUrl = process.env.POLAR_RETURN_URL || app;

  // Usamos el handler oficial en /api/polar/checkout.
  const checkoutUrl = new URL(`${app}/api/polar/checkout`);
  checkoutUrl.searchParams.set('products', productId);
  checkoutUrl.searchParams.set('metadata', decodeURIComponent(metadata));
  checkoutUrl.searchParams.set('success_url', success);
  checkoutUrl.searchParams.set('return_url', returnUrl);

  return NextResponse.redirect(checkoutUrl.toString(), 302);
}

