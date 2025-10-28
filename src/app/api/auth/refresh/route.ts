import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, generateAccessToken, AUTH_CONFIG } from '@/lib/auth';
export const runtime = 'nodejs';

/**
 * 🔄 API DE REFRESH TOKEN
 * 
 * Permite renovar el access token usando un refresh token válido
 * - Verifica el refresh token
 * - Genera un nuevo access token
 * - Mantiene el refresh token existente
 */

export async function POST(req: NextRequest) {
  try {
    // Obtener refresh token de la cookie
    const refreshToken = req.cookies.get(AUTH_CONFIG.refreshCookieName)?.value;
    
    if (!refreshToken) {
      return NextResponse.json(
        { 
          error: 'No hay refresh token',
          message: 'Debes iniciar sesión nuevamente'
        },
        { status: 401 }
      );
    }

    // Verificar que el refresh token sea válido
    const payload = verifyToken(refreshToken);
    
    if (!payload) {
      // Refresh token inválido o expirado
      const response = NextResponse.json(
        { 
          error: 'Refresh token inválido',
          message: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
        },
        { status: 401 }
      );
      
      // Eliminar ambas cookies
      response.cookies.delete(AUTH_CONFIG.cookieName);
      response.cookies.delete(AUTH_CONFIG.refreshCookieName);
      
      return response;
    }

    // Verificar que sea realmente un refresh token
    if (!(payload as any).type || (payload as any).type !== 'refresh') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Generar nuevo access token
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      role: payload.role
    });

    // Crear respuesta con el nuevo access token
    const response = NextResponse.json({ 
      success: true,
      message: 'Token renovado exitosamente'
    });

    // Establecer nueva cookie de access token
    const isProduction = process.env.NODE_ENV === 'production';
    
    response.cookies.set(AUTH_CONFIG.cookieName, newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60 * 2, // 2 horas
      path: '/',
    });

    console.log(`🔄 Token renovado para usuario: ${payload.userId}`);

    return response;
    
  } catch (error) {
    console.error('❌ Error al renovar token:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: 'No se pudo renovar el token'
      },
      { status: 500 }
    );
  }
}

