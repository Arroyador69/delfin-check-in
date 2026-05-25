import { Polar } from '@polar-sh/sdk';

/** Entorno Polar: en producción (Vercel) por defecto `production` si no hay POLAR_SERVER. */
export function polarServer(): 'sandbox' | 'production' {
  const explicit = String(process.env.POLAR_SERVER || '').trim().toLowerCase();
  if (explicit === 'production' || explicit === 'sandbox') {
    return explicit;
  }
  return process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
}

export function getPolarClient(): Polar {
  const token = String(process.env.POLAR_ACCESS_TOKEN || '').trim();
  if (!token) {
    throw new Error('POLAR_ACCESS_TOKEN no configurado');
  }
  return new Polar({ accessToken: token, server: polarServer() });
}

export function polarErrorMeta(e: unknown): Record<string, unknown> {
  if (!e || typeof e !== 'object') return {};
  const err = e as { statusCode?: number; body?: string };
  return {
    polar_status: err.statusCode,
    polar_body: typeof err.body === 'string' ? err.body.slice(0, 2000) : undefined,
    polar_server: polarServer(),
  };
}
