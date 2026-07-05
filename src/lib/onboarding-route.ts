/** Rutas del onboarding guiado (`/[locale]/onboarding` o legacy `/onboarding`). */
export function isOnboardingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === '/onboarding' || pathname.startsWith('/onboarding/')) return true;
  return /\/[a-z]{2}\/onboarding(\/|$)/.test(pathname);
}
