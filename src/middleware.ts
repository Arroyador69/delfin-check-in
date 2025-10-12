import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken, AUTH_CONFIG } from '@/lib/auth'

/**
 * 🔒 MIDDLEWARE DE AUTENTICACIÓN
 * 
 * Valida tokens JWT en todas las rutas protegidas
 * - Verifica tokens firmados criptográficamente
 * - Redirige a login si no está autenticado
 * - Permite rutas públicas y API endpoints específicos
 */

export function middleware(req: NextRequest) {
  const url = req.nextUrl
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PASO 1: PREFLIGHT CORS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  if (req.method === 'OPTIONS') {
    return NextResponse.next();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PASO 2: ALLOWLIST DE ARCHIVOS ESTÁTICOS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
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
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PASO 3: RUTAS PÚBLICAS Y API ENDPOINTS PERMITIDOS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
      const publicRoutes = [
        '/api/registro-flex',
        '/api/partes',
        '/api/setup-db',
        '/api/setup-whatsapp-db',
        '/api/init-whatsapp-db',
        '/api/check-db',
        '/api/test-registro',
        '/api/test-whatsapp',
        '/api/upgrade-db-public',
        '/api/database',
        '/api/public',
        '/api/ical',
        '/api/admin/login', // Endpoint de login debe ser público
        '/api/onboarding', // Endpoints de onboarding deben ser públicos
        '/api/public/form', // Endpoints de formularios públicos
        '/api/public/form-redirect', // Redirección a formularios públicos
        '/api/ministerio/test-conexion', // Test de conexión MIR (debe ser público)
        '/api/ministerio/procesar-pendientes', // Procesar pendientes MIR (debe ser público)
        '/api/ministerio/debug-env', // Debug variables de entorno (temporal)
        '/public',
        '/admin-login',
        '/onboarding',
        '/form' // Páginas de formularios públicos
      ];

  // Verificar si la ruta actual está en las rutas públicas
  const isPublicRoute = publicRoutes.some(route => url.pathname.startsWith(route));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PASO 4: PÁGINAS PROTEGIDAS (requieren autenticación)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
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
    '/estado-envios-mir',
    '/database-manager'
  ];

  const isProtectedPage = protectedPages.some(page => url.pathname === page);
  
  // Proteger todas las rutas API de admin excepto login
  const isProtectedAPI = url.pathname.startsWith('/api/') && 
                         !publicRoutes.some(route => url.pathname.startsWith(route));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PASO 5: VERIFICAR JWT TOKEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  if (isProtectedPage || isProtectedAPI) {
    // Obtener token de la cookie
    const authToken = req.cookies.get(AUTH_CONFIG.cookieName)?.value;
    
    if (!authToken) {
      console.warn(`🔒 Acceso denegado a ${url.pathname} - No hay token`);
      
      // Si es API, retornar 401
      if (isProtectedAPI) {
        return NextResponse.json(
          { 
            error: 'No autenticado',
            message: 'Debes iniciar sesión para acceder a este recurso'
          },
          { status: 401 }
        );
      }
      
      // Si es página, redirigir al login
      const loginUrl = new URL('/admin-login', req.url);
      return NextResponse.redirect(loginUrl);
    }

    // Verificar que el token sea válido
    const payload = verifyToken(authToken);
    
    if (!payload) {
      console.warn(`🔒 Acceso denegado a ${url.pathname} - Token inválido o expirado`);
      
      // Token inválido o expirado - eliminar cookie y redirigir
      const response = isProtectedAPI 
        ? NextResponse.json(
            { 
              error: 'Token inválido',
              message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
              expired: true
            },
            { status: 401 }
          )
        : NextResponse.redirect(new URL('/admin-login', req.url));
      
      // Eliminar cookie inválida
      response.cookies.delete(AUTH_CONFIG.cookieName);
      
      return response;
    }

    // Token válido - agregar información del usuario y tenant al request
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-role', payload.role);
    
    // TODO: Extraer tenant_id del JWT cuando se implemente la autenticación multi-tenant
    // Por ahora usamos el tenant por defecto
    const defaultTenantId = '870e589f-d313-4a5a-901f-f25fd4e7240a';
    requestHeaders.set('x-tenant-id', defaultTenantId);

    // Continuar con el request pero con headers actualizados
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    return response;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PASO 6: PERMITIR OTRAS RUTAS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
