/** ASIN del producto destacado (amenities huéspedes, Amazon.es). */
export const DEFAULT_AMAZON_ASIN = 'B0BVVFKXNH';

/** Store / Associate tag (Partner Amazon). */
export const DEFAULT_AMAZON_ASSOCIATE_TAG = 'delfincheckin-21';

export const DEFAULT_AMAZON_HOST = 'www.amazon.es';

export const AFFILIATE_PLACEMENTS = ['banner', 'menu', 'sidebar', 'footer'] as const;
export type AffiliatePlacement = (typeof AFFILIATE_PLACEMENTS)[number];

export function normalizeAffiliatePlacement(raw: string | null): AffiliatePlacement | 'other' {
  if (!raw) return 'other';
  const v = raw.toLowerCase().trim();
  return (AFFILIATE_PLACEMENTS as readonly string[]).includes(v) ? (v as AffiliatePlacement) : 'other';
}

/**
 * URL de producto con tag de afiliado (sin query arbitraria del enlace original).
 */
export function buildAmazonProductAffiliateUrl(params: {
  host?: string;
  asin: string;
  associateTag: string;
}): string {
  const host = (params.host || DEFAULT_AMAZON_HOST).replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const asin = params.asin.trim().toUpperCase();
  if (!/^([A-Z0-9]{10})$/.test(asin)) {
    throw new Error('ASIN inválido');
  }
  const tag = params.associateTag.trim();
  if (!tag) {
    throw new Error('Associate tag vacío');
  }
  const u = new URL(`https://${host}/dp/${asin}`);
  u.searchParams.set('tag', tag);
  return u.toString();
}

export function resolveAmazonAffiliateConfig(): { host: string; asin: string; associateTag: string } {
  return {
    host: process.env.AMAZON_MARKETPLACE_HOST?.trim() || DEFAULT_AMAZON_HOST,
    asin: process.env.AMAZON_DEFAULT_ASIN?.trim() || DEFAULT_AMAZON_ASIN,
    associateTag: process.env.AMAZON_ASSOCIATE_TAG?.trim() || DEFAULT_AMAZON_ASSOCIATE_TAG,
  };
}
