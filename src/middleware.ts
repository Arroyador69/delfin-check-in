import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Rutas que NO deben tener autenticación (formularios independientes)
  const PUBLIC_ROUTES = [
    '/guest-registration',
    '/reservations-form'
  ];
  
  // Si es una ruta pública, permitir acceso sin autenticación
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }
  
  // Proteger solo las rutas del dashboard
  if (pathname.startsWith('/guest-registrations-dashboard')) {
    // Verificar si hay un token de autenticación en las cookies
    const authToken = request.cookies.get('auth_token');
    
    if (!authToken || authToken.value !== process.env.ADMIN_SECRET) {
      // Redirigir a la página de login si no está autenticado
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Excluir rutas estáticas, API y formularios públicos
    '/((?!api|_next/static|_next/image|favicon.ico|guest-registration|reservations-form).*)',
  ],
};
