import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { generateTokenPair, AUTH_CONFIG, verifyToken } from '@/lib/auth';
import { effectivePlatformAdmin } from '@/lib/platform-owner';
import {
  ensureOnboardingMagicTokenSchema,
  findOnboardingOwnerByEmail,
} from '@/lib/onboarding-magic-link';

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

    const emailNorm = email.trim().toLowerCase();
    await ensureOnboardingMagicTokenSchema();

    let row: Record<string, unknown> | undefined;

    const tokenResult = await sql`
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
        tu.email_verified
      FROM tenants t
      JOIN tenant_users tu ON t.id = tu.tenant_id
      WHERE tu.role = 'owner'
        AND tu.is_active = true
        AND (
          LOWER(TRIM(t.email)) = ${emailNorm}
          OR LOWER(TRIM(tu.email)) = ${emailNorm}
        )
        AND (
          (tu.onboarding_magic_token = ${token} AND tu.onboarding_magic_token_expires > NOW())
          OR (
            tu.onboarding_magic_token IS NULL
            AND tu.reset_token = ${token}
            AND tu.reset_token_expires > NOW()
            AND length(tu.reset_token) >= 32
          )
        )
      ORDER BY tu.created_at DESC
      LIMIT 1
    `;

    if (tokenResult.rows.length > 0) {
      row = tokenResult.rows[0] as Record<string, unknown>;
    } else {
      // Enlace ya usado o expirado: si ya hay sesión válida del mismo email, continuar sin error.
      const authToken = req.cookies.get(AUTH_CONFIG.cookieName)?.value;
      if (authToken) {
        const payload = verifyToken(authToken);
        if (payload?.email?.toLowerCase() === emailNorm && payload.tenantId) {
          const owner = await findOnboardingOwnerByEmail(emailNorm);
          if (owner && ['trial', 'active'].includes(owner.status)) {
            const planRow = await sql`SELECT plan_id FROM tenants WHERE id = ${owner.tenant_id} LIMIT 1`;
            row = {
              tenant_id: owner.tenant_id,
              tenant_name: owner.tenant_name,
              plan_id: planRow.rows[0]?.plan_id ?? null,
              tenant_status: owner.status,
              onboarding_status: owner.onboarding_status,
              user_id: owner.user_id,
              user_email: owner.user_email,
              role: 'owner',
              is_active: true,
              is_platform_admin: false,
            };
          }
        }
      }
    }

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Token inválido o expirado', code: 'ONBOARDING_TOKEN_INVALID' },
        { status: 404 }
      );
    }

    if (!['trial', 'active'].includes(String(row.tenant_status))) {
      return NextResponse.json(
        { success: false, error: 'La cuenta no está activa' },
        { status: 403 }
      );
    }

    const { accessToken, refreshToken } = generateTokenPair({
      userId: String(row.user_id),
      tenantId: String(row.tenant_id),
      email: String(row.user_email),
      role: row.role as 'owner' | 'admin' | 'staff',
      isPlatformAdmin: effectivePlatformAdmin(
        Boolean(row.is_platform_admin),
        String(row.user_email)
      ),
      tenantName: String(row.tenant_name),
      planId: row.plan_id as string | null,
    });

    // No borrar reset_token aquí: el usuario puede recargar o abrir el enlace dos veces.
    // Se invalida al cambiar la contraseña o al completar el onboarding.
    await sql`
      UPDATE tenant_users
      SET email_verified = true, updated_at = NOW()
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

    res.cookies.set('onboarding_status', String(row.onboarding_status || 'pending'), {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return res;
  } catch (error: unknown) {
    console.error('❌ Error en onboarding/login:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
