import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';

function baseUrl(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`.replace(/\/+$/, '');
}

/**
 * GET /api/polar/free-extra-units?rooms=2&locale=es
 *
 * Plan Básico: 1 unidad gratis para siempre.
 * Si el usuario quiere >1, cobramos solo las unidades extra a 2 €/mes vía un producto seat-based.
 * Aquí pasamos `seats = rooms - 1`.
 */
export async function GET(req: NextRequest) {
  const tenantId = await getTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'Tenant no identificado' }, { status: 401 });
  }

  const u = new URL(req.url);
  const intervalParam = (u.searchParams.get('interval') || 'month').toLowerCase();
  const interval = intervalParam === 'year' ? 'year' : 'month';

  const productId = String(
    interval === 'year'
      ? process.env.POLAR_PRODUCT_FREE_EXTRA_UNITS_YEARLY_ID || process.env.POLAR_PRODUCT_FREE_EXTRA_UNITS_ID || ''
      : process.env.POLAR_PRODUCT_FREE_EXTRA_UNITS_ID || ''
  ).trim();
  if (!productId) {
    return NextResponse.json(
      {
        success: false,
        error:
          interval === 'year'
            ? 'Falta POLAR_PRODUCT_FREE_EXTRA_UNITS_YEARLY_ID'
            : 'Falta POLAR_PRODUCT_FREE_EXTRA_UNITS_ID',
      },
      { status: 500 }
    );
  }

  const locale = (u.searchParams.get('locale') || 'es').toLowerCase();
  const roomsParam = u.searchParams.get('rooms');
  const rooms = Math.max(2, Math.min(999, Math.floor(Number(roomsParam || 2) || 2)));
  const seats = rooms - 1; // unidades extra
  const successUrlParam = u.searchParams.get('success_url') || '';
  const returnUrlParam = u.searchParams.get('return_url') || '';

  const app = baseUrl(req);
  const toAbsoluteAppUrl = (maybeRelative: string) => {
    const raw = String(maybeRelative || '').trim();
    if (!raw) return '';
    // Solo permitimos rutas internas para evitar open-redirects.
    if (raw.startsWith('/')) return `${app}${raw}`;
    return '';
  };
  const successUrlAbs = toAbsoluteAppUrl(successUrlParam);
  const returnUrlAbs = toAbsoluteAppUrl(returnUrlParam);

  const metadata = JSON.stringify({
    tenant_id: tenantId,
    plan: 'free',
    rooms,
    extra_units: seats,
    source: 'free_extra_units',
    locale,
    interval,
  });

  // Reutilizamos el checkout handler común.
  const checkoutUrl = new URL(`${app}/api/polar/checkout`);
  checkoutUrl.searchParams.append('products', productId);
  checkoutUrl.searchParams.set('seats', String(seats));
  checkoutUrl.searchParams.set('customerExternalId', tenantId);
  checkoutUrl.searchParams.set('metadata', metadata);
  if (successUrlAbs) checkoutUrl.searchParams.set('success_url', successUrlAbs);
  if (returnUrlAbs) checkoutUrl.searchParams.set('return_url', returnUrlAbs);

  return NextResponse.redirect(checkoutUrl.toString(), 302);
}

