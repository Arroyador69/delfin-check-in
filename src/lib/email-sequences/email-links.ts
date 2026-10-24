import { buildAntivirusHelpUrl } from '@/lib/onboarding-magic-link';
import { OWNER_ONBOARDING_UTM } from '@/lib/email-sequences/constants';

export function getAppBaseUrl(): string {
  return String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
}

/**
 * Añade UTM de onboarding trial MIR a cualquier CTA.
 * `utm_content` opcional para distinguir botones (welcome, checklist, tap_wall…).
 */
export function withOwnerOnboardingUtm(url: string, utmContent?: string): string {
  const { utm_source, utm_medium, utm_campaign } = OWNER_ONBOARDING_UTM;
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', utm_source);
    u.searchParams.set('utm_medium', utm_medium);
    u.searchParams.set('utm_campaign', utm_campaign);
    if (utmContent) u.searchParams.set('utm_content', utmContent);
    return u.toString();
  } catch {
    const sep = url.includes('?') ? '&' : '?';
    const content = utmContent
      ? `&utm_content=${encodeURIComponent(utmContent)}`
      : '';
    return `${url}${sep}utm_source=${utm_source}&utm_medium=${utm_medium}&utm_campaign=${utm_campaign}${content}`;
  }
}

/**
 * Pixel de apertura con ruta corta (/m/o/UUID) en lugar de /api/track/...
 * Reduce falsos positivos de antivirus en enlaces de tracking.
 */
export function buildLifecycleOpenPixelUrl(trackingId: string): string {
  return `${getAppBaseUrl()}/m/o/${encodeURIComponent(trackingId)}`;
}

/** CTA y enlaces de acción: siempre URL directa (sin redirect de clic). */
export function lifecycleCtaDirectUrl(url: string): string {
  return url;
}

export function buildLifecycleAntivirusHelpUrl(locale = 'es'): string {
  return buildAntivirusHelpUrl(locale);
}
