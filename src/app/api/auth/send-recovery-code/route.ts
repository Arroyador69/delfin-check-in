import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { sql } from '@/lib/db';

/**
 * 📧 API PARA ENVIAR CÓDIGO DE RECUPERACIÓN
 * 
 * Características:
 * - Autenticación requerida (JWT token)
 * - Genera código de 6 dígitos
 * - Guarda código en BD con expiración
 * - Envía email (simulado por ahora)
 * - Rate limiting para evitar spam
 */

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const authToken = req.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json(
        { error: 'No autorizado', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const payload = verifyToken(authToken);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido', message: 'Token de autenticación expirado o inválido' },
        { status: 401 }
      );
    }

    const { recoveryEmail } = await req.json();
    
    // Validaciones
    if (!recoveryEmail || typeof recoveryEmail !== 'string') {
      return NextResponse.json(
        { error: 'Email requerido', message: 'Debes proporcionar un email de recuperación' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recoveryEmail)) {
      return NextResponse.json(
        { error: 'Email inválido', message: 'El formato del email no es válido' },
        { status: 400 }
      );
    }

    // Verificar que no hay un código pendiente reciente (rate limiting)
    const existingCodeQuery = `
      SELECT reset_token, reset_token_expires
      FROM tenant_users 
      WHERE id = $1 AND tenant_id = $2 AND is_active = true
      AND reset_token_expires > NOW()
    `;

    const existingResult = await sql.query(existingCodeQuery, [payload.userId, payload.tenantId]);

    if (existingResult.rows.length > 0) {
      const existingCode = existingResult.rows[0];
      const timeLeft = Math.ceil((new Date(existingCode.reset_token_expires).getTime() - Date.now()) / 1000 / 60);
      
      return NextResponse.json(
        { 
          error: 'Código pendiente', 
          message: `Ya tienes un código de recuperación activo. Espera ${timeLeft} minutos antes de solicitar otro.` 
        },
        { status: 429 }
      );
    }

    // Generar código de 6 dígitos
    const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Calcular expiración (15 minutos)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Actualizar usuario con código de recuperación
    const updateQuery = `
      UPDATE tenant_users 
      SET reset_token = $1, reset_token_expires = $2, updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4 AND is_active = true
      RETURNING email, full_name
    `;

    const result = await sql.query(updateQuery, [
      recoveryCode,
      expiresAt,
      payload.userId,
      payload.tenantId
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', message: 'No se pudo encontrar el usuario' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    // TODO: Aquí se implementaría el envío real de email
    // Por ahora, solo loggeamos el código (en producción NUNCA hacer esto)
    console.log(`📧 Código de recuperación para ${user.email}: ${recoveryCode}`);
    console.log(`⏰ Expira en: ${expiresAt.toISOString()}`);

    // En producción, aquí enviarías el email real:
    // await sendRecoveryEmail(recoveryEmail, recoveryCode, user.full_name);

    return NextResponse.json({
      success: true,
      message: `Código de recuperación enviado a ${recoveryEmail}`,
      data: {
        email: recoveryEmail,
        expiresIn: 15, // minutos
        // En desarrollo, mostrar el código (REMOVER EN PRODUCCIÓN)
        developmentCode: process.env.NODE_ENV === 'development' ? recoveryCode : undefined
      }
    });

  } catch (error) {
    console.error('❌ Error al enviar código de recuperación:', error);
    return NextResponse.json(
      { error: 'Error interno', message: 'Error al enviar el código de recuperación' },
      { status: 500 }
    );
  }
}

/**
 * 🔍 API PARA VERIFICAR CÓDIGO DE RECUPERACIÓN
 */
export async function PUT(req: NextRequest) {
  try {
    // Verificar autenticación
    const authToken = req.cookies.get('auth_token')?.value;
    if (!authToken) {
      return NextResponse.json(
        { error: 'No autorizado', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const payload = verifyToken(authToken);
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido', message: 'Token de autenticación expirado o inválido' },
        { status: 401 }
      );
    }

    const { recoveryCode } = await req.json();
    
    // Validaciones
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

    // Verificar código en la base de datos
    const verifyQuery = `
      SELECT id, email, full_name, reset_token_expires
      FROM tenant_users 
      WHERE id = $1 AND tenant_id = $2 AND is_active = true
      AND reset_token = $3 AND reset_token_expires > NOW()
    `;

    const result = await sql.query(verifyQuery, [payload.userId, payload.tenantId, recoveryCode]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Código inválido', message: 'El código de recuperación no es válido o ha expirado' },
        { status: 400 }
      );
    }

    const user = result.rows[0];

    // Log de verificación exitosa
    console.log(`✅ Usuario ${user.email} verificó código de recuperación correctamente`);

    return NextResponse.json({
      success: true,
      message: 'Código de recuperación verificado correctamente',
      data: {
        email: user.email,
        username: user.full_name,
        verified: true
      }
    });

  } catch (error) {
    console.error('❌ Error al verificar código de recuperación:', error);
    return NextResponse.json(
      { error: 'Error interno', message: 'Error al verificar el código de recuperación' },
      { status: 500 }
    );
  }
}
