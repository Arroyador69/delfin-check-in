import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  console.log(`🔒 MIDDLEWARE: Verificando ruta: ${pathname}`)
  
  // PERMITIR SOLO estas rutas (login + APIs + archivos estáticos)
  const ALLOWED_ROUTES = [
    '/admin-login',
    '/api',
    '/_next',
    '/favicon.ico',
    '/manifest.json',
    '/sw.js'
  ]
  
  // BLOQUEAR TODO LO DEMÁS
  const isAllowed = ALLOWED_ROUTES.some(route => pathname.startsWith(route))
  
  if (!isAllowed) {
    console.log(`🚫 BLOQUEANDO ACCESO A: ${pathname} - Redirigiendo a login`)
    
    // Verificar si ya está autenticado
    const authToken = request.cookies.get('auth_token')
    
    if (!authToken || authToken.value !== 'Cuaderno2314') {
      console.log(`🔐 Usuario NO autenticado - Redirigiendo a /admin-login`)
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }
    
    console.log(`✅ Usuario autenticado - Permitido acceso a: ${pathname}`)
  } else {
    console.log(`✅ PERMITIENDO ACCESO A: ${pathname}`)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match ALL request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
