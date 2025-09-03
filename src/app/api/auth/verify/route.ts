import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Obtener el token de autenticación de las cookies
    const authToken = request.cookies.get('auth_token')
    
    // Verificar si el token es válido
    if (authToken && authToken.value === 'Cuaderno2314') {
      return NextResponse.json({ 
        authenticated: true, 
        message: 'Usuario autenticado' 
      })
    }
    
    // Si no hay token o es inválido
    return NextResponse.json({ 
      authenticated: false, 
      message: 'No autenticado' 
    }, { status: 401 })
    
  } catch (error) {
    return NextResponse.json({ 
      authenticated: false, 
      message: 'Error de autenticación' 
    }, { status: 500 })
  }
}
