import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Proteger solo las rutas del dashboard
  if (request.nextUrl.pathname.startsWith('/guest-registrations-dashboard')) {
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
    '/guest-registrations-dashboard/:path*',
  ],
};
