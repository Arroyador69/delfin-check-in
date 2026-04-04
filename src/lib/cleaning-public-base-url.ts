import type { NextRequest } from 'next/server';

/**
 * URL base para enlaces /limpieza/[token] y notas públicas.
 *
 * En Vercel usa la variable **CLEANING_PUBLIC_BASE_URL** (sin prefijo NEXT_PUBLIC),
 * p. ej. https://clean.delfincheckin.com — next.config la proyecta al cliente.
 * Opcional: NEXT_PUBLIC_CLEANING_PUBLIC_BASE_URL si ya la tenías definida.
 */
function configuredCleaningBase(): string {
  return (
    process.env.CLEANING_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_CLEANING_PUBLIC_BASE_URL?.trim() ||
    ''
  ).replace(/\/$/, '');
}

export function getCleaningPublicBaseUrlFromRequest(req: NextRequest): string {
  const configured = configuredCleaningBase();
  if (configured) return configured;
  const app = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (app) return app.replace(/\/$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

/** Para componentes cliente: valor inyectado en build desde CLEANING_PUBLIC_BASE_URL. */
export function getCleaningPublicBaseUrlClient(): string {
  const configured =
    process.env.NEXT_PUBLIC_CLEANING_PUBLIC_BASE_URL?.trim().replace(/\/$/, '') || '';
  if (configured) return configured;
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') || 'https://admin.delfincheckin.com';
}
