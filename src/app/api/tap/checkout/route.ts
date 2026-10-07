import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getTenantId } from '@/lib/tenant';
import {
  TAP_WALL_PRODUCTS,
  TAP_WALL_TERMS_VERSION,
  ensureTapWallSchema,
  getTapAccountByTenant,
  monthlyPriceEuros,
  newPublicCode,
  tapWallBaseProductId,
  tapWallExtraProductId,
  type TapWallProductSku,
} from '@/lib/tap-wall';
import {
  getPolarClient,
  isPolarInvalidTokenError,
  polarInvalidTokenUserMessage,
} from '@/lib/polar-server';

function baseUrlFromReq(req: NextRequest): string {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || '').split(':')[0];
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  if (host.includes('tap.')) return `${proto}://${host}`;
  return 'https://tap.delfincheckin.com';
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({ error: 'No autorizado. Inicia sesión en el admin o en tap.' }, { status: 401 });
    }

    const baseId = tapWallBaseProductId();
    if (!baseId) {
      return NextResponse.json(
        {
          error:
            'Falta POLAR_PRODUCT_TAP_WALL_ID en Vercel. Crea el producto de 10€/mes en Polar y pega el UUID.',
        },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const productSku = String(body.product_sku || 'instructions_nfc') as TapWallProductSku;
    if (!TAP_WALL_PRODUCTS.some((p) => p.sku === productSku)) {
      return NextResponse.json({ error: 'Producto no válido' }, { status: 400 });
    }

    const propertiesCount = Math.max(1, Math.min(200, Number(body.properties_count) || 1));
    const acceptTerms = body.accept_terms === true;
    if (!acceptTerms) {
      return NextResponse.json(
        { error: 'Debes aceptar los términos del servicio Tap Wall para continuar.' },
        { status: 400 }
      );
    }

    const shipping = {
      name: String(body.shipping_name || '').trim(),
      line1: String(body.shipping_line1 || '').trim(),
      line2: String(body.shipping_line2 || '').trim(),
      city: String(body.shipping_city || '').trim(),
      postal: String(body.shipping_postal || '').trim(),
      country: String(body.shipping_country || 'ES').trim().toUpperCase() || 'ES',
      phone: String(body.shipping_phone || '').trim(),
    };
    if (!shipping.name || !shipping.line1 || !shipping.city || !shipping.postal) {
      return NextResponse.json(
        { error: 'Indica nombre y dirección completa de envío del producto físico.' },
        { status: 400 }
      );
    }

    await ensureTapWallSchema();

    const tenant = await sql`
      SELECT id, email, name, polar_customer_id FROM tenants WHERE id = ${tenantId}::uuid LIMIT 1
    `;
    const t = tenant.rows[0] as
      | { id: string; email: string; name: string; polar_customer_id: string | null }
      | undefined;
    if (!t) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 });

    let account = await getTapAccountByTenant(tenantId);
    if (!account) {
      const ins = await sql`
        INSERT INTO tap_wall_accounts (
          tenant_id, email, status, properties_count, product_sku,
          shipping_name, shipping_line1, shipping_line2, shipping_city, shipping_postal,
          shipping_country, shipping_phone, terms_version, terms_accepted_at, updated_at
        ) VALUES (
          ${tenantId}::uuid, ${t.email}, 'inactive', ${propertiesCount}, ${productSku},
          ${shipping.name}, ${shipping.line1}, ${shipping.line2 || null}, ${shipping.city}, ${shipping.postal},
          ${shipping.country}, ${shipping.phone || null}, ${TAP_WALL_TERMS_VERSION}, NOW(), NOW()
        )
        RETURNING *
      `;
      account = ins.rows[0] as Record<string, unknown>;
      const code = newPublicCode();
      await sql`
        INSERT INTO tap_wall_spaces (account_id, tenant_id, name, public_code)
        VALUES (${String(account.id)}::uuid, ${tenantId}::uuid, ${'Alojamiento 1'}, ${code})
      `;
    } else {
      await sql`
        UPDATE tap_wall_accounts
        SET properties_count = ${propertiesCount},
            product_sku = ${productSku},
            shipping_name = ${shipping.name},
            shipping_line1 = ${shipping.line1},
            shipping_line2 = ${shipping.line2 || null},
            shipping_city = ${shipping.city},
            shipping_postal = ${shipping.postal},
            shipping_country = ${shipping.country},
            shipping_phone = ${shipping.phone || null},
            terms_version = ${TAP_WALL_TERMS_VERSION},
            terms_accepted_at = NOW(),
            updated_at = NOW()
        WHERE id = ${String(account.id)}::uuid
      `;
    }

    const products = [baseId];
    const extraId = tapWallExtraProductId();
    const extras = Math.max(0, propertiesCount - 1);
    if (extras > 0) {
      if (!extraId) {
        return NextResponse.json(
          {
            error:
              'Para más de 1 propiedad falta POLAR_PRODUCT_TAP_WALL_EXTRA_ID (producto 2€/mes por propiedad).',
          },
          { status: 503 }
        );
      }
      for (let i = 0; i < extras; i++) products.push(extraId);
    }

    const app = baseUrlFromReq(req);
    const polar = getPolarClient();
    const checkout = await polar.checkouts.create({
      products,
      successUrl: `${app}/app?polar=success&checkout_id={CHECKOUT_ID}`,
      returnUrl: `${app}/contratar`,
      customerEmail: t.email,
      customerName: t.name || undefined,
      customerId: t.polar_customer_id || undefined,
      customerExternalId: tenantId,
      requireBillingAddress: true,
      metadata: {
        source: 'tap_wall',
        tenant_id: tenantId,
        tap_account_id: String(account!.id),
        email: t.email,
        product_sku: productSku,
        properties_count: String(propertiesCount),
        monthly_euros: String(monthlyPriceEuros(propertiesCount)),
        terms_version: TAP_WALL_TERMS_VERSION,
      },
    } as any);

    await sql`
      UPDATE tap_wall_accounts
      SET polar_checkout_id = ${String(checkout.id)},
          updated_at = NOW()
      WHERE id = ${String(account!.id)}::uuid
    `;

    return NextResponse.json({
      success: true,
      url: checkout.url,
      monthlyEuros: monthlyPriceEuros(propertiesCount),
    });
  } catch (e: any) {
    if (isPolarInvalidTokenError(e)) {
      return NextResponse.json({ error: polarInvalidTokenUserMessage() }, { status: 503 });
    }
    console.error('[tap/checkout]', e);
    return NextResponse.json({ error: e?.message || 'Error creando el pago' }, { status: 500 });
  }
}
