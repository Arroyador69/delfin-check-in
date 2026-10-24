/**
 * Hosts prohibidos: OTAs, redes sociales, mensajería.
 * El pipeline solo permite webs propias / emails visibles públicamente.
 */

const BLOCKED_HOST_SUFFIXES = [
  'airbnb.com',
  'airbnb.es',
  'booking.com',
  'vrbo.com',
  'expedia.com',
  'tripadvisor.com',
  'tripadvisor.es',
  'linkedin.com',
  'instagram.com',
  'facebook.com',
  'fb.com',
  'whatsapp.com',
  'wa.me',
  'api.whatsapp.com',
  'twitter.com',
  'x.com',
  'tiktok.com',
  'google.com',
  'maps.google.com',
];

export function isBlockedOutreachHost(hostnameOrUrl: string): boolean {
  let host = hostnameOrUrl.trim().toLowerCase();
  try {
    if (host.includes('://') || host.includes('/')) {
      host = new URL(host.includes('://') ? host : `https://${host}`).hostname;
    }
  } catch {
    /* keep raw */
  }
  host = host.replace(/^www\./, '');
  if (!host) return true;
  return BLOCKED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

export function assertAllowedOutreachUrl(url: string): void {
  if (isBlockedOutreachHost(url)) {
    throw new Error(
      `URL bloqueada (OTA/red social/mensajería no permitida): ${url}`
    );
  }
}
