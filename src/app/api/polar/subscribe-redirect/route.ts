import { NextRequest, NextResponse } from 'next/server';

type PlanId = 'checkin' | 'standard' | 'pro';
type BillingInterval = 'month' | 'year';

function baseUrl(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`.replace(/\/+$/, '');
}

function productIdFor(planId: PlanId, interval: BillingInterval): string | null {
  const v =
    planId === 'checkin'
      ? interval === 'year'
        ? process.env.POLAR_PRODUCT_CHECKIN_YEARLY_ID || process.env.POLAR_PRODUCT_CHECKIN_ID
        : process.env.POLAR_PRODUCT_CHECKIN_ID
      : planId === 'standard'
        ? interval === 'year'
          ? process.env.POLAR_PRODUCT_STANDARD_YEARLY_ID || process.env.POLAR_PRODUCT_STANDARD_ID
          : process.env.POLAR_PRODUCT_STANDARD_ID
        : interval === 'year'
          ? process.env.POLAR_PRODUCT_PRO_YEARLY_ID || process.env.POLAR_PRODUCT_PRO_ID
          : process.env.POLAR_PRODUCT_PRO_ID;
  const trimmed = String(v || '').trim();
  return trimmed ? trimmed : null;
}

/**
 * GET /api/polar/subscribe-redirect?plan=checkin|standard|pro&locale=es&seats=1&interval=month|year
 *
 * Flujo público (sin sesión): alta desde web o app móvil → checkout Polar (MoR).
 * La metadata `source: public_subscribe` permite al webhook crear tenant si aún no existe.
 */
export async function GET(req: NextRequest) {
  const u = new URL(req.url);
  const planRaw = (u.searchParams.get('plan') || '').toLowerCase();
  const locale = (u.searchParams.get('locale') || 'es').toLowerCase();
  const intervalParam = (u.searchParams.get('interval') || 'month').toLowerCase();
  const interval: BillingInterval = intervalParam === 'year' ? 'year' : 'month';
  const seats = Math.max(1, Math.min(999, Math.floor(Number(u.searchParams.get('seats') || 1) || 1)));

  const plan: PlanId =
    planRaw === 'checkin' || planRaw === 'standard' || planRaw === 'pro' ? planRaw : 'checkin';

  const productId = productIdFor(plan, interval);
  if (!productId) {
    return NextResponse.json(
      {
        success: false,
        error:
          interval === 'year'
            ? `Polar no configurado: falta POLAR_PRODUCT_${plan.toUpperCase()}_YEARLY_ID`
            : `Polar no configurado: falta POLAR_PRODUCT_${plan.toUpperCase()}_ID`,
      },
      { status: 500 }
    );
  }

  const app = baseUrl(req);
  const metadata = JSON.stringify({
    source: 'public_subscribe',
    plan,
    locale,
    seats,
    interval,
  });

  const successUrl = `${app}/${locale}/subscribe?polar_success=1`;
  const returnUrl = `${app}/${locale}/subscribe`;

  const checkoutUrl = new URL(`${app}/api/polar/checkout`);
  checkoutUrl.searchParams.append('products', productId);
  checkoutUrl.searchParams.set('seats', String(seats));
  checkoutUrl.searchParams.set('metadata', metadata);
  checkoutUrl.searchParams.set('success_url', successUrl);
  checkoutUrl.searchParams.set('return_url', returnUrl);

  return NextResponse.redirect(checkoutUrl.toString(), 302);
}
