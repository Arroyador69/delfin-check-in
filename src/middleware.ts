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

  // Rutas públicas que no necesitan tenant ID
  const isPublicRoute = (
    url.pathname === '/admin-login' ||
    url.pathname === '/forgot-password' ||
    url.pathname.startsWith('/api/public/')
  );
  if (isPublicRoute) return NextResponse.next();

  // Para rutas de API, inyectar tenant ID por defecto si no hay autenticación
  if (url.pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(req.headers);
    
    // Si no hay tenant ID en el header, usar el tenant por defecto
    if (!requestHeaders.get('x-tenant-id')) {
      requestHeaders.set('x-tenant-id', '870e589f-d313-4a5a-901f-f25fd4e7240a');
    }
    
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Autenticación requerida para rutas no-API
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
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}





