import Constants from 'expo-constants';

const DEFAULT_HOST = 'www.amazon.es';
const DEFAULT_ASIN = 'B0BVVFKXNH';
const DEFAULT_TAG = 'delfincheckin-21';

function trim(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t || undefined;
}

/**
 * URL de ficha Amazon con tag de afiliado (misma lógica que la web).
 * Override: EXPO_PUBLIC_AMAZON_* o `extra` en app.config (AMAZON_MARKETPLACE_HOST, etc.).
 */
export function getAmazonAffiliateProductUrl(): string {
  const extra = Constants.expoConfig?.extra as
    | {
        AMAZON_MARKETPLACE_HOST?: string;
        AMAZON_DEFAULT_ASIN?: string;
        AMAZON_ASSOCIATE_TAG?: string;
      }
    | undefined;

  const host =
    trim(extra?.AMAZON_MARKETPLACE_HOST) ||
    trim(process.env.EXPO_PUBLIC_AMAZON_MARKETPLACE_HOST) ||
    DEFAULT_HOST;
  const asinRaw =
    trim(extra?.AMAZON_DEFAULT_ASIN) ||
    trim(process.env.EXPO_PUBLIC_AMAZON_DEFAULT_ASIN) ||
    DEFAULT_ASIN;
  const asin = asinRaw.toUpperCase();
  const tag =
    trim(extra?.AMAZON_ASSOCIATE_TAG) ||
    trim(process.env.EXPO_PUBLIC_AMAZON_ASSOCIATE_TAG) ||
    DEFAULT_TAG;

  if (!/^([A-Z0-9]{10})$/.test(asin)) {
    const u = new URL(`https://${DEFAULT_HOST}/dp/${DEFAULT_ASIN}`);
    u.searchParams.set('tag', DEFAULT_TAG);
    return u.toString();
  }

  const h = host.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const u = new URL(`https://${h}/dp/${asin}`);
  u.searchParams.set('tag', tag);
  return u.toString();
}
