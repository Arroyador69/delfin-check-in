import {
  buildAmazonProductAffiliateUrl,
  DEFAULT_AMAZON_ASIN,
  DEFAULT_AMAZON_ASSOCIATE_TAG,
  DEFAULT_AMAZON_HOST,
} from '@/lib/amazon-affiliate';

/**
 * URL de ficha Amazon con tag de afiliado, para usar en el cliente (PWA / componentes "use client").
 * Opcional: NEXT_PUBLIC_AMAZON_MARKETPLACE_HOST, NEXT_PUBLIC_AMAZON_DEFAULT_ASIN, NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG
 * (mismos valores que AMAZON_* en servidor si quieres override sin secretos).
 */
export function getAmazonAffiliateProductUrlForClient(): string {
  const host =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AMAZON_MARKETPLACE_HOST?.trim()) ||
    DEFAULT_AMAZON_HOST;
  const asin =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AMAZON_DEFAULT_ASIN?.trim()) ||
    DEFAULT_AMAZON_ASIN;
  const associateTag =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG?.trim()) ||
    DEFAULT_AMAZON_ASSOCIATE_TAG;
  return buildAmazonProductAffiliateUrl({ host, asin, associateTag });
}
