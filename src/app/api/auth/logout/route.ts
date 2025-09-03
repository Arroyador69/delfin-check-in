import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Crear respuesta con cookie expirada
    const response = NextResponse.json({ 
      message: 'Sesión cerrada correctamente' 
    })
    
    // Eliminar la cookie de autenticación
    response.cookies.set('auth_token', '', {
      expires: new Date(0),
      path: '/',
      httpOnly: false,
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
