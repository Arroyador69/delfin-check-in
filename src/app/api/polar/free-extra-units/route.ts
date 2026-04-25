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

  const productId = String(process.env.POLAR_PRODUCT_FREE_EXTRA_UNITS_ID || '').trim();
  if (!productId) {
    return NextResponse.json(
      { success: false, error: 'Falta POLAR_PRODUCT_FREE_EXTRA_UNITS_ID' },
      { status: 500 }
    );
  }

  const u = new URL(req.url);
  const locale = (u.searchParams.get('locale') || 'es').toLowerCase();
  const roomsParam = u.searchParams.get('rooms');
  const rooms = Math.max(2, Math.min(999, Math.floor(Number(roomsParam || 2) || 2)));
  const seats = rooms - 1; // unidades extra

  const app = baseUrl(req);
  const metadata = JSON.stringify({
    tenant_id: tenantId,
    plan: 'free',
    rooms,
    extra_units: seats,
    source: 'free_extra_units',
    locale,
  });

  // Reutilizamos el checkout handler común.
  const checkoutUrl = new URL(`${app}/api/polar/checkout`);
  checkoutUrl.searchParams.append('products', productId);
  checkoutUrl.searchParams.set('seats', String(seats));
  checkoutUrl.searchParams.set('customerExternalId', tenantId);
  checkoutUrl.searchParams.set('metadata', metadata);

  return NextResponse.redirect(checkoutUrl.toString(), 302);
}

