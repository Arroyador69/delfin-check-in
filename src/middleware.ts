import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTokenEdge } from '@/lib/auth-edge'
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, getLocaleFromRequest, isValidLocale } from './i18n/config';

/**
 * 🔒 MIDDLEWARE DE AUTENTICACIÓN + 🌍 I18N
 * 
 * Orden de ejecución:
 * 1. Archivos estáticos → permitir siempre
 * 2. Protección HTTP Basic Auth para staging
 * 3. Detección y redirect de idioma (i18n)
 * 4. Autenticación JWT para rutas protegidas
 */

// Crear middleware de next-intl
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always', // Siempre usar prefijo (/es/, /en/, etc.)
  localeDetection: true, // Detectar idioma del navegador
});

export async function middleware(req: NextRequest) {
  const url = req.nextUrl
  const pathname = url.pathname
  
  // ==============================================
  // 1. ARCHIVOS ESTÁTICOS - SIEMPRE PERMITIR
  // ==============================================
  
  // Preflight CORS
  if (req.method === 'OPTIONS') return NextResponse.next();

  // Archivos estáticos y rutas especiales de Next.js - siempre permitir
  if (
    pathname.startsWith('/_next') ||
    pathname === '/_not-found' || // Ruta especial de Next.js 404
    pathname.startsWith('/static') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/sw.js') ||
    pathname === '/vercel.svg' ||
    pathname === '/next.svg' ||
    pathname === '/landing-tracking.js' ||
    pathname.endsWith('.js') && pathname.startsWith('/landing-')
  ) {
    return NextResponse.next();
  }

  // ==============================================
  // 2. PROTECCIÓN HTTP BASIC AUTH PARA STAGING
  // ==============================================
  
  const hostname = req.headers.get('host') || '';
  const isStaging = hostname.includes('staging.delfincheckin.com') || 
                    hostname.includes('staging-delfincheckin.vercel.app');
  
  if (isStaging) {
    const stagingUser = process.env.STAGING_USER;
    const stagingPassword = process.env.STAGING_PASSWORD;
    
    if (stagingUser && stagingPassword) {
      const authHeader = req.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return new NextResponse('Authentication required', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="Staging Access - Ingresa tus credenciales"',
            'Content-Type': 'text/plain',
          },
        });
      }
      
      try {
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');
        
        if (username !== stagingUser || password !== stagingPassword) {
          return new NextResponse('Invalid credentials', {
            status: 401,
            headers: {
              'WWW-Authenticate': 'Basic realm="Staging Access - Credenciales incorrectas"',
              'Content-Type': 'text/plain',
            },
          });
        }
        
        console.log('✅ Staging auth: Credenciales correctas');
      } catch (error) {
        return new NextResponse('Invalid authentication format', {
          status: 401,
          headers: {
            'WWW-Authenticate': 'Basic realm="Staging Access"',
            'Content-Type': 'text/plain',
          },
        });
      }
    }
  }

  // ==============================================
  // 3. DETECCIÓN DE IDIOMA (I18N)
  // ==============================================
  
  // Excluir rutas API, superadmin, y TODAS las rutas del tenant de la detección i18n
  // Esto permite que se sirvan desde src/app/ sin redirect a /es/, /en/, etc.
  const shouldSkipI18n = (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/superadmin') || // SuperAdmin NO traduce
    pathname.startsWith('/book/') || // Booking engine externo
    pathname === '/admin-login' ||
    pathname === '/forgot-password' ||
    pathname === '/' || // Ruta raíz
    pathname.startsWith('/reservations') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/guest-registrations-dashboard') ||
    pathname.startsWith('/aeat') ||
    pathname.startsWith('/audit') ||
    pathname.startsWith('/calendar-sync') ||
    pathname.startsWith('/cost-calculator') ||
    pathname.startsWith('/facturas') ||
    pathname.startsWith('/messages') ||
    pathname.startsWith('/offline-queue') ||
    pathname.startsWith('/referrals') ||
    pathname.startsWith('/rooms') ||
    pathname.startsWith('/upgrade-plan') ||
    pathname.startsWith('/admin/') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/partes') ||
    pathname.startsWith('/plans') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/checkout-rooms') ||
    pathname.startsWith('/estado-envios-mir')
  );
  
  // Si la ruta no debe tener i18n, continuar sin aplicar intlMiddleware
  if (shouldSkipI18n) {
    // Continuar con lógica de autenticación (abajo)
  } else {
    // Verificar si la ruta ya tiene un locale válido
    const pathnameHasLocale = locales.some(
      (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );
    
    // Si NO tiene locale, aplicar intlMiddleware para detectar y redirect
    // NOTA: La ruta raíz "/" ya está excluida arriba, así que esto solo aplica a otras rutas
    if (!pathnameHasLocale) {
      // Detectar idioma preferido del navegador
      const acceptLanguage = req.headers.get('accept-language') || '';
      const detectedLocale = getLocaleFromRequest(acceptLanguage);
      
      // Redirigir a la URL con prefijo de locale
      const newUrl = new URL(`/${detectedLocale}${pathname}${url.search}`, req.url);
      console.log(`🌍 Redirigiendo a: ${newUrl.pathname}`);
      return NextResponse.redirect(newUrl);
    }
    
    // Si ya tiene locale, extraerlo para usarlo en las páginas
    const localeFromPath = pathname.split('/')[1];
    if (isValidLocale(localeFromPath)) {
      // Añadir locale a headers para que las páginas lo usen
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-locale', localeFromPath);
      
      // IMPORTANTE: Continuar con autenticación, pasando headers
      // (no hacer return aquí, continuar abajo)
    }
  }

  // ==============================================
  // 4. AUTENTICACIÓN JWT PARA RUTAS PROTEGIDAS
  // ==============================================
  
  // Rutas completamente públicas - no requieren autenticación
  const isPublicRoute = (
    pathname === '/api/manifest' ||
    pathname === '/admin-login' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/book/') ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/api/direct-reservations/') ||
    pathname.startsWith('/api/test-') ||
    pathname.startsWith('/api/debug-') ||
    pathname.startsWith('/api/check-') ||
    pathname.startsWith('/api/onboarding/') ||
    pathname.startsWith('/api/admin/login') ||
    pathname.startsWith('/api/auth/mobile-login') ||
    pathname.startsWith('/api/auth/refresh') ||
    pathname.startsWith('/api/create-payment-intent') ||
    pathname.startsWith('/api/landing/') ||
    pathname.startsWith('/api/waitlist') ||
    pathname.startsWith('/api/blog/analytics/') ||
    pathname.startsWith('/api/blog/waitlist') ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/api/superadmin/programmatic/cron-articles') ||
    pathname.startsWith('/api/stripe/webhook') ||
    pathname.startsWith('/api/telegram/webhook')
  );
  
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Para rutas de API, inyectar tenant ID desde JWT o header
  if (pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(req.headers);
    let tenantId: string | null = null;
    
    // PRIMERO: Verificar si hay tenant_id en el header
    const headerTenantId = req.headers.get('x-tenant-id') || req.headers.get('X-Tenant-ID');
    if (headerTenantId) {
      tenantId = headerTenantId;
      requestHeaders.set('x-tenant-id', tenantId);
      console.log(`🔗 Tenant_id desde header (llamada interna): ${tenantId}`);
    }
    
    // SEGUNDO: Si no hay tenant_id en header, intentar desde Authorization Bearer token
    if (!tenantId) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const payload = verifyTokenEdge(token);
          if (payload?.tenantId) {
            tenantId = payload.tenantId;
            requestHeaders.set('x-tenant-id', tenantId);
            console.log(`📱 Token móvil detectado, tenant_id: ${tenantId}`);
          }
        } catch (error: any) {
          if (error.name !== 'TokenExpiredError' && !error.message?.includes('expired')) {
            console.error('Error verificando token Bearer:', error);
          }
        }
      }
    }
    
    // TERCERO: Si no hay tenant_id en Bearer token, intentar desde cookie (web)
    if (!tenantId) {
      const authToken = req.cookies.get('auth_token')?.value;
      if (authToken) {
        try {
          const payload = verifyTokenEdge(authToken);
          if (payload?.tenantId) {
            tenantId = payload.tenantId;
            requestHeaders.set('x-tenant-id', tenantId);
            console.log(`🌐 Token web detectado, tenant_id: ${tenantId}`);
          }
        } catch (error) {
          console.error('Error verificando token cookie:', error);
        }
      }
    }
    
    // Si no hay tenant_id válido, las rutas protegidas deben fallar con 401
    if (!tenantId) {
      const isPublicApiRoute = (
        pathname.startsWith('/api/public/') ||
        pathname.startsWith('/api/direct-reservations/') ||
        pathname.startsWith('/api/test-') ||
        pathname.startsWith('/api/debug-') ||
        pathname.startsWith('/api/check-') ||
        pathname.startsWith('/api/onboarding/') ||
        pathname.startsWith('/api/admin/login') ||
        pathname.startsWith('/api/auth/mobile-login') ||
        pathname.startsWith('/api/auth/refresh') ||
        pathname.startsWith('/api/stripe/webhook') ||
        pathname.startsWith('/api/create-payment-intent') ||
        pathname.startsWith('/api/blog/analytics/') ||
        pathname.startsWith('/api/blog/waitlist') ||
        pathname.startsWith('/api/cron/') ||
        pathname.startsWith('/api/superadmin/programmatic/cron-articles') ||
        pathname.startsWith('/api/telegram/webhook')
      );
      
      if (!isPublicApiRoute) {
        console.warn(`⚠️ [SECURITY] Intento de acceso sin tenant_id a: ${pathname}`);
        return NextResponse.json(
          { error: 'No autorizado - tenant_id requerido' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Para rutas de páginas, verificar autenticación
  const authTokenCookie = req.cookies.get('auth_token');
  const authToken = authTokenCookie?.value;
  
  // Si no hay token o está vacío, redirigir al login
  if (!authToken || authToken.trim() === '') {
    console.log('🔒 No hay token de autenticación válido, redirigiendo al login');
    const loginUrl = new URL('/admin-login', req.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // Si hay token, verificar que sea válido y extraer tenant_id
  try {
    const payload = verifyTokenEdge(authToken);
    if (payload?.tenantId) {
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-tenant-id', payload.tenantId);
      console.log(`🔐 Tenant_id extraído del JWT para página: ${payload.tenantId}`);
      return NextResponse.next({ request: { headers: requestHeaders } });
    } else {
      console.log('🔒 Token sin tenantId, redirigiendo al login');
      const loginUrl = new URL('/admin-login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  } catch (error: any) {
    console.log(`🔒 Token inválido o expirado (${error.message}), redirigiendo al login`);
    const loginUrl = new URL('/admin-login', req.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
