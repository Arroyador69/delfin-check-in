/**
 * Orígenes CORS permitidos para APIs públicas (formularios, registro).
 * Nunca usar Access-Control-Allow-Origin: * con credenciales.
 */

const DEFAULT_ALLOWED = [
  'https://form.delfincheckin.com',
  'https://www.delfincheckin.com',
  'https://delfincheckin.com',
  'https://admin.delfincheckin.com',
  'https://book.delfincheckin.com',
  'https://clean.delfincheckin.com',
  'https://tap.delfincheckin.com',
  'https://g.delfincheckin.com',
];

function extraFromEnv(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^https?:\/\//i.test(s));
}

export function getCorsAllowedOrigins(): string[] {
  return [...new Set([...DEFAULT_ALLOWED, ...extraFromEnv()])];
}

export function isCorsOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return false;
  const o = origin.trim();
  if (!o) return false;
  if (getCorsAllowedOrigins().includes(o)) return true;
  // Dev local
  if (
    process.env.NODE_ENV !== 'production' &&
    (/^http:\/\/localhost(:\d+)?$/i.test(o) || /^http:\/\/127\.0\.0\.1(:\d+)?$/i.test(o))
  ) {
    return true;
  }
  return false;
}

/** Cabeceras CORS para endpoints públicos sin cookies cross-site. */
export function publicCorsHeaders(reqOrigin: string | null | undefined): Record<string, string> {
  const allowed = isCorsOriginAllowed(reqOrigin);
  const origin = allowed && reqOrigin ? reqOrigin : 'https://form.delfincheckin.com';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Accept, Authorization, X-Tenant-ID, X-Tenant-Name, X-Client-Submission-Id, Idempotency-Key, X-Dry-Run',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
