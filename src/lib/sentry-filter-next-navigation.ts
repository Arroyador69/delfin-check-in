/**
 * Next.js App Router usa redirect() y notFound() lanzando errores con `digest`
 * (NEXT_REDIRECT / NEXT_NOT_FOUND). No son fallos reales; Sentry no debe enviarlos.
 * @see https://github.com/getsentry/sentry-javascript/issues/7641
 */
export function isNextJsNavigationControlError(error: unknown): boolean {
  if (error == null) return false;

  if (typeof error === 'object' && error !== null && 'digest' in error) {
    const digest = String((error as { digest?: unknown }).digest ?? '');
    if (digest.startsWith('NEXT_REDIRECT')) return true;
    if (digest.startsWith('NEXT_NOT_FOUND')) return true;
  }

  if (error instanceof Error) {
    const msg = error.message;
    if (msg === 'NEXT_REDIRECT' || msg === 'NEXT_NOT_FOUND') return true;
  }

  return false;
}
