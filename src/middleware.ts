import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTokenEdge } from '@/lib/auth-edge'
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale, getLocaleFromRequest, isValidLocale } from './i18n/config';

/**
 * book.delfincheckin.com sirve URLs cortas (/tenantId/123, /pay/CODE) que en la app viven bajo /book/…
 */
function rewriteBookMicrositePath(req: NextRequest): NextResponse | null {
  const host = (req.headers.get('host') || '').split(':')[0].toLowerCase()
  const isBookHost =
    host === 'book.delfincheckin.com' ||
    (host.startsWith('book.') && host.includes('delfincheckin.com'))
  if (!isBookHost) return null

  const url = req.nextUrl.clone()
  const pathname = url.pathname

  if (
    pathname.startsWith('/book/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/images') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt'
  ) {
    return null
  }

  const payMatch = pathname.match(/^\/pay\/([^/]+)\/?$/)
  if (payMatch) {
    url.pathname = `/book/pay/${payMatch[1]}`
    return NextResponse.rewrite(url)
  }

  // Solo UUID + id numérico (evita capturar /es/31 u otras rutas de 2 segmentos en el host book)
  const propMatch = pathname.match(
    /^\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\/(\d+)\/?$/i
  )
  if (propMatch) {
    url.pathname = `/book/${propMatch[1]}/${propMatch[2]}`
    return NextResponse.rewrite(url)
  }

  return null
}

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
  
  // Extraer locale si existe en el pathname (/es/..., /en/...)
  const pathParts = pathname.split('/').filter(Boolean);
  const localeFromPath = pathParts.length > 0 && isValidLocale(pathParts[0]) ? pathParts[0] : null;

  // ==============================================
  // 1. ARCHIVOS ESTÁTICOS - SIEMPRE PERMITIR
  // ==============================================
  
  // Preflight CORS
  if (req.method === 'OPTIONS') return NextResponse.next();

  const bookRewrite = rewriteBookMicrositePath(req)
  if (bookRewrite) return bookRewrite

  // Raíz y login: no pasar por auth en edge para evitar 404; Next.js los sirve directo
  if (pathname === '/' || pathname === '/admin-login' || pathname === '/forgot-password') {
    return NextResponse.next();
  }

  // Archivos estáticos y rutas especiales de Next.js - siempre permitir
  if (
    pathname.startsWith('/_next') ||
    pathname === '/_not-found' ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname === '/manifest.json' ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname.startsWith('/icon') ||
    pathname.startsWith('/sw.js') ||
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

  // Formulario estático MIR / registro de viajeros (huéspedes, sin sesión ni /es/)
  if (pathname === '/index.html') {
    return NextResponse.next();
  }

  // ==============================================
  // 3. DETECCIÓN DE IDIOMA (I18N)
  // ==============================================
  
  // Excluir solo API, superadmin, booking y login de la detección i18n.
  // El resto de rutas (dashboard, reservations, settings, etc.) llevan prefijo de idioma: /es/dashboard, /en/reservations...
  const shouldSkipI18n = (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/superadmin') ||
    pathname.startsWith('/book/') ||
    pathname.startsWith('/limpieza') ||
    pathname === '/admin-login' ||
    pathname === '/forgot-password' ||
    pathname === '/' ||
    pathname.startsWith('/admin-setup')
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
      const acceptLanguage = req.headers.get('accept-language') || '';
      const cookiePreferred = req.cookies.get('preferred_locale')?.value;
      const cookieNextIntl = req.cookies.get('NEXT_LOCALE')?.value;
      const detectedLocale =
        (cookiePreferred && isValidLocale(cookiePreferred) ? cookiePreferred : null) ??
        (cookieNextIntl && isValidLocale(cookieNextIntl) ? cookieNextIntl : null) ??
        getLocaleFromRequest(acceptLanguage);

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

  /**
   * Enlaces de pago usados desde book.delfincheckin.com sin sesión del admin.
   * Sin esto el middleware devolvía 401 sin CORS y el fetch fallaba en el navegador.
   * NO incluye: POST /api/payment-links (crear), GET /api/payment-links (listar), DELETE …/[code].
   */
  if (pathname.startsWith('/api/payment-links/')) {
    const suffix = pathname.slice('/api/payment-links/'.length)
    const parts = suffix.split('/').filter(Boolean)
    const m = req.method
    if (parts.length === 1 && ['GET', 'HEAD', 'OPTIONS'].includes(m)) {
      return NextResponse.next()
    }
    if (parts.length === 2 && parts[1] === 'process' && ['POST', 'OPTIONS'].includes(m)) {
      return NextResponse.next()
    }
  }
  
  // Rutas completamente públicas - no requieren autenticación
  const isPublicRoute = (
    pathname === '/admin-login' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/book/') ||
    pathname.startsWith('/limpieza') ||
    pathname.startsWith('/api/cleaning/public-view/') ||
    pathname.startsWith('/api/cleaning/public-link/') ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/api/direct-reservations/') ||
    pathname.startsWith('/api/test-') ||
    pathname.startsWith('/api/debug-') ||
    pathname.startsWith('/api/check-') ||
    pathname.startsWith('/api/onboarding/') ||
    pathname.startsWith('/api/admin/login') ||
    pathname.startsWith('/api/auth/forgot-password') ||
    pathname.startsWith('/api/auth/verify-recovery-code') ||
    pathname.startsWith('/api/auth/reset-password') ||
    pathname.startsWith('/api/auth/verify') ||
    pathname.startsWith('/api/auth/mobile-login') ||
    pathname.startsWith('/api/auth/refresh') ||
    pathname.startsWith('/api/create-payment-intent') ||
    pathname.startsWith('/api/landing/') ||
    pathname.startsWith('/api/waitlist') ||
    pathname.startsWith('/api/track/') ||
    pathname.startsWith('/api/blog/analytics/') ||
    pathname.startsWith('/api/blog/waitlist') ||
    pathname.startsWith('/api/cron/') ||
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
        pathname === '/api/admin/recover-onboarding' ||
        pathname.startsWith('/api/admin/login') ||
        pathname.startsWith('/api/auth/forgot-password') ||
        pathname.startsWith('/api/auth/verify-recovery-code') ||
        pathname.startsWith('/api/auth/reset-password') ||
        pathname.startsWith('/api/auth/verify') ||
        pathname.startsWith('/api/auth/mobile-login') ||
        pathname.startsWith('/api/auth/refresh') ||
        pathname === '/api/tenant' ||
        pathname.startsWith('/api/stripe/webhook') ||
        pathname.startsWith('/api/create-payment-intent') ||
        pathname.startsWith('/api/waitlist') ||
        pathname.startsWith('/api/track/') ||
        pathname.startsWith('/api/blog/analytics/') ||
        pathname.startsWith('/api/blog/waitlist') ||
        pathname.startsWith('/api/cron/') ||
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

  // Onboarding con enlace del correo (?token=&email=): hay que servir la página sin JWT para que
  // el cliente llame a POST /api/onboarding/login y reciba auth_token + onboarding_status.
  // Sin esto, incógnito / primer clic cae en /admin-login y el magic link parece "roto".
  if (!pathname.startsWith('/api/')) {
    const magicToken = url.searchParams.get('token');
    const magicEmail = url.searchParams.get('email');
    const hasMagicLinkParams =
      typeof magicToken === 'string' &&
      magicToken.trim().length >= 16 &&
      typeof magicEmail === 'string' &&
      magicEmail.trim().includes('@');

    const isOnboardingPage =
      pathname === '/onboarding' ||
      locales.some(
        (l) =>
          pathname === `/${l}/onboarding` ||
          pathname.startsWith(`/${l}/onboarding/`)
      );

    if (hasMagicLinkParams && isOnboardingPage) {
      return NextResponse.next();
    }
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

      // ==============================================
      // 5. GATING DE ONBOARDING (primer acceso)
      // ==============================================
      // Si el onboarding no está completado, forzar /{locale}/onboarding
      // Evitar bucles permitiendo la propia ruta de onboarding.
      const onboardingCookie = req.cookies.get('onboarding_status')?.value;
      // Si no existe cookie todavía (usuarios antiguos), no forzar para evitar bucles.
      const onboardingStatus = onboardingCookie || 'unknown';
      const isOnboardingPath =
        pathname === '/onboarding' ||
        (localeFromPath ? pathname === `/${localeFromPath}/onboarding` : false) ||
        (localeFromPath ? pathname.startsWith(`/${localeFromPath}/onboarding/`) : false);

      if ((onboardingStatus === 'pending' || onboardingStatus === 'in_progress') && !isOnboardingPath) {
        const targetLocale = localeFromPath || defaultLocale;
        const onboardingUrl = new URL(`/${targetLocale}/onboarding`, req.url);
        return NextResponse.redirect(onboardingUrl);
      }

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
    // Incluir todas las rutas; /, /admin-login y /forgot-password hacen next() al inicio
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
