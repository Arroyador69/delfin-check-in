import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * API para verificar el token de onboarding
 * Valida que el token existe y no ha expirado
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Token y email son requeridos' },
        { status: 400 }
      );
    }

    // Buscar el tenant por email y verificar que tiene un token de onboarding
    const result = await sql`
      SELECT 
        t.*,
        tu.reset_token,
        tu.reset_token_expires,
        tu.email_verified
      FROM tenants t
      JOIN tenant_users tu ON t.id = tu.tenant_id
      WHERE t.email = ${email} 
        AND tu.reset_token = ${token}
        AND tu.reset_token_expires > NOW()
        AND tu.email_verified = false
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Token inválido, expirado o ya utilizado' },
        { status: 404 }
      );
    }

    const tenant = result.rows[0];

    // Verificar que el tenant está en estado 'trial' o 'active'
    if (!['trial', 'active'].includes(tenant.status)) {
      return NextResponse.json(
        { error: 'La cuenta no está activa' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        plan_id: tenant.plan_id,
        status: tenant.status,
        config: tenant.config
      }
    });

  } catch (error) {
    console.error('Error verificando token de onboarding:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
