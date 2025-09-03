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
  if (url.pathname.startsWith('/public') || url.pathname.startsWith('/api/public')) {
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)']
}
