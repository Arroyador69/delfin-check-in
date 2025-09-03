import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas que están permitidas sin autenticación (SOLO APIs y archivos estáticos)
const PUBLIC_ROUTES = [
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

// Función para verificar si una ruta es pública
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

// Función para verificar si es un archivo estático
function isStaticFile(pathname: string): boolean {
  return pathname.includes('.') || 
         pathname.startsWith('/_next/') || 
         pathname.startsWith('/api/')
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Permitir SOLO rutas públicas y archivos estáticos
  if (isPublicRoute(pathname) || isStaticFile(pathname)) {
    return NextResponse.next()
  }
  
  // BLOQUEAR TODAS LAS DEMÁS RUTAS - Redirigir al login
  // Esto incluye: /, /admin-login, /guest-registrations-dashboard, /reservations, /rooms, /settings, etc.
  const loginUrl = new URL('/admin-login', request.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
