import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, AUTH_CONFIG } from '@/lib/auth';

/**
 * 🧪 API SIMPLE PARA PROBAR AUTENTICACIÓN
 * 
 * Este endpoint verifica si hay un token válido en las cookies
 * y devuelve información del usuario autenticado.
 */

export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get(AUTH_CONFIG.cookieName)?.value;
    
    console.log('🔍 Test Auth Simple - Token encontrado:', !!authToken);
    console.log('🔍 Test Auth Simple - Longitud del token:', authToken?.length || 0);
    
    if (!authToken) {
      return NextResponse.json({
        success: false,
        error: 'No hay token de autenticación',
        message: 'Necesitas hacer login primero'
      });
    }

    const payload = verifyToken(authToken);
    
    if (!payload) {
      return NextResponse.json({
        success: false,
        error: 'Token inválido',
        message: 'El token de autenticación no es válido'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Autenticación válida',
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenantId,
        tenantName: payload.tenantName
      }
    });

  } catch (error) {
    console.error('❌ Error en test-auth-simple:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}




