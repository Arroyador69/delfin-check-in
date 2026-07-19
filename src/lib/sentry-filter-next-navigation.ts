/**
 * Errores de control de Next.js y ruido de red/abort que no deben ir a Sentry.
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

/** Conexión cerrada por el cliente, abort, o corte de red transitorio. */
export function isBenignNetworkOrAbortError(error: unknown): boolean {
  if (error == null) return false;

  const name =
    error instanceof Error
      ? error.name
      : typeof error === 'object' && error !== null && 'name' in error
        ? String((error as { name?: unknown }).name ?? '')
        : '';
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : String(error);

  if (name === 'AbortError' || name === 'TimeoutError') return true;

  return (
    /Connection closed\.?/i.test(message) ||
    /Failed to fetch/i.test(message) ||
    /NetworkError/i.test(message) ||
    /Load failed/i.test(message) ||
    /ECONNRESET|ECONNREFUSED|ETIMEDOUT|UND_ERR_CLOSED|other side closed/i.test(
      message
    ) ||
    /fetch failed/i.test(message)
  );
}

export function shouldDropSentryEvent(error: unknown): boolean {
  return isNextJsNavigationControlError(error) || isBenignNetworkOrAbortError(error);
}
