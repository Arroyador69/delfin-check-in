import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    
    // Verificar la contraseña contra la variable de entorno
    const adminSecret = process.env.ADMIN_SECRET;
    
    if (!adminSecret) {
      console.error('ADMIN_SECRET no está configurada');
      return new Response(JSON.stringify({ error: 'Error de configuración del servidor' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (password === adminSecret) {
      // Crear respuesta con cookie de autenticación
      const response = NextResponse.json({ success: true });
      
      // Establecer cookie de autenticación (httpOnly para seguridad)
      response.cookies.set('auth_token', adminSecret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 días
        path: '/',
      });
      
      return response;
    } else {
      return new Response(JSON.stringify({ error: 'Contraseña incorrecta' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error en login:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
