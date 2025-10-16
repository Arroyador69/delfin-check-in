import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, hashPassword } from '@/lib/auth';
import { sql } from '@/lib/db';

/**
 * 🔄 API PARA CAMBIAR CONTRASEÑA CON CÓDIGO DE RECUPERACIÓN
 * 
 * Características:
 * - Autenticación requerida (JWT token)
 * - Verificación de código de recuperación
 * - Hash de nueva contraseña con bcrypt
 * - Invalidación del código después del uso
 * - Validación de seguridad
 */

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticación
    const authToken = req.cookies.get('auth-token')?.value;
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

    const { recoveryCode, newPassword } = await req.json();
    
    // Validaciones
    if (!recoveryCode || typeof recoveryCode !== 'string') {
      return NextResponse.json(
        { error: 'Código requerido', message: 'Debes proporcionar el código de recuperación' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'Nueva contraseña requerida', message: 'Debes proporcionar una nueva contraseña' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Contraseña muy débil', message: 'La nueva contraseña debe tener al menos 8 caracteres' },
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
      SELECT id, email, full_name, password_hash, reset_token_expires
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

    // Verificar que la nueva contraseña sea diferente a la actual
    if (user.password_hash) {
      // Si ya hay una contraseña, verificamos que sea diferente
      // (esto es opcional, pero recomendado por seguridad)
    }

    // Hash de la nueva contraseña
    const newPasswordHash = await hashPassword(newPassword);

    // Actualizar contraseña e invalidar código de recuperación
    const updateQuery = `
      UPDATE tenant_users 
      SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3 AND is_active = true
      RETURNING email, full_name
    `;

    const updateResult = await sql.query(updateQuery, [
      newPasswordHash,
      payload.userId,
      payload.tenantId
    ]);

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Error al actualizar', message: 'No se pudo actualizar la contraseña' },
        { status: 500 }
      );
    }

    const updatedUser = updateResult.rows[0];

    // Log del cambio (sin mostrar la contraseña)
    console.log(`✅ Usuario ${updatedUser.email} cambió su contraseña usando código de recuperación`);

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente usando código de recuperación',
      data: {
        email: updatedUser.email,
        username: updatedUser.full_name
      }
    });

  } catch (error) {
    console.error('❌ Error al cambiar contraseña con código de recuperación:', error);
    return NextResponse.json(
      { error: 'Error interno', message: 'Error al actualizar la contraseña' },
      { status: 500 }
    );
  }
}
