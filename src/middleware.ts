import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas que están permitidas sin autenticación
const PUBLIC_ROUTES = [
  '/admin-login.html',
  '/api/ministerio/comunicaciones', // API para recibir datos del formulario
  '/api/guest-registrations', // API para recibir datos
  '/api/ical', // API para calendarios
  '/api/sync', // API para sincronización
  '/api/test-deploy', // API de prueba
  '/_next', // Archivos estáticos de Next.js
  '/favicon.ico',
  '/manifest.json',
  '/sw.js'
]

// Rutas que requieren autenticación (dashboard)
const PROTECTED_ROUTES = [
  '/guest-registrations-dashboard',
  '/reservations',
  '/rooms',
  '/settings',
  '/partes',
  '/messages',
  '/checkin',
  '/guest-registration'
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Permitir rutas públicas
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  
  // Permitir archivos estáticos y assets
  if (pathname.includes('.') || pathname.startsWith('/_next/')) {
    return NextResponse.next()
  }
  
  // Si es la ruta raíz o cualquier ruta protegida, redirigir al login
  if (pathname === '/' || PROTECTED_ROUTES.some(route => pathname.startsWith(route))) {
    const loginUrl = new URL('/admin-login.html', request.url)
    return NextResponse.redirect(loginUrl)
  }
  
  // Para cualquier otra ruta, también redirigir al login
  const loginUrl = new URL('/admin-login.html', request.url)
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
