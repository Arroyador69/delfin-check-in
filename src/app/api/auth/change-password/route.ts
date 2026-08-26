import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, verifyPassword, hashPassword } from '@/lib/auth';
import { sql } from '@/lib/db';

/**
 * 🔐 API PARA CAMBIAR CONTRASEÑA
 *
 * - Autenticación JWT requerida
 * - En onboarding pendiente/en curso se puede omitir la contraseña actual
 *   (el usuario ya autenticó vía magic link o login)
 * - Trim de espacios al pegar
 */

function normalizePassword(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(req: NextRequest) {
  try {
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

    const body = await req.json().catch(() => ({}));
    const currentPassword = normalizePassword(body?.currentPassword);
    const newPassword = normalizePassword(body?.newPassword);
    const skipCurrentIfOnboarding = body?.skipCurrentIfOnboarding === true;

    if (!newPassword) {
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

    const userResult = await sql`
      SELECT
        tu.id,
        tu.email,
        tu.password_hash,
        tu.full_name,
        t.onboarding_status
      FROM tenant_users tu
      JOIN tenants t ON t.id = tu.tenant_id
      WHERE tu.id = ${payload.userId}
        AND tu.tenant_id = ${payload.tenantId}
        AND tu.is_active = true
      LIMIT 1
    `;

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', message: 'No se pudo encontrar el usuario' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0] as {
      id: string;
      email: string;
      password_hash: string;
      full_name: string | null;
      onboarding_status: string | null;
    };

    const onboardingOpen =
      user.onboarding_status === 'pending' || user.onboarding_status === 'in_progress';
    const canSkipCurrent = skipCurrentIfOnboarding && onboardingOpen;

    if (!canSkipCurrent) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Contraseña actual requerida', message: 'Debes proporcionar tu contraseña actual' },
          { status: 400 }
        );
      }

      if (currentPassword === newPassword) {
        return NextResponse.json(
          { error: 'Contraseña duplicada', message: 'La nueva contraseña debe ser diferente a la actual' },
          { status: 400 }
        );
      }

      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          {
            error: 'Contraseña incorrecta',
            message: 'La contraseña actual no es correcta',
            code: 'CURRENT_PASSWORD_INVALID',
            canResendOnboarding: onboardingOpen,
          },
          { status: 400 }
        );
      }
    } else if (currentPassword && currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'Contraseña duplicada', message: 'La nueva contraseña debe ser diferente a la temporal' },
        { status: 400 }
      );
    }

    const newPasswordHash = await hashPassword(newPassword);

    const result = await sql`
      UPDATE tenant_users
      SET password_hash = ${newPasswordHash},
          reset_token = NULL,
          reset_token_expires = NULL,
          onboarding_magic_token = NULL,
          onboarding_magic_token_expires = NULL,
          updated_at = NOW()
      WHERE id = ${payload.userId}
        AND tenant_id = ${payload.tenantId}
        AND is_active = true
      RETURNING email, full_name
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Error al actualizar', message: 'No se pudo actualizar la contraseña' },
        { status: 500 }
      );
    }

    const updatedUser = result.rows[0] as { email: string; full_name: string | null };

    console.log(`✅ Usuario ${payload.email} cambió su contraseña exitosamente`);

    return NextResponse.json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      data: {
        email: updatedUser.email,
        username: updatedUser.full_name,
      },
    });
  } catch (error) {
    console.error('❌ Error al cambiar contraseña:', error);
    return NextResponse.json(
      { error: 'Error interno', message: 'Error al actualizar la contraseña' },
      { status: 500 }
    );
  }
}
