import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken, AUTH_CONFIG } from '@/lib/auth'

/**
 * 🔒 MIDDLEWARE DE AUTENTICACIÓN (restaurado)
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl
  
  // Preflight CORS
  if (req.method === 'OPTIONS') return NextResponse.next();

  // Archivos estáticos
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/static') ||
    url.pathname.startsWith('/images') ||
    url.pathname.startsWith('/fonts') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/robots.txt' ||
    url.pathname.startsWith('/icon') ||
    url.pathname.startsWith('/sw.js')
  ) {
    return NextResponse.next();
  }

  // Rutas públicas
  const isPublicRoute = (
    url.pathname === '/admin-login' ||
    url.pathname === '/forgot-password' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/api/public/')
  );
  if (isPublicRoute) return NextResponse.next();

  // Autenticación requerida
  const authToken = req.cookies.get(AUTH_CONFIG.cookieName)?.value;
  if (!authToken) {
    const loginUrl = new URL('/admin-login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  const payload = verifyToken(authToken);
  if (!payload) {
    const resp = NextResponse.redirect(new URL('/admin-login', req.url));
    resp.cookies.delete(AUTH_CONFIG.cookieName);
    return resp;
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-tenant-id', payload.tenantId);
  requestHeaders.set('x-user-email', payload.email);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/*'
  ],
}





