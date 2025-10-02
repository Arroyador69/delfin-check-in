import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // Preflight CORS: dejar pasar siempre OPTIONS
  if (req.method === 'OPTIONS') return NextResponse.next();

  // Rutas que quieres dejar públicas (si alguna)
  const url = req.nextUrl
  
  // ✅ Allowlist de archivos estáticos y manifest
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
  
  // Permitir endpoints de API públicos y páginas específicas
  if (url.pathname.startsWith('/api/registro-flex') || 
      url.pathname.startsWith('/api/partes') ||
      url.pathname.startsWith('/api/setup-db') || 
      url.pathname.startsWith('/api/setup-whatsapp-db') || 
      url.pathname.startsWith('/api/init-whatsapp-db') || 
      url.pathname.startsWith('/api/check-db') || 
      url.pathname.startsWith('/api/test-registro') ||
      url.pathname.startsWith('/api/test-whatsapp') ||
      url.pathname.startsWith('/api/upgrade-db-public') ||
      url.pathname.startsWith('/api/database') ||
      url.pathname.startsWith('/api/public') ||
      url.pathname.startsWith('/api/ical') ||
      url.pathname.startsWith('/public') ||
      url.pathname === '/admin-login') {
    return NextResponse.next()
  }

  // Páginas que requieren autenticación (todas las páginas admin)
  const protectedPages = [
    '/', // Dashboard principal
    '/reservations',
    '/rooms', 
    '/guest-registrations-dashboard',
    '/cost-calculator',
    '/aeat',
    '/calendar-sync',
    '/offline-queue',
    '/audit',
    '/settings',
    '/pricing',
    '/messages',
    '/partes',
    '/checkin',
    '/estado-envios-mir'
  ];

  // Si es una página protegida, verificar autenticación
  const isProtectedPage = protectedPages.some(page => url.pathname === page);
  
  if (isProtectedPage) {
    // Verificar autenticación por cookie
    const authToken = req.cookies.get('auth_token')?.value
    
    // Obtener credenciales personalizadas (en producción esto vendría de una base de datos)
    const storedPassword = process.env.ADMIN_PASSWORD || 'Cuaderno2314'
    
    if (!authToken || authToken !== storedPassword) {
      // Redirigir al login en lugar de mostrar error 401
      const loginUrl = new URL('/admin-login', req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|static|images|fonts|favicon.ico|manifest.json|robots.txt|icon|sw.js).*)']
}
