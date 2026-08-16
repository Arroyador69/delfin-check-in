/**
 * Errores de control de Next.js, ruido de red/abort y ruido de extensiones
 * del navegador que no deben ir a Sentry.
 */

function errorName(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (typeof error === 'object' && error !== null && 'name' in error) {
    return String((error as { name?: unknown }).name ?? '');
  }
  return '';
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }
  return String(error ?? '');
}

function errorStack(error: unknown): string {
  if (error instanceof Error) return error.stack || '';
  if (typeof error === 'object' && error !== null && 'stack' in error) {
    return String((error as { stack?: unknown }).stack ?? '');
  }
  return '';
}

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

  const name = errorName(error);
  const message = errorMessage(error);

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

/**
 * Extensiones de wallet/Web3 (MetaMask, etc.) inyectan scripts y fallan
 * en páginas que no son dApps — no es un bug de la app.
 */
export function isBrowserExtensionNoise(error: unknown): boolean {
  if (error == null) return false;

  const blob = `${errorName(error)} ${errorMessage(error)} ${errorStack(error)}`;
  return (
    /metamask/i.test(blob) ||
    /failed to connect to metamask/i.test(blob) ||
    /metamask extension not found/i.test(blob) ||
    /walletconnect/i.test(blob) ||
    /coinbase wallet/i.test(blob) ||
    /\bethereum\b/i.test(blob) ||
    /chrome-extension:\/\//i.test(blob) ||
    /moz-extension:\/\//i.test(blob) ||
    /safari-extension:\/\//i.test(blob) ||
    /scripts\/inpage\.js/i.test(blob)
  );
}

/**
 * Sentry sintetiza "Object captured as promise rejection with keys: [object has no keys]"
 * cuando alguien hace Promise.reject({}). Suele ser ruido de router/extensiones.
 */
export function isEmptyObjectRejection(error: unknown): boolean {
  if (error == null) return false;

  if (
    typeof error === 'object' &&
    !(error instanceof Error) &&
    !Array.isArray(error) &&
    Object.keys(error as object).length === 0
  ) {
    return true;
  }

  const message = errorMessage(error);
  return (
    /Object captured as promise rejection with keys:\s*\[object has no keys\]/i.test(
      message
    ) ||
    (/UnhandledRejection/i.test(errorName(error)) &&
      /\[object has no keys\]/i.test(message))
  );
}

type SentryExceptionFrame = {
  filename?: string | null;
  abs_path?: string | null;
};

type SentryExceptionValue = {
  type?: string | null;
  value?: string | null;
  stacktrace?: { frames?: SentryExceptionFrame[] | null } | null;
};

type SentryEventLike = {
  message?: string | null;
  exception?: { values?: SentryExceptionValue[] | null } | null;
} | null;

function framesLookLikeExtension(frames: SentryExceptionFrame[] | null | undefined): boolean {
  if (!frames?.length) return false;
  return frames.some((f) => {
    const path = `${f.filename || ''} ${f.abs_path || ''}`;
    return (
      /chrome-extension:\/\//i.test(path) ||
      /moz-extension:\/\//i.test(path) ||
      /safari-extension:\/\//i.test(path) ||
      /scripts\/inpage\.js/i.test(path) ||
      /^app:\/\/\/scripts\/inpage\.js$/i.test(path.trim())
    );
  });
}

/** Filtra por el error original y, si hace falta, por el payload del evento Sentry. */
export function shouldDropSentryEvent(
  error: unknown,
  event?: SentryEventLike
): boolean {
  if (
    isNextJsNavigationControlError(error) ||
    isBenignNetworkOrAbortError(error) ||
    isBrowserExtensionNoise(error) ||
    isEmptyObjectRejection(error)
  ) {
    return true;
  }

  if (!event) return false;

  if (
    isEmptyObjectRejection({ message: event.message || '' }) ||
    isBrowserExtensionNoise({ message: event.message || '' })
  ) {
    return true;
  }

  for (const value of event.exception?.values || []) {
    const synthetic = {
      name: value.type || '',
      message: value.value || '',
    };
    if (
      isBrowserExtensionNoise(synthetic) ||
      isEmptyObjectRejection(synthetic) ||
      isBenignNetworkOrAbortError(synthetic)
    ) {
      return true;
    }
    if (framesLookLikeExtension(value.stacktrace?.frames || undefined)) {
      return true;
    }
  }

  return false;
}
