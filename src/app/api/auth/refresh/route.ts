// =====================================================
// API ENDPOINT: REFRESH TOKEN (Móvil)
// =====================================================
// Renueva el access token usando el refresh token

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, generateAccessToken } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    
    if (!refreshToken || typeof refreshToken !== 'string') {
      return NextResponse.json(
        { error: 'Refresh token requerido' },
        { status: 400 }
      );
    }

    // Verificar refresh token
    const payload = verifyToken(refreshToken);
    
    if (!payload) {
      return NextResponse.json(
        { error: 'Refresh token inválido o expirado' },
        { status: 401 }
      );
    }

    // Verificar que es un refresh token
    if ((payload as any).type !== 'refresh') {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }

    // Generar nuevo access token
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
      isPlatformAdmin: payload.isPlatformAdmin,
      tenantName: payload.tenantName,
      planId: payload.planId
    });

    return NextResponse.json({
      success: true,
      accessToken: newAccessToken,
      expiresIn: 7200 // 2 horas
    });
    
  } catch (error) {
    console.error('❌ Error refrescando token:', error);
    
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
