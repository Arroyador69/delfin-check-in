import { getPublicApiOrigin, getPublicWebsiteOrigin } from '@/lib/api';

const WEB_LOCALES = new Set(['es', 'en', 'fr', 'it', 'pt', 'fi']);

/** URL del onboarding guiado del panel web (misma base que la API). */
export function getWebOnboardingUrl(appLocale: string): string {
  const base = getPublicApiOrigin();
  const loc = WEB_LOCALES.has(appLocale) ? appLocale : 'es';
  return `${base}/${loc}/onboarding`;
}

/**
 * Página pública de planes (para usuarios que aún no tienen cuenta).
 * Preferimos la landing estática (GitHub Pages) y preservamos `?lang=…`.
 *
 * - Si `EXPO_PUBLIC_PUBLIC_PLANS_URL` está configurada: usamos ese origen público.
 * - Si no: fallback a la ruta del admin `/[locale]/subscribe`.
 */
export function getWebSubscribePlansUrl(appLocale: string): string {
  const loc = WEB_LOCALES.has(appLocale) ? appLocale : 'es';
  const configured = process.env.EXPO_PUBLIC_PUBLIC_PLANS_URL;
  const basePublic = configured
    ? String(configured).replace(/\/$/, '')
    : getPublicWebsiteOrigin();

  // Si no hay origen público, mantenemos el fallback del admin.
  if (!basePublic) {
    const adminBase = getPublicApiOrigin();
    return `${adminBase}/${loc}/subscribe?source=mobile_app`;
  }

  const q = new URLSearchParams({ lang: loc, source: 'mobile_app' });
  // `plans.html` existe en la raíz (y puede redirigir a /planes/).
  return `${basePublic}/plans.html?${q.toString()}`;
}

/** Alineado con `tenants.onboarding_status` y gating del middleware web. */
export function isWebOnboardingIncomplete(status: string | null | undefined): boolean {
  return status === 'pending' || status === 'in_progress';
}
