import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
    url.pathname.startsWith('/api/public/') ||
    url.pathname.startsWith('/api/test-') ||
    url.pathname.startsWith('/api/debug-') ||
    url.pathname.startsWith('/api/check-')
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
  const authToken = req.cookies.get('auth_token')?.value;
  if (!authToken) {
    console.log('🔒 No hay token de autenticación, redirigiendo al login');
    const loginUrl = new URL('/admin-login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  console.log('🔍 Token encontrado, permitiendo acceso...');
  
  // Para evitar problemas con Edge Runtime, solo verificamos que existe el token
  // La verificación real se hará en las rutas de API que sí soportan Node.js crypto
  
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-tenant-id', '870e589f-d313-4a5a-901f-f25fd4e7240a');

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}





