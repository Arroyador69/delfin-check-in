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

function extraUnitProductId(): string | null {
  const trimmed = String(process.env.POLAR_PRODUCT_EXTRA_UNIT_ID || '').trim();
  return trimmed ? trimmed : null;
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
 * En Polar, el plan es el producto base y las unidades extra se representan con un producto
 * adicional seat-based (2 €/mes por unidad). Se pasa `seats = (rooms - 1)` cuando aplica.
 */
export async function GET(req: NextRequest) {
  const tenantId = await getTenantId(req);
  if (!tenantId) {
    return NextResponse.json({ success: false, error: 'Tenant no identificado' }, { status: 401 });
  }

  const u = new URL(req.url);
  const plan = (u.searchParams.get('plan') || '').toLowerCase() as UpgradePlanId;
  const locale = (u.searchParams.get('locale') || 'es').toLowerCase();
  const roomsParam = u.searchParams.get('rooms');
  const rooms = Math.max(1, Math.min(999, Math.floor(Number(roomsParam || 1) || 1)));

  const safePlan: UpgradePlanId =
    plan === 'checkin' || plan === 'standard' || plan === 'pro' ? plan : 'pro';

  const productId = productIdFor(safePlan);
  if (!productId) {
    return NextResponse.json(
      { success: false, error: `Polar no configurado: falta POLAR_PRODUCT_${safePlan.toUpperCase()}_ID` },
      { status: 500 }
    );
  }

  const extraUnits = Math.max(0, rooms - 1);
  const extraProductId = extraUnits > 0 ? extraUnitProductId() : null;
  if (extraUnits > 0 && !extraProductId) {
    return NextResponse.json(
      { success: false, error: 'Polar no configurado: falta POLAR_PRODUCT_EXTRA_UNIT_ID' },
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
  const metadata = encodeURIComponent(
    JSON.stringify({
      tenant_id: tenantId,
      plan: safePlan,
      rooms,
      extra_units: extraUnits,
      source: 'upgrade_plan',
      locale,
    })
  );

  // Usamos el handler oficial en /api/polar/checkout.
  const checkoutUrl = new URL(`${app}/api/polar/checkout`);
  // Se pueden repetir params `products=...` para multi-product checkout.
  checkoutUrl.searchParams.append('products', productId);
  if (extraProductId) {
    checkoutUrl.searchParams.append('products', extraProductId);
    // `seats` aplica a productos seat-based (usamos esto para unidades extra).
    checkoutUrl.searchParams.set('seats', String(extraUnits));
  }
  // Asociar el cliente en Polar al tenant: facilita reconciliación.
  checkoutUrl.searchParams.set('customerExternalId', tenantId);
  checkoutUrl.searchParams.set('metadata', metadata);

  return NextResponse.redirect(checkoutUrl.toString(), 302);
}

