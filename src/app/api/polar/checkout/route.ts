import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/error-logger';
import { getPolarClient, polarErrorMeta } from '@/lib/polar-server';

/**
 * Polar checkout redirection (SaaS subscriptions).
 *
 * Se usa como endpoint "GET" que redirige al checkout alojado de Polar.
 * Ejemplo:
 * - /api/polar/checkout?products=PROD_ID&metadata=%7B%22tenant_id%22%3A%22...%22%7D
 */

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
    let metadata: Record<string, unknown> | undefined;
    if (metadataRaw) {
      try {
        const parsed = JSON.parse(metadataRaw);
        metadata = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined;
      } catch {
        return NextResponse.json({ success: false, error: 'metadata JSON inválido' }, { status: 400 });
      }
    }

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

    const polar = getPolarClient();
    const checkout = await polar.checkouts.create({
      products,
      successUrl,
      returnUrl,
      seats: Number.isFinite(seats) ? seats : undefined,
      customerExternalId,
      customerEmail,
      customerName,
      customerId,
      metadata,
      requireBillingAddress,
    } as any);

    return NextResponse.redirect(checkout.url, 302);
  } catch (e: any) {
    const msg = e?.message || String(e);
    const rawStatus = Number(e?.statusCode);
    const status =
      Number.isFinite(rawStatus) && rawStatus >= 400 && rawStatus <= 599 ? rawStatus : 500;

    const u = new URL(req.url);
    const products = u.searchParams.getAll('products').filter(Boolean);
    let tenantId: string | null = null;
    let metaSource: string | undefined;
    let metaPlan: string | undefined;
    try {
      const raw = u.searchParams.get('metadata');
      if (raw) {
        const m = JSON.parse(raw) as Record<string, unknown>;
        tenantId = typeof m.tenant_id === 'string' ? m.tenant_id : null;
        metaSource = typeof m.source === 'string' ? m.source : undefined;
        metaPlan = typeof m.plan === 'string' ? m.plan : undefined;
      }
    } catch {
      // ignore
    }

    const logMsg = `❌ [polar checkout] ${msg}`;
    console.error(logMsg, e);
    void logError({
      level: 'error',
      message: logMsg,
      error: e,
      tenantId,
      url: `${u.pathname}${u.search}`.slice(0, 2000),
      metadata: {
        products,
        seats: u.searchParams.get('seats'),
        source: metaSource,
        plan: metaPlan,
        ...polarErrorMeta(e),
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: msg,
        hint:
          'Revisa POLAR_ACCESS_TOKEN (scope checkouts:write) y que POLAR_SERVER coincida con el entorno del token (sandbox|production).',
      },
      { status }
    );
  }
}

