import { NextResponse } from 'next/server';

/**
 * Defensa en ruta: en producción no se sirven APIs de diagnóstico salvo flag explícita.
 * El middleware ya bloquea muchas rutas; esto evita filtraciones si el orden cambia.
 */
export function denyDebugApiInProduction(): NextResponse | null {
  if (isProductionNodeEnv() && !shouldExposeDiagnosticApis()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return null;
}

/**
 * Rutas de API pensadas solo para desarrollo/diagnóstico.
 * En producción devuelven 404 salvo DELFIN_ALLOW_DEBUG_ROUTES=true (emergencias).
 */
export function isDangerousDiagnosticApiPath(pathname: string): boolean {
  if (pathname.startsWith('/api/debug/')) return true;
  if (pathname.startsWith('/api/test-')) return true;
  if (pathname.startsWith('/api/check-db')) return true;
  // Permitir test de conexión MIR en producción (ruta usada por la UI; requiere sesión).
  // Bloqueamos el resto de endpoints "test-*" bajo /api/ministerio/.
  if (pathname === '/api/ministerio/test-produccion') return false;
  if (pathname.startsWith('/api/ministerio/test-')) return true;
  if (pathname.startsWith('/api/admin/test-')) return true;
  if (pathname.startsWith('/api/email/test')) return true;
  if (pathname.startsWith('/api/public/test-')) return true;
  if (pathname.includes('/reputation-google/test-email')) return true;
  return false;
}

export function shouldExposeDiagnosticApis(): boolean {
  return process.env.DELFIN_ALLOW_DEBUG_ROUTES === 'true';
}

export function isProductionNodeEnv(): boolean {
  return process.env.NODE_ENV === 'production';
}
