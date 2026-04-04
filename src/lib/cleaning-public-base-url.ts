import type { NextRequest } from 'next/server';

/**
 * URL base para enlaces /limpieza/[token] y notas públicas.
 * En Vercel: NEXT_PUBLIC_CLEANING_PUBLIC_BASE_URL=https://clean.delfincheckin.com
 * Si no se define, se usa el host de la petición (API) o el origen actual (admin).
 */
export function getCleaningPublicBaseUrlFromRequest(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_CLEANING_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  const app = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (app) return app.replace(/\/$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  return `${proto}://${host}`;
}

/** Para componentes cliente: mismo criterio que la API cuando existe variable de entorno. */
export function getCleaningPublicBaseUrlClient(): string {
  const configured = process.env.NEXT_PUBLIC_CLEANING_PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') || 'https://admin.delfincheckin.com';
}
