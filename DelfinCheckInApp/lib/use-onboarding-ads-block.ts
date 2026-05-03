/**
 * Antes existía onboarding guiado en móvil; ahora el flujo principal es el panel web.
 * Se mantiene el hook para no tocar todos los consumidores: siempre false.
 */
export function useIsOnboardingRoute(): boolean {
  return false;
}
