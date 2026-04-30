import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logAudit } from '@/lib/audit';
import { getTenantId } from '@/lib/tenant';
import {
  buildAmazonProductAffiliateUrl,
  normalizeAffiliatePlacement,
  resolveAmazonAffiliateConfig,
} from '@/lib/amazon-affiliate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clientIp(req: NextRequest): string | null {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip');
}

export async function GET(req: NextRequest) {
  const placement = normalizeAffiliatePlacement(req.nextUrl.searchParams.get('placement'));

  const cfg = resolveAmazonAffiliateConfig();
  let destination: string;
  try {
    destination = buildAmazonProductAffiliateUrl(cfg);
  } catch (e) {
    console.error('[affiliate/go] config/url', e);
    return NextResponse.json({ error: 'Configuración de afiliado inválida' }, { status: 500 });
  }

  const tenantId = await getTenantId(req);
  const { asin } = cfg;
  const payloadHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ placement, asin, at: Date.now() }))
    .digest('hex');

  try {
    await logAudit({
      action: 'AFFILIATE_CLICK',
      entityType: 'AMAZON_AFFILIATE',
      entityId: `${placement}:${asin}`,
      payloadHash,
      tenantId: tenantId || null,
      actorId: null,
      ip: clientIp(req),
      meta: {
        placement,
        asin,
        destinationHost: new URL(destination).host,
      },
    });
  } catch (err) {
    console.error('[affiliate/go] audit_log', err);
  }

  return NextResponse.redirect(destination, 302);
}
