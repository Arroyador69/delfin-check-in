/**
 * 🔐 API para verificar código de recuperación
 * 
 * Funcionalidades:
 * - Verifica código de recuperación
 * - Valida expiración del token
 * - No requiere autenticación (para usuarios sin sesión)
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, recoveryCode } = await req.json();
    
    // Validar entrada
    if (!email || !recoveryCode || typeof email !== 'string' || typeof recoveryCode !== 'string') {
      return NextResponse.json(
        { error: 'Datos requeridos', message: 'Email y código de recuperación son requeridos' },
        { status: 400 }
      );
    }

    if (recoveryCode.length !== 6) {
      return NextResponse.json(
        { error: 'Código inválido', message: 'El código debe tener 6 dígitos' },
        { status: 400 }
      );
    }

    // Buscar usuario y verificar código
    const userResult = await sql`
      SELECT 
        id,
        email,
        full_name,
        reset_token,
        reset_token_expires
      FROM tenant_users 
      WHERE email = ${email.toLowerCase()} 
        AND is_active = true
        AND reset_token = ${recoveryCode}
        AND reset_token_expires > NOW()
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Código inválido', message: 'Código de recuperación incorrecto o expirado' },
        { status: 401 }
      );
    }

    const user = userResult.rows[0];

    console.log(`✅ Código de recuperación verificado para usuario ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Código verificado correctamente',
      data: {
        userId: user.id,
        email: user.email,
        fullName: user.full_name
      }
    });

  } catch (error) {
    console.error('❌ Error verificando código de recuperación:', error);
    return NextResponse.json(
      { error: 'Error interno', message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
