import { Polar } from '@polar-sh/sdk';

/** Quita espacios/comillas si el token se pegó mal en Vercel. */
export function normalizePolarAccessToken(raw: string): string {
  let t = String(raw || '').trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

/** Entorno Polar: en producción (Vercel) por defecto `production` si no hay POLAR_SERVER. */
export function polarServer(): 'sandbox' | 'production' {
  const explicit = String(process.env.POLAR_SERVER || '').trim().toLowerCase();
  if (explicit === 'production' || explicit === 'sandbox') {
    return explicit;
  }
  return process.env.NODE_ENV === 'production' ? 'production' : 'sandbox';
}

export function getPolarClient(): Polar {
  const token = normalizePolarAccessToken(process.env.POLAR_ACCESS_TOKEN || '');
  if (!token) {
    throw new Error('POLAR_ACCESS_TOKEN no configurado');
  }
  return new Polar({ accessToken: token, server: polarServer() });
}

export function isPolarInvalidTokenError(e: unknown): boolean {
  const meta = polarErrorMeta(e);
  if (meta.polar_status === 401) return true;
  const body = String(meta.polar_body || '');
  return body.includes('invalid_token');
}

/** Mensaje operativo cuando Polar rechaza el PAT (caducado/revocado). */
export function polarInvalidTokenUserMessage(): string {
  return (
    'El pago no está disponible temporalmente: el token de Polar en el servidor no es válido. ' +
    'El equipo debe renovar POLAR_ACCESS_TOKEN en Vercel (producción) y redeploy.'
  );
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
