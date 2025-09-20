import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  // Solo proteger el host del admin (o URLs de Vercel para testing)
  const host = req.headers.get('host') || ''
  const isAdminDomain = host.startsWith('admin.')
  const isVercelDomain = host.includes('vercel.app')
  
  // Para testing, permitir que funcione en ambos
  if (!isAdminDomain && !isVercelDomain) return NextResponse.next()

  // Rutas que quieres dejar públicas (si alguna)
  const url = req.nextUrl
  
  // ✅ Allowlist de archivos estáticos y manifest
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
  
  // Permitir endpoints de API públicos y páginas específicas
  if (url.pathname.startsWith('/api/registro-flex') || 
      url.pathname.startsWith('/api/setup-db') || 
      url.pathname.startsWith('/api/setup-whatsapp-db') || 
      url.pathname.startsWith('/api/init-whatsapp-db') || 
      url.pathname.startsWith('/api/check-db') || 
      url.pathname.startsWith('/api/test-registro') ||
      url.pathname.startsWith('/api/upgrade-db-public') ||
      url.pathname.startsWith('/api/public') ||
      url.pathname.startsWith('/api/reservations') ||
      url.pathname.startsWith('/api/rooms') ||
      url.pathname.startsWith('/api/setup-rooms') ||
      url.pathname.startsWith('/api/ical') ||
      url.pathname.startsWith('/public') ||
      url.pathname === '/reservations' ||
      url.pathname.startsWith('/reservations/')) {
    return NextResponse.next()
  }

  const auth = req.headers.get('authorization')
  if (!auth) {
    return new NextResponse('Auth required', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' }
    })
  }

  const [scheme, encoded] = auth.split(' ')
  if (scheme !== 'Basic' || !encoded) {
    return new NextResponse('Invalid auth', { status: 401 })
  }

  const decoded = Buffer.from(encoded, 'base64').toString()
  const [user, pass] = decoded.split(':')

  const USER = process.env.AUTH_USER
  const PASS = process.env.AUTH_PASS

  if (user === USER && pass === PASS) {
    return NextResponse.next()
  }

  return new NextResponse('Unauthorized', { status: 401 })
}

export const config = {
  matcher: ['/((?!_next|static|images|fonts|favicon.ico|manifest.json|robots.txt|icon|sw.js).*)']
}
