import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { logAudit } from '@/lib/audit';
import { getTenantId } from '@/lib/tenant';
import {
  buildAmazonProductAffiliateUrl,
  normalizeAffiliatePlacement,
  resolveAmazonAffiliateConfig,
} from '@/lib/amazon-affiliate';

function clientIp(req: NextRequest): string | null {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) {
    const first = xf.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip');
}

/**
 * Registra AFFILIATE_CLICK en audit_log (superadmin / amazon-affiliate-clicks).
 * tenant_id si hay JWT en cookie o Authorization (app móvil).
 */
export async function recordAffiliateClickFromRequest(
  req: NextRequest,
  placementRaw: string | null
): Promise<void> {
  const placement = normalizeAffiliatePlacement(placementRaw);
  const cfg = resolveAmazonAffiliateConfig();
  let destination: string;
  try {
    destination = buildAmazonProductAffiliateUrl(cfg);
  } catch (e) {
    console.error('[affiliate-click] config/url', e);
    throw e;
  }

  const tenantId = await getTenantId(req);
  const { asin } = cfg;
  const payloadHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ placement, asin, at: Date.now() }))
    .digest('hex');

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
}
