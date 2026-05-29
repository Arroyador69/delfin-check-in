import { buildAntivirusHelpUrl } from '@/lib/onboarding-magic-link';

export function getAppBaseUrl(): string {
  return String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
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
