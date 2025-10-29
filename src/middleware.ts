import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 🔒 MIDDLEWARE DE AUTENTICACIÓN SIMPLIFICADO Y ROBUSTO
 */
export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  
  // Preflight CORS
  if (req.method === 'OPTIONS') return NextResponse.next();

  // Archivos estáticos - siempre permitir
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

  // Rutas completamente públicas - no requieren autenticación
  const isPublicRoute = (
    url.pathname === '/admin-login' ||
    url.pathname === '/forgot-password' ||
    url.pathname.startsWith('/book/') ||
    url.pathname.startsWith('/api/public/') ||
    url.pathname.startsWith('/api/direct-reservations/') ||
    url.pathname.startsWith('/api/test-') ||
    url.pathname.startsWith('/api/debug-') ||
    url.pathname.startsWith('/api/check-') ||
    url.pathname.startsWith('/api/onboarding/') ||
    url.pathname.startsWith('/api/admin/login')
  );
  
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Para rutas de API, inyectar tenant ID por defecto
  if (url.pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(req.headers);
    
    // Si no hay tenant ID en el header, usar el tenant por defecto
    if (!requestHeaders.get('x-tenant-id')) {
      requestHeaders.set('x-tenant-id', '870e589f-d313-4a5a-901f-f25fd4e7240a');
    }
    
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Para rutas de páginas, verificar autenticación de manera más inteligente
  const authToken = req.cookies.get('auth_token')?.value;
  
  // Si no hay token, redirigir al login SOLO si no está ya en una ruta pública
  if (!authToken) {
    // Solo redirigir si no está en una ruta pública
    if (!url.pathname.startsWith('/admin-login') && 
        !url.pathname.startsWith('/forgot-password')) {
      console.log('🔒 No hay token de autenticación, redirigiendo al login');
      const loginUrl = new URL('/admin-login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Si hay token, permitir acceso a todas las páginas
  console.log('🔍 Token encontrado, permitiendo acceso...');
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}