import { NextRequest, NextResponse } from 'next/server';
import { getTenantId } from '@/lib/tenant';
import {
  TAP_WALL_PRODUCTS,
  getTapAccountByTenant,
  isTapWallActiveStatus,
  monthlyPriceEuros,
  tapWallBaseProductId,
  tapWallExtraProductId,
} from '@/lib/tap-wall';
import { sql } from '@vercel/postgres';

export async function GET(req: NextRequest) {
  try {
    const tenantId = await getTenantId(req);
    if (!tenantId || tenantId === 'default') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const account = await getTapAccountByTenant(tenantId);
    const active = isTapWallActiveStatus(account?.status as string | undefined);
    let spaces: unknown[] = [];
    let emergencies = 0;
    if (account?.id) {
      const s = await sql`
        SELECT id, name, public_code, wifi_ssid, active, updated_at
        FROM tap_wall_spaces
        WHERE account_id = ${String(account.id)}::uuid
        ORDER BY created_at ASC
      `;
      spaces = s.rows;
      const e = await sql`
        SELECT COUNT(*)::int AS n
        FROM tap_wall_emergencies em
        JOIN tap_wall_spaces sp ON sp.id = em.space_id
        WHERE sp.account_id = ${String(account.id)}::uuid
          AND em.seen_at IS NULL
      `;
      emergencies = Number(e.rows[0]?.n || 0);
    }

    const props = Number(account?.properties_count || 1);
    return NextResponse.json({
      success: true,
      products: TAP_WALL_PRODUCTS,
      pricing: {
        baseEuros: 10,
        extraPropertyEuros: 2,
        propertiesCount: props,
        monthlyEuros: monthlyPriceEuros(props),
      },
      polarConfigured: Boolean(tapWallBaseProductId()),
      polarExtraConfigured: Boolean(tapWallExtraProductId()),
      account: account
        ? {
            id: account.id,
            status: account.status,
            active,
            product_sku: account.product_sku,
            properties_count: account.properties_count,
            shipping_name: account.shipping_name,
            shipping_city: account.shipping_city,
            terms_accepted_at: account.terms_accepted_at,
          }
        : null,
      spaces,
      unreadEmergencies: emergencies,
      tapAppUrl: 'https://tap.delfincheckin.com/app',
      guestBaseUrl: 'https://g.delfincheckin.com',
    });
  } catch (e: any) {
    console.error('[tap/status]', e);
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 });
  }
}
