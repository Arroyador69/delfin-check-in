import { getPublicApiOrigin } from '@/lib/api';

const WEB_LOCALES = new Set(['es', 'en', 'fr', 'it', 'pt', 'fi']);

/** URL del onboarding guiado del panel web (misma base que la API). */
export function getWebOnboardingUrl(appLocale: string): string {
  const base = getPublicApiOrigin();
  const loc = WEB_LOCALES.has(appLocale) ? appLocale : 'es';
  return `${base}/${loc}/onboarding`;
}

/**
 * Página pública de planes (para usuarios que aún no tienen cuenta).
 *
 * - Preferimos un origen público/estático (repo landing) para no acoplarlo al admin.
 * - Fallback: ruta legacy en el admin si no está configurada.
 */
export function getWebSubscribePlansUrl(appLocale: string): string {
  const configured = process.env.EXPO_PUBLIC_PUBLIC_PLANS_URL;
  const base = configured ? String(configured).replace(/\/$/, '') : getPublicApiOrigin();
  const loc = WEB_LOCALES.has(appLocale) ? appLocale : 'es';
  // Si estamos en el fallback del admin, mantenemos el path legacy.
  if (!configured) {
    return `${base}/${loc}/subscribe?source=mobile_app`;
  }
  return `${base}/${loc}/planes?source=mobile_app`;
}

/** Alineado con `tenants.onboarding_status` y gating del middleware web. */
export function isWebOnboardingIncomplete(status: string | null | undefined): boolean {
  return status === 'pending' || status === 'in_progress';
}
