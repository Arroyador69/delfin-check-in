export function buildAffiliateLink(raw: string | null | undefined, slug?: string) {
  if (!raw) return '#';
  try {
    const url = new URL(raw);
    url.searchParams.set('utm_source', 'site');
    url.searchParams.set('utm_medium', 'aff');
    if (slug) url.searchParams.set('utm_campaign', slug);
    return url.toString();
  } catch (_e) {
    return raw;
  }
}
