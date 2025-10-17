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
  
  // Debug: Log para verificar qué rutas están siendo procesadas
  console.log(`🔍 Middleware processing: ${url.pathname} - Method: ${req.method}`);
  
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
  // PASO 3: VERIFICAR SI ES RUTA PÚBLICA (MÍNIMO ABSOLUTO)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  // Solo estas rutas son públicas - TODO LO DEMÁS REQUIERE AUTENTICACIÓN
  const isPublicRoute = (
    // Página de login
    url.pathname === '/admin-login' ||
    // Página de recuperación de contraseña
    url.pathname === '/forgot-password' ||
    // API de login
    url.pathname.startsWith('/api/admin/login') ||
    // APIs de recuperación de contraseña (para usuarios sin sesión)
    url.pathname.startsWith('/api/auth/forgot-password') ||
    url.pathname.startsWith('/api/auth/verify-recovery-code') ||
    url.pathname.startsWith('/api/auth/reset-password') ||
    // APIs de autenticación
    url.pathname.startsWith('/api/auth/logout') ||
    url.pathname.startsWith('/api/auth/refresh') ||
    // Webhook de Stripe (debe ser público)
    url.pathname.startsWith('/api/stripe/webhook') ||
    // Formularios públicos (para huéspedes)
    url.pathname.startsWith('/api/public/form') ||
    url.pathname.startsWith('/api/public/form-redirect') ||
    // Endpoint de registro flexible (usado por formularios públicos)
    url.pathname === '/api/registro-flex' ||
    // Endpoint de create-payment-intent (usado por landing page)
    url.pathname === '/api/create-payment-intent' ||
    // Webhook de Telegram (debe ser público)
    url.pathname.startsWith('/api/telegram/webhook') ||
    // Endpoint de verificación MIR (público para pruebas)
    url.pathname.startsWith('/api/public/verificar-mir') ||
    // Endpoint de test producción MIR (público para pruebas)
    url.pathname.startsWith('/api/public/test-produccion') ||
    // Endpoint de test pruebas MIR (público para pruebas)
    url.pathname.startsWith('/api/public/test-pruebas') ||
    // Endpoint de estado envíos MIR (público para verificación)
    url.pathname.startsWith('/api/public/estado-envios') ||
    // Endpoint de test configuración MIR (público para verificación)
    url.pathname.startsWith('/api/test-mir-config') ||
    // Endpoint de test conexión MIR (público para verificación)
    url.pathname.startsWith('/api/test-mir-connection') ||
    // Endpoint de test registros MIR (público para verificación)
    url.pathname.startsWith('/api/test-mir-registros') ||
    // Endpoint de debug MIR (público para verificación)
    url.pathname.startsWith('/api/test-mir-debug') ||
    // Endpoint de test endpoints MIR (público para verificación)
    url.pathname.startsWith('/api/test-mir-endpoints') ||
    // Endpoint de test autenticación MIR (público para verificación)
    url.pathname.startsWith('/api/test-mir-auth') ||
    // Endpoint de test final MIR (público para verificación)
    url.pathname.startsWith('/api/test-mir-final') ||
    // Endpoint de test endpoint correcto MIR (público para verificación)
    url.pathname.startsWith('/api/test-mir-endpoint-correct') ||
    // Endpoint de test MIR working (público para verificación)
    url.pathname.startsWith('/api/test-mir-working') ||
    // Endpoint de test MIR pruebas (público para verificación)
    url.pathname.startsWith('/api/test-mir-pruebas') ||
    // Endpoint de configuración MIR pruebas (público para verificación)
    url.pathname.startsWith('/api/config-mir-pruebas') ||
    // Endpoint de test MIR raw (público para verificación)
    url.pathname.startsWith('/api/test-mir-raw')
    || url.pathname.startsWith('/api/public/ministerio/debug-preview')
    || url.pathname.startsWith('/api/public/ministerio/debug-download-zip')
  );
  
  // Debug: Log para verificar qué rutas están siendo procesadas
  console.log(`🔍 Middleware processing: ${url.pathname} - isPublic: ${isPublicRoute}`);
  
  if (isPublicRoute) {
    console.log(`✅ Allowing public route: ${url.pathname}`);
    return NextResponse.next();
  }
  
  // TODAS las demás rutas requieren autenticación
  // Esto incluye: /telegram-assistant, /aeat, /calendar-sync, /offline-queue, /audit
  // Y TODAS las demás páginas del sistema
  console.log(`🔒 PROTECTING route: ${url.pathname} - Authentication required`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PASO 4: TODAS LAS DEMÁS RUTAS REQUIEREN AUTENTICACIÓN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  // Si llegamos aquí, la ruta requiere autenticación
  const requiresAuth = true;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PASO 5: VERIFICAR JWT TOKEN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  if (requiresAuth) {
    // Obtener token de la cookie
    const authToken = req.cookies.get(AUTH_CONFIG.cookieName)?.value;
    
    if (!authToken) {
      console.warn(`🔒 Acceso denegado a ${url.pathname} - No hay token`);
      
      // Si es API, retornar 401
      if (url.pathname.startsWith('/api/')) {
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
      const response = url.pathname.startsWith('/api/')
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
    requestHeaders.set('x-tenant-id', payload.tenantId);
    requestHeaders.set('x-user-email', payload.email);

    // Continuar con el request pero con headers actualizados
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    return response;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PASO 6: ESTO NO DEBERÍA LLEGAR AQUÍ - TODAS LAS RUTAS ESTÁN PROTEGIDAS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  // Si llegamos aquí, algo está mal - redirigir al login
  console.warn(`🔒 Ruta no manejada: ${url.pathname} - Redirigiendo al login`);
  return NextResponse.redirect(new URL('/admin-login', req.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files
     * This ensures ALL pages are processed by middleware
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
