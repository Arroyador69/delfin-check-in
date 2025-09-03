import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// SOLO estas rutas están permitidas sin autenticación
const ALLOWED_ROUTES = [
  '/admin-login', // Página de login
  '/api/ministerio/comunicaciones', // API para recibir datos del formulario
  '/api/guest-registrations', // API para recibir datos
  '/api/ical', // API para calendarios
  '/api/sync', // API para sincronización
  '/api/test-deploy', // API de prueba
  '/api/auth/verify', // API de verificación
  '/api/auth/logout', // API de logout
  '/_next', // Archivos estáticos de Next.js
  '/favicon.ico',
  '/manifest.json',
  '/sw.js'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Verificar si la ruta está permitida
  const isAllowed = ALLOWED_ROUTES.some(route => pathname.startsWith(route))
  
  // Si NO está permitida, BLOQUEAR y redirigir al login
  if (!isAllowed) {
    console.log(`🚫 BLOQUEANDO ACCESO A: ${pathname}`)
    const loginUrl = new URL('/admin-login', request.url)
    return NextResponse.redirect(loginUrl)
  }
  
  // Si está permitida, continuar
  console.log(`✅ PERMITIENDO ACCESO A: ${pathname}`)
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
