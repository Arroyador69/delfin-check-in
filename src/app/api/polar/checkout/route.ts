import { NextRequest, NextResponse } from 'next/server';
import { Polar } from '@polar-sh/sdk';

/**
 * Polar checkout redirection (SaaS subscriptions).
 *
 * Se usa como endpoint "GET" que redirige al checkout alojado de Polar.
 * Ejemplo:
 * - /api/polar/checkout?products=PROD_ID&metadata=%7B%22tenant_id%22%3A%22...%22%7D
 */
function getPolar(): Polar {
  const token = String(process.env.POLAR_ACCESS_TOKEN || '').trim();
  if (!token) {
    throw new Error('POLAR_ACCESS_TOKEN no configurado');
  }
  return new Polar({ accessToken: token });
}

function apiBaseUrl(): string {
  const server = (process.env.POLAR_SERVER as 'sandbox' | 'production' | undefined) || 'sandbox';
  return server === 'production' ? 'https://api.polar.sh' : 'https://sandbox-api.polar.sh';
}

function baseUrlFromReq(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`.replace(/\/+$/, '');
}

export async function GET(req: NextRequest) {
  try {
    const u = new URL(req.url);

    const products = u.searchParams.getAll('products').filter(Boolean);
    if (products.length === 0) {
      return NextResponse.json({ success: false, error: 'Falta products' }, { status: 400 });
    }

    const app = baseUrlFromReq(req);
    const successUrl =
      u.searchParams.get('success_url') ||
      process.env.POLAR_SUCCESS_URL ||
      `${app}/es/settings/billing?polar=success&checkout_id={CHECKOUT_ID}`;
    const returnUrl =
      u.searchParams.get('return_url') || process.env.POLAR_RETURN_URL || process.env.NEXT_PUBLIC_APP_URL || app;

    const metadataRaw = u.searchParams.get('metadata');
    const metadata = metadataRaw ? JSON.parse(metadataRaw) : undefined;

    const seatsParam = u.searchParams.get('seats');
    const seats = seatsParam != null && seatsParam !== '' ? Number(seatsParam) : undefined;

    const customerExternalId = u.searchParams.get('customerExternalId') || undefined;
    const customerEmail = u.searchParams.get('customerEmail') || undefined;
    const customerName = u.searchParams.get('customerName') || undefined;
    const customerId = u.searchParams.get('customerId') || undefined;

    // Polar (MoR) calcula impuestos cuando tiene país/dirección del cliente. Si no se exige,
    // el checkout puede mostrar "Taxes —" hasta rellenar país; forzamos dirección de facturación por defecto.
    const requireBillingAddress =
      u.searchParams.get('require_billing_address') === 'false' ? false : true;

    const polar = getPolar();
    const checkout = await polar.checkouts.create(
      {
        products,
        successUrl,
        returnUrl,
        seats,
        customerExternalId,
        customerEmail,
        customerName,
        customerId,
        metadata,
        requireBillingAddress,
      } as any,
      {
        // El SDK permite override del servidor via baseUrl.
        baseUrl: apiBaseUrl(),
      } as any
    );

    return NextResponse.redirect(checkout.url, 302);
  } catch (e: any) {
    const msg = e?.message || String(e);
    const status = Number(e?.statusCode) || 500;
    console.error('❌ [polar checkout] Error:', e);
    return NextResponse.json(
      {
        success: false,
        error: msg,
        hint:
          'Revisa que POLAR_ACCESS_TOKEN tenga scope checkouts:write y que POLAR_SERVER coincida con el entorno del token.',
      },
      { status }
    );
  }
}

