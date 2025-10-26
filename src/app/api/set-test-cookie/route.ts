import { NextRequest, NextResponse } from 'next/server';

/**
 * 🧪 API PARA ESTABLECER COOKIE DE PRUEBA
 * 
 * Este endpoint establece una cookie de prueba para verificar
 * si el problema está en la configuración de cookies.
 */

export async function GET(req: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Cookie de prueba establecida'
    });

    // Establecer cookie de prueba
    response.cookies.set('test_cookie', 'test_value_123', {
      httpOnly: false, // Permitir acceso desde JavaScript para pruebas
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 2, // 2 horas
      path: '/',
    });

    // Establecer cookie de autenticación de prueba
    response.cookies.set('auth_token', 'test_auth_token_123', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 2, // 2 horas
      path: '/',
    });

    console.log('✅ Cookies de prueba establecidas');

    return response;

  } catch (error) {
    console.error('❌ Error estableciendo cookies de prueba:', error);
    return NextResponse.json({
      success: false,
      error: 'Error estableciendo cookies',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}





