/**
 * 🔐 API para actualizar email de recuperación
 * 
 * Funcionalidades:
 * - Actualiza recovery_email en tabla tenant_users
 * - Validación de entrada
 * - Verificación de autenticación
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyTokenServer } from '@/lib/auth';

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

    const payload = verifyTokenServer(authToken);
    if (!payload || !payload.userId || !payload.tenantId) {
      return NextResponse.json(
        { error: 'Token inválido', message: 'Token de autenticación inválido o expirado' },
        { status: 401 }
      );
    }

    // Obtener datos del cuerpo de la petición
    const { recoveryEmail } = await req.json();
    
    // Validar entrada
    if (!recoveryEmail || typeof recoveryEmail !== 'string' || recoveryEmail.trim().length === 0) {
      return NextResponse.json(
        { error: 'Email requerido', message: 'El email de recuperación es requerido' },
        { status: 400 }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recoveryEmail.trim())) {
      return NextResponse.json(
        { error: 'Email inválido', message: 'El formato del email no es válido' },
        { status: 400 }
      );
    }

    // Actualizar email de recuperación en la base de datos
    const result = await sql`
      UPDATE tenant_users 
      SET recovery_email = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3 AND is_active = true
      RETURNING email, full_name, recovery_email
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', message: 'No se pudo encontrar el usuario' },
        { status: 404 }
      );
    }

    const updatedUser = result.rows[0];

    console.log(`✅ Usuario ${updatedUser.email} actualizó su email de recuperación a ${recoveryEmail.trim()}`);

    return NextResponse.json({
      success: true,
      message: 'Email de recuperación actualizado exitosamente',
      data: {
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        recoveryEmail: updatedUser.recovery_email
      }
    });

  } catch (error) {
    console.error('❌ Error al actualizar email de recuperación:', error);
    return NextResponse.json(
      { error: 'Error interno', message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
