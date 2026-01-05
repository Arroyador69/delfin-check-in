import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function checkOnboardingStatus(tenantId: string): Promise<boolean> {
  try {
    // Verificar onboarding_status en la tabla tenants (nuevo sistema)
    const tenantResult = await sql`
      SELECT onboarding_status 
      FROM tenants 
      WHERE id = ${tenantId}
      LIMIT 1
    `;

    if (tenantResult.rows.length > 0) {
      const status = tenantResult.rows[0].onboarding_status;
      // Si tiene el nuevo campo, usarlo
      if (status === 'completed') {
        return true;
      }
      if (status === 'pending' || status === 'in_progress') {
        return false;
      }
    }

    // Fallback: verificar si el onboarding está completo (sistema antiguo)
    const result = await sql`
      SELECT onboarding_completo 
      FROM dpa_aceptaciones 
      WHERE tenant_id = ${tenantId} 
      AND onboarding_completo = true
      LIMIT 1
    `;

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error verificando estado del onboarding:', error);
    return false;
  }
}

export async function onboardingMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Rutas que no requieren onboarding
  const publicRoutes = [
    '/api/auth',
    '/api/onboarding',
    '/onboarding',
    '/admin-login',
    '/register',
    '/_next',
    '/favicon.ico'
  ];

  // Si es una ruta pública, permitir acceso
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Si es la página de onboarding, permitir acceso
  if (pathname === '/onboarding') {
    return NextResponse.next();
  }

  // Obtener tenant_id del header o cookie
  const tenantId = request.headers.get('x-tenant-id') || 
                   request.cookies.get('tenant-id')?.value;

  if (!tenantId) {
    // Si no hay tenant_id, redirigir al login
    return NextResponse.redirect(new URL('/admin-login', request.url));
  }

  // Verificar estado del onboarding
  const onboardingCompleto = await checkOnboardingStatus(tenantId);

  if (!onboardingCompleto) {
    // Si el onboarding no está completo, redirigir al onboarding
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  return NextResponse.next();
}





















