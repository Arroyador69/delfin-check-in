import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyPassword, hashPassword } from '@/lib/auth';
import { sql } from '@/lib/db';

/**
 * 🔐 API PARA CAMBIAR CONTRASEÑA
 * 
 * Características:
 * - Autenticación requerida (JWT token)
 * - Verificación de contraseña actual con bcrypt
 * - Hash de nueva contraseña con bcrypt
 * - Actualización en tabla tenant_users
 * - Validación de seguridad
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

    const { currentPassword, newPassword } = await req.json();
    
    // Validaciones
    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { error: 'Contraseña actual requerida', message: 'Debes proporcionar tu contraseña actual' },
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

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'Contraseña duplicada', message: 'La nueva contraseña debe ser diferente a la actual' },
        { status: 400 }
      );
    }

    // Obtener datos del usuario actual
    const userQuery = `
      SELECT id, email, password_hash, full_name
      FROM tenant_users 
      WHERE id = $1 AND tenant_id = $2 AND is_active = true
    `;

    const userResult = await sql.query(userQuery, [payload.userId, payload.tenantId]);

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', message: 'No se pudo encontrar el usuario' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Verificar contraseña actual
    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Contraseña incorrecta', message: 'La contraseña actual no es correcta' },
        { status: 400 }
      );
    }

    // Hash de la nueva contraseña
    const newPasswordHash = await hashPassword(newPassword);

    // Actualizar contraseña en la base de datos
    const updateQuery = `
      UPDATE tenant_users 
      SET password_hash = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3 AND is_active = true
      RETURNING email, full_name
    `;

    const result = await sql.query(updateQuery, [
      newPasswordHash,
      payload.userId,
      payload.tenantId
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Error al actualizar', message: 'No se pudo actualizar la contraseña' },
        { status: 500 }
      );
    }

    const updatedUser = result.rows[0];

    // Log del cambio (sin mostrar la contraseña)
    console.log(`✅ Usuario ${payload.email} cambió su contraseña exitosamente`);

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      data: {
        email: updatedUser.email,
        username: updatedUser.full_name
      }
    });

  } catch (error) {
    console.error('❌ Error al cambiar contraseña:', error);
    return NextResponse.json(
      { error: 'Error interno', message: 'Error al actualizar la contraseña' },
      { status: 500 }
    );
  }
}