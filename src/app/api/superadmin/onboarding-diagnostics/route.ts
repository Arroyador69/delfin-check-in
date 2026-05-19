import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { isEffectiveSuperAdminPayload } from '@/lib/platform-owner';
import { sql } from '@/lib/db';
import {
  buildOnboardingUrl,
  ensureOnboardingMagicTokenSchema,
} from '@/lib/onboarding-magic-link';

/**
 * GET /api/superadmin/onboarding-diagnostics?email=
 * Estado del magic link de onboarding (sin exponer el token completo).
 */
export async function GET(req: NextRequest) {
  const authToken = req.cookies.get('auth_token')?.value;
  if (!authToken) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  const payload = verifyToken(authToken);
  if (!payload || !isEffectiveSuperAdminPayload(payload)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const emailRaw = req.nextUrl.searchParams.get('email');
  if (!emailRaw?.includes('@')) {
    return NextResponse.json({ error: 'Parámetro email requerido' }, { status: 400 });
  }

  await ensureOnboardingMagicTokenSchema();
  const email = emailRaw.trim().toLowerCase();

  const r = await sql`
    SELECT
      t.id::text AS tenant_id,
      t.name,
      t.email AS tenant_email,
      t.status,
      t.onboarding_status,
      tu.id::text AS user_id,
      tu.email AS user_email,
      tu.onboarding_magic_token,
      tu.onboarding_magic_token_expires,
      tu.reset_token,
      tu.reset_token_expires,
      tu.email_verified
    FROM tenants t
    JOIN tenant_users tu ON t.id = tu.tenant_id
    WHERE tu.role = 'owner' AND tu.is_active = true
      AND (
        LOWER(TRIM(t.email)) = ${email}
        OR LOWER(TRIM(tu.email)) = ${email}
      )
    ORDER BY tu.created_at DESC
    LIMIT 1
  `;

  if (!r.rows.length) {
    return NextResponse.json({ found: false, email }, { status: 404 });
  }

  const row = r.rows[0] as Record<string, unknown>;
  const magic = row.onboarding_magic_token as string | null;
  const magicExp = row.onboarding_magic_token_expires as string | Date | null;
  const legacy = row.reset_token as string | null;
  const legacyExp = row.reset_token_expires as string | Date | null;

  const magicValid =
    !!magic && !!magicExp && new Date(magicExp) > new Date();
  const legacyValid =
    !!legacy &&
    !!legacyExp &&
    new Date(legacyExp) > new Date() &&
    legacy.length >= 32;

  const activeToken = magicValid ? magic : legacyValid ? legacy : null;

  return NextResponse.json({
    found: true,
    email,
    tenant: {
      id: row.tenant_id,
      name: row.name,
      email: row.tenant_email,
      status: row.status,
      onboarding_status: row.onboarding_status,
    },
    user: {
      id: row.user_id,
      email: row.user_email,
      email_verified: row.email_verified,
    },
    magicLink: {
      hasDedicatedToken: !!magic,
      dedicatedValid: magicValid,
      dedicatedExpires: magicExp,
      hasLegacyToken: !!legacy && legacy.length >= 32,
      legacyValid,
      legacyExpires: legacyExp,
      /** Si recovery de contraseña pisó reset_token con código numérico corto */
      resetTokenLooksLikeRecoveryCode:
        !!legacy && legacy.length < 32 && /^\d+$/.test(legacy),
      canActivate: magicValid || legacyValid,
      sampleUrl: activeToken
        ? buildOnboardingUrl(activeToken, email, 'es')
        : null,
    },
  });
}
