/**
 * Reintentos ante fallos transitorios de Neon/Vercel Postgres
 * (p. ej. "Database request failed", fetch failed, cold start).
 */

const TRANSIENT_PATTERNS = [
  /database request failed/i,
  /fetch failed/i,
  /networkerror/i,
  /econnreset/i,
  /econnrefused/i,
  /etimedout/i,
  /socket hang up/i,
  /connection terminated/i,
  /connection closed/i,
  /too many connections/i,
  /remaining connection slots/i,
  /timeout exceeded when trying to connect/i,
  /aborted/i,
];

export function isTransientNeonError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || '');
  if (TRANSIENT_PATTERNS.some((re) => re.test(msg))) return true;

  const name = error instanceof Error ? error.name : '';
  if (name === 'NeonDbError' && /request failed|fetch failed/i.test(msg)) return true;

  const anyErr = error as { code?: string; sourceError?: unknown; cause?: unknown } | null;
  const code = String(anyErr?.code || '');
  if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED') return true;

  if (anyErr?.sourceError && isTransientNeonError(anyErr.sourceError)) return true;
  if (anyErr?.cause && isTransientNeonError(anyErr.cause)) return true;

  return false;
}

export type NeonRetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  label?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ejecuta `fn` y reintenta solo si el error parece transitorio de red/Neon.
 */
export async function withNeonRetry<T>(
  fn: () => Promise<T>,
  options: NeonRetryOptions = {}
): Promise<T> {
  const retries = Math.max(0, options.retries ?? 3);
  const baseDelayMs = Math.max(50, options.baseDelayMs ?? 200);
  const label = options.label || 'neon';

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= retries || !isTransientNeonError(err)) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.floor(Math.random() * 80);
      console.warn(
        `[${label}] Neon transient error (attempt ${attempt + 1}/${retries + 1}), retry in ${delay}ms:`,
        err instanceof Error ? err.message : String(err)
      );
      await sleep(delay);
    }
  }
  throw lastError;
}
