import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, AUTH_CONFIG } from '@/lib/auth'

/**
 * 🔍 API DE VERIFICACIÓN DE AUTENTICACIÓN
 * 
 * Verifica si el usuario tiene un token JWT válido
 * - Valida firma del token
 * - Verifica que no haya expirado
 * - Retorna información del usuario
 */

export async function GET(request: NextRequest) {
  try {
    // Obtener el token de autenticación de las cookies
    const authToken = request.cookies.get(AUTH_CONFIG.cookieName)?.value
    
    if (!authToken) {
      return NextResponse.json({ 
        authenticated: false, 
        message: 'No hay token de autenticación' 
      }, { status: 401 })
    }
    
    // Verificar el token JWT
    const payload = verifyToken(authToken)
    
    if (!payload) {
      return NextResponse.json({ 
        authenticated: false, 
        message: 'Token inválido o expirado',
        expired: true
      }, { status: 401 })
    }
    
    // Token válido
    return NextResponse.json({ 
      authenticated: true, 
      message: 'Usuario autenticado',
      user: {
        id: payload.userId,
        role: payload.role
      }
    })
    
  } catch (error) {
    console.error('Error en verificación de auth:', error)
    
    return NextResponse.json({ 
      authenticated: false, 
      message: 'Error de autenticación' 
    }, { status: 500 })
  }
}
