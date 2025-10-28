import { NextResponse } from 'next/server'
import { AUTH_CONFIG } from '@/lib/auth'

export async function POST() {
  try {
    // Crear respuesta con cookie expirada
    const response = NextResponse.json({ 
      message: 'Sesión cerrada correctamente' 
    })
    
    // Eliminar la cookie de autenticación
    response.cookies.set(AUTH_CONFIG.cookieName, '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    })
    
    // Eliminar también la cookie de refresh token
    response.cookies.set(AUTH_CONFIG.refreshCookieName, '', {
      expires: new Date(0),
      path: '/api/auth',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    })
    
    return response
    
  } catch (error) {
    return NextResponse.json({ 
      message: 'Error al cerrar sesión' 
    }, { status: 500 })
  }
}
