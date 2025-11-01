import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { sql } from '@/lib/db';
export const runtime = 'nodejs';

/**
 * 👤 API PARA OBTENER DATOS DEL USUARIO AUTENTICADO
 * 
 * Características:
 * - Autenticación requerida (JWT token)
 * - Devuelve datos del usuario desde la BD
 * - Información sensible filtrada
 */

export async function GET(req: NextRequest) {
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

    // Obtener datos del usuario desde la base de datos
    const userQuery = `
      SELECT 
        tu.id,
        tu.email,
        tu.full_name,
        tu.role,
        tu.is_active,
        tu.email_verified,
        tu.last_login,
        tu.recovery_email,
        tu.is_platform_admin,
        t.name as tenant_name,
        t.plan_id
      FROM tenant_users tu
      JOIN tenants t ON tu.tenant_id = t.id
      WHERE tu.id = $1 AND tu.tenant_id = $2 AND tu.is_active = true
    `;

    const result = await sql.query(userQuery, [payload.userId, payload.tenantId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Usuario no encontrado', message: 'No se pudo encontrar el usuario' },
        { status: 404 }
      );
    }

    const user = result.rows[0];

    // Devolver datos del usuario (sin información sensible)
    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.full_name,
        role: user.role,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        lastLogin: user.last_login,
        tenantName: user.tenant_name,
        planId: user.plan_id,
        isPlatformAdmin: user.is_platform_admin || false,
        recoveryEmail: user.recovery_email || user.email // Usar recovery_email si existe, sino el email principal
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener datos del usuario:', error);
    return NextResponse.json(
      { error: 'Error interno', message: 'Error al obtener los datos del usuario' },
      { status: 500 }
    );
  }
}
