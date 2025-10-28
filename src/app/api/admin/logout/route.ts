import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Crear respuesta exitosa
    const response = NextResponse.json({ success: true });
    
    // Eliminar la cookie de autenticación
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Expirar inmediatamente
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Error en logout:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
