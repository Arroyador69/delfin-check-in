import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { sql } from '@/lib/db';

/**
 * 🔄 API PARA CAMBIAR NOMBRE DE USUARIO
 * 
 * Características:
 * - Autenticación requerida (JWT token)
 * - Actualiza full_name en tabla tenant_users
 * - Validación de entrada
 * - Logging de cambios
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

    const { newUsername } = await req.json();
    
    // Validaciones
    if (!newUsername || typeof newUsername !== 'string') {
      return NextResponse.json(
        { error: 'Username requerido', message: 'Debes proporcionar un nombre de usuario válido' },
        { status: 400 }
      );
    }

    if (newUsername.trim().length < 2) {
      return NextResponse.json(
        { error: 'Username muy corto', message: 'El nombre de usuario debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    }

    if (newUsername.trim().length > 50) {
      return NextResponse.json(
        { error: 'Username muy largo', message: 'El nombre de usuario no puede tener más de 50 caracteres' },
        { status: 400 }
      );
    }

    // Actualizar nombre de usuario en la base de datos
    const updateQuery = `
      UPDATE tenant_users 
      SET full_name = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3 AND is_active = true
      RETURNING full_name, email
    `;

    const result = await sql.query(updateQuery, [
      newUsername.trim(),
      payload.userId,
      payload.tenantId
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', message: 'No se pudo encontrar el usuario para actualizar' },
        { status: 404 }
      );
    }

    const updatedUser = result.rows[0];

    // Log del cambio
    console.log(`✅ Usuario ${payload.email} cambió su nombre de usuario a: ${newUsername.trim()}`);

    return NextResponse.json({
      success: true,
      message: 'Nombre de usuario actualizado exitosamente',
      data: {
        username: updatedUser.full_name,
        email: updatedUser.email
      }
    });

  } catch (error) {
    console.error('❌ Error al cambiar nombre de usuario:', error);
    return NextResponse.json(
      { error: 'Error interno', message: 'Error al actualizar el nombre de usuario' },
      { status: 500 }
    );
  }
}
