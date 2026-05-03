import { getPublicApiOrigin } from '@/lib/api';

const WEB_LOCALES = new Set(['es', 'en', 'fr', 'it', 'pt', 'fi']);

/** URL del onboarding guiado del panel web (misma base que la API). */
export function getWebOnboardingUrl(appLocale: string): string {
  const base = getPublicApiOrigin();
  const loc = WEB_LOCALES.has(appLocale) ? appLocale : 'es';
  return `${base}/${loc}/onboarding`;
}

/** Alineado con `tenants.onboarding_status` y gating del middleware web. */
export function isWebOnboardingIncomplete(status: string | null | undefined): boolean {
  return status === 'pending' || status === 'in_progress';
}
