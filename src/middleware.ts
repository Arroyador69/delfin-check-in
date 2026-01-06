import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTokenEdge } from '@/lib/auth-edge'

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

  // 🔒 PROTECCIÓN HTTP BASIC AUTH PARA STAGING
  // Solo se aplica si estamos en staging.delfincheckin.com
  const hostname = req.headers.get('host') || '';
  const isStaging = hostname.includes('staging.delfincheckin.com') || 
                    hostname.includes('staging-delfincheckin.vercel.app');
  
  if (isStaging) {
    const stagingUser = process.env.STAGING_USER;
    const stagingPassword = process.env.STAGING_PASSWORD;
    
    // Solo aplicar protección si las credenciales están configuradas
    if (stagingUser && stagingPassword) {
      const authHeader = req.headers.get('authorization');
      
      // Si no hay header de autorización, solicitar autenticación
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
        // Decodificar credenciales base64
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');
        
        // Verificar credenciales
        if (username !== stagingUser || password !== stagingPassword) {
          return new NextResponse('Invalid credentials', {
            status: 401,
            headers: {
              'WWW-Authenticate': 'Basic realm="Staging Access - Credenciales incorrectas"',
              'Content-Type': 'text/plain',
            },
          });
        }
        
        // Credenciales correctas, continuar
        console.log('✅ Staging auth: Credenciales correctas');
      } catch (error) {
        // Error al decodificar, solicitar nuevamente
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
    url.pathname.startsWith('/api/admin/login') ||
    url.pathname.startsWith('/api/auth/mobile-login') ||
    url.pathname.startsWith('/api/auth/refresh') ||
    url.pathname.startsWith('/api/create-payment-intent') ||
    url.pathname.startsWith('/api/stripe/webhook') ||
    url.pathname.startsWith('/api/telegram/webhook') // Webhook de Telegram debe ser público
  );
  
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Para rutas de API, inyectar tenant ID desde JWT o header (CRÍTICO: sin fallback)
  if (url.pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(req.headers);
    let tenantId: string | null = null;
    
    // PRIMERO: Verificar si hay tenant_id en el header (para llamadas internas entre endpoints)
    const headerTenantId = req.headers.get('x-tenant-id') || req.headers.get('X-Tenant-ID');
    if (headerTenantId) {
      tenantId = headerTenantId;
      requestHeaders.set('x-tenant-id', tenantId);
      console.log(`🔗 Tenant_id desde header (llamada interna): ${tenantId}`);
    }
    
    // SEGUNDO: Si no hay tenant_id en header, intentar desde Authorization Bearer token (para apps móviles)
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
        // No loguear errores de token expirado - el interceptor de la app lo manejará
        // Solo loguear otros tipos de errores
        if (error.name !== 'TokenExpiredError' && !error.message?.includes('expired')) {
          console.error('Error verificando token Bearer:', error);
        }
        // Si hay tenantId en header, ya está configurado arriba, así que continuar
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
    
    // ⚠️ CRÍTICO: NO usar tenant por defecto - esto causa fuga de datos entre tenants
    // Si no hay tenant_id válido, las rutas protegidas deben fallar con 401
    if (!tenantId) {
      // Solo permitir rutas públicas sin tenant_id
      const isPublicApiRoute = (
        url.pathname.startsWith('/api/public/') ||
        url.pathname.startsWith('/api/direct-reservations/') ||
        url.pathname.startsWith('/api/test-') ||
        url.pathname.startsWith('/api/debug-') ||
        url.pathname.startsWith('/api/check-') ||
        url.pathname.startsWith('/api/onboarding/') ||
        url.pathname.startsWith('/api/admin/login') ||
        url.pathname.startsWith('/api/auth/mobile-login') ||
        url.pathname.startsWith('/api/auth/refresh') ||
        url.pathname.startsWith('/api/stripe/webhook') ||
        url.pathname.startsWith('/api/create-payment-intent') ||
        url.pathname.startsWith('/api/telegram/webhook') // Webhook de Telegram debe ser público
      );
      
      if (!isPublicApiRoute) {
        console.warn(`⚠️ [SECURITY] Intento de acceso sin tenant_id a: ${url.pathname}`);
        return NextResponse.json(
          { error: 'No autorizado - tenant_id requerido' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Para rutas de páginas, verificar autenticación y extraer tenant_id
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
  } else {
    // Si hay token, extraer tenant_id y agregarlo a los headers para las páginas
    try {
      const payload = verifyTokenEdge(authToken);
      if (payload?.tenantId) {
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-tenant-id', payload.tenantId);
        console.log(`🔐 Tenant_id extraído del JWT para página: ${payload.tenantId}`);
        return NextResponse.next({ request: { headers: requestHeaders } });
      }
    } catch (error) {
      console.error('Error verificando token en middleware de páginas:', error);
      // Token inválido, redirigir al login
      const loginUrl = new URL('/admin-login', req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Para rutas de superadmin, solo verificar que haya token
  // La verificación real del flag se hará en la página (server-side)
  if (url.pathname.startsWith('/superadmin')) {
    if (!authToken) {
      console.log('🔒 No hay token, redirigiendo al login');
      const loginUrl = new URL('/admin-login', req.url);
      return NextResponse.redirect(loginUrl);
    }
    console.log('🔍 Verificando acceso SuperAdmin...');
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