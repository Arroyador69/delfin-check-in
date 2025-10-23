import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, AUTH_CONFIG } from '@/lib/auth';

/**
 * 🔍 API PARA DIAGNOSTICAR PROBLEMAS DE AUTENTICACIÓN
 * 
 * Este endpoint ayuda a diagnosticar problemas de autenticación
 * y verificar el estado de los tokens.
 */

export async function GET(req: NextRequest) {
  try {
    const authToken = req.cookies.get(AUTH_CONFIG.cookieName)?.value;
    const headers = req.headers;
    
    console.log('🔍 DEBUG AUTH - Headers recibidos:', {
      'x-user-id': headers.get('x-user-id'),
      'x-user-role': headers.get('x-user-role'),
      'x-tenant-id': headers.get('x-tenant-id'),
      'x-user-email': headers.get('x-user-email'),
      'cookie-auth-token': authToken ? 'Presente' : 'Ausente',
      'cookie-auth-token-length': authToken?.length || 0
    });

    if (!authToken) {
      return NextResponse.json({
        success: false,
        error: 'No hay token de autenticación',
        details: {
          cookieName: AUTH_CONFIG.cookieName,
          cookies: req.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value }))
        }
      });
    }

    // Verificar el token
    const payload = verifyToken(authToken);
    
    if (!payload) {
      return NextResponse.json({
        success: false,
        error: 'Token inválido o expirado',
        details: {
          tokenLength: authToken.length,
          tokenPreview: authToken.substring(0, 20) + '...',
          jwtSecretConfigured: !!process.env.JWT_SECRET
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Autenticación válida',
      user: {
        userId: payload.userId,
        tenantId: payload.tenantId,
        email: payload.email,
        role: payload.role,
        tenantName: payload.tenantName
      },
      token: {
        issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
        isExpired: payload.exp ? Date.now() > payload.exp * 1000 : false
      },
      headers: {
        'x-user-id': headers.get('x-user-id'),
        'x-user-role': headers.get('x-user-role'),
        'x-tenant-id': headers.get('x-tenant-id'),
        'x-user-email': headers.get('x-user-email')
      }
    });

  } catch (error) {
    console.error('❌ Error en debug-auth:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
