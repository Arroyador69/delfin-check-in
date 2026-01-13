import { NextResponse } from 'next/server'
import { AUTH_CONFIG } from '@/lib/auth'

/**
 * 🔐 API DE LOGOUT - ELIMINACIÓN SEGURA DE SESIÓN
 * 
 * IMPORTANTE: Las cookies deben eliminarse con los MISMOS parámetros
 * que se usaron para crearlas (domain, path, sameSite, secure)
 * 
 * Si no coinciden, el navegador NO eliminará las cookies y la sesión
 * seguirá activa, permitiendo acceso no autorizado.
 */
export async function POST() {
  try {
    const isProduction = process.env.NODE_ENV === 'production'
    
    // Crear respuesta con cookie expirada
    const response = NextResponse.json({ 
      message: 'Sesión cerrada correctamente',
      success: true
    })
    
    // ⚠️ CRÍTICO: Eliminar la cookie de autenticación con los MISMOS parámetros que se usaron para crearla
    // Debe coincidir exactamente: domain, path, sameSite, secure
    response.cookies.set(AUTH_CONFIG.cookieName, '', {
      expires: new Date(0), // Fecha en el pasado para forzar eliminación
      maxAge: 0, // También establecer maxAge a 0
      path: '/', // Mismo path que en login
      httpOnly: true, // Mismo httpOnly que en login
      secure: isProduction, // Mismo secure que en login
      sameSite: 'lax', // ⚠️ CAMBIADO: Debe ser 'lax' como en login, NO 'strict'
      domain: isProduction ? '.delfincheckin.com' : undefined, // ⚠️ CRÍTICO: Mismo domain que en login
    })
    
    // ⚠️ CRÍTICO: Eliminar también la cookie de refresh token con los MISMOS parámetros
    response.cookies.set(AUTH_CONFIG.refreshCookieName, '', {
      expires: new Date(0), // Fecha en el pasado para forzar eliminación
      maxAge: 0, // También establecer maxAge a 0
      path: '/api/auth', // Mismo path que en login
      httpOnly: true, // Mismo httpOnly que en login
      secure: isProduction, // Mismo secure que en login
      sameSite: 'lax', // ⚠️ CAMBIADO: Debe ser 'lax' como en login, NO 'strict'
      domain: isProduction ? '.delfincheckin.com' : undefined, // ⚠️ CRÍTICO: Mismo domain que en login
    })
    
    return response
    
  } catch (error) {
    console.error('❌ Error al cerrar sesión:', error)
    return NextResponse.json({ 
      message: 'Error al cerrar sesión',
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}
