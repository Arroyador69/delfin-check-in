import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateTokenPair, AUTH_CONFIG } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * Intercambia token de onboarding por sesión (cookies auth_token + onboarding_status).
 * Se usa desde el enlace del email: /{locale}/onboarding?token=...&email=...
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body?.token;
    const email = body?.email;

    if (!token || typeof token !== 'string' || !email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'token y email son requeridos' },
        { status: 400 }
      );
    }

    // Validar token contra tenant_users.reset_token
    const result = await sql`
      SELECT
        t.id as tenant_id,
        t.name as tenant_name,
        t.plan_id,
        t.status as tenant_status,
        t.onboarding_status,
        tu.id as user_id,
        tu.email as user_email,
        tu.role,
        tu.is_active,
        tu.is_platform_admin,
        tu.reset_token,
        tu.reset_token_expires,
        tu.email_verified
      FROM tenants t
      JOIN tenant_users tu ON t.id = tu.tenant_id
      WHERE t.email = ${email.toLowerCase()}
        AND tu.reset_token = ${token}
        AND tu.reset_token_expires > NOW()
        AND tu.is_active = true
      ORDER BY tu.created_at DESC
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Token inválido o expirado' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    if (!['trial', 'active'].includes(row.tenant_status)) {
      return NextResponse.json(
        { success: false, error: 'La cuenta no está activa' },
        { status: 403 }
      );
    }

    // Generar sesión JWT
    const { accessToken, refreshToken } = generateTokenPair({
      userId: String(row.user_id),
      tenantId: String(row.tenant_id),
      email: String(row.user_email),
      role: row.role,
      isPlatformAdmin: row.is_platform_admin || false,
      tenantName: row.tenant_name,
      planId: row.plan_id
    });

    // Marcar token como usado (evita reuso); no dependemos de email_verified.
    await sql`
      UPDATE tenant_users
      SET
        email_verified = true,
        reset_token = NULL,
        reset_token_expires = NULL,
        updated_at = NOW()
      WHERE id = ${row.user_id}
    `;

    const isProduction = process.env.NODE_ENV === 'production';
    const res = NextResponse.json({ success: true });

    res.cookies.set(AUTH_CONFIG.cookieName, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 2,
      path: '/',
    });

    res.cookies.set(AUTH_CONFIG.refreshCookieName, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/api/auth',
    });

    // Cookie para gating en middleware Edge
    res.cookies.set('onboarding_status', row.onboarding_status || 'pending', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return res;
  } catch (error: any) {
    console.error('❌ Error en onboarding/login:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

