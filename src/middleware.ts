import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas que están permitidas sin autenticación (formulario público + APIs)
const PUBLIC_ROUTES = [
  '/admin-login', // Página de login
  '/guest-registration', // FORMULARIO PÚBLICO - NO BLOQUEAR
  '/reservations-form', // FORMULARIO PÚBLICO - NO BLOQUEAR
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

// Rutas que SÍ requieren autenticación (dashboard admin)
const PROTECTED_ROUTES = [
  '/', // Dashboard principal
  '/guest-registrations-dashboard',
  '/reservations',
  '/rooms',
  '/settings',
  '/partes',
  '/messages',
  '/checkin'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Permitir rutas públicas (formularios + APIs)
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    console.log(`✅ PERMITIENDO ACCESO PÚBLICO A: ${pathname}`)
    return NextResponse.next()
  }
  
  // BLOQUEAR solo las rutas del dashboard admin
  if (PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    console.log(`🚫 BLOQUEANDO ACCESO ADMIN A: ${pathname}`)
    const loginUrl = new URL('/admin-login', request.url)
    return NextResponse.redirect(loginUrl)
  }
  
  // Para cualquier otra ruta, permitir acceso (por si acaso)
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
