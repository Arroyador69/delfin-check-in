import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getClientIP, rateLimitMiddleware, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

/**
 * 🔍 API PARA VERIFICAR CÓDIGO DE RECUPERACIÓN
 * 
 * Características:
 * - Verifica que el código de recuperación sea válido
 * - No requiere autenticación previa
 * - Valida que el código no haya expirado
 */

export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req.headers);
  const rl = rateLimitMiddleware(clientIP, RATE_LIMIT_CONFIGS.login);
  if (rl) return rl;

  try {
    const { email, recoveryCode } = await req.json();
    
    // Validaciones
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email requerido', message: 'Debes proporcionar el email' },
        { status: 400 }
      );
    }

    if (!recoveryCode || typeof recoveryCode !== 'string') {
      return NextResponse.json(
        { error: 'Código requerido', message: 'Debes proporcionar el código de recuperación' },
        { status: 400 }
      );
    }

    if (recoveryCode.length !== 6 || !/^\d{6}$/.test(recoveryCode)) {
      return NextResponse.json(
        { error: 'Código inválido', message: 'El código debe tener 6 dígitos' },
        { status: 400 }
      );
    }

    // Verificar código y obtener usuario
    const verifyQuery = `
      SELECT id, email, full_name, reset_token_expires
      FROM tenant_users 
      WHERE email = $1 AND is_active = true
      AND reset_token = $2 AND reset_token_expires > NOW()
    `;

    const result = await sql.query(verifyQuery, [email, recoveryCode]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Código inválido', message: 'El código de recuperación no es válido o ha expirado' },
        { status: 400 }
      );
    }

    const user = result.rows[0];

    return NextResponse.json({
      success: true,
      message: 'Código verificado correctamente',
      user: {
        email: user.email,
        fullName: user.full_name
      }
    });

  } catch (error) {
    console.error('❌ Error verificando código de recuperación:', error);
    return NextResponse.json(
      { error: 'Error interno', message: 'Error verificando el código de recuperación' },
      { status: 500 }
    );
  }
}