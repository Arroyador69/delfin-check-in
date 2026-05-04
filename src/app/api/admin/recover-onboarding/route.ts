import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { sendOnboardingEmail } from '@/lib/mailer';
import { getTenantId } from '@/lib/tenant';

function resolveInternalAuth(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_ONBOARDING_RECOVER_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get('authorization');
  const bearer =
    authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  return !!bearer && bearer === secret;
}

async function assertCanActOnTenant(
  req: NextRequest,
  tenantId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  if (resolveInternalAuth(req)) {
    return { ok: true };
  }
  const jwtTenantId = await getTenantId(req);
  if (!jwtTenantId) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Autenticación requerida',
          message:
            'Inicia sesión como propietario del tenant o usa INTERNAL_ONBOARDING_RECOVER_SECRET en entorno seguro.',
        },
        { status: 401 }
      ),
    };
  }
  if (jwtTenantId !== tenantId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'No autorizado para este tenant' },
        { status: 403 }
      ),
    };
  }
  return { ok: true };
}

/**
 * Endpoint para recuperar el token de onboarding y reenviar el email
 * Útil cuando el email de onboarding no se recibió
 *
 * Opcional: `resetOnboardingFlow: true` — pone `tenants.onboarding_status` en `pending`
 * y fuerza un token nuevo, para volver a ver el flujo completo tras completarlo antes.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const emailRaw = body?.email;
    const resetOnboardingFlow = !!body?.resetOnboardingFlow;

    if (!emailRaw || typeof emailRaw !== 'string') {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      );
    }

    const email = emailRaw.trim().toLowerCase();

    // Buscar el tenant y usuario por email
    const result = await sql`
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        t.email,
        t.status,
        t.onboarding_status,
        tu.id as user_id,
        tu.reset_token,
        tu.reset_token_expires,
        tu.email_verified
      FROM tenants t
      JOIN tenant_users tu ON t.id = tu.tenant_id
      WHERE LOWER(TRIM(t.email)) = ${email}
        AND tu.role = 'owner'
      ORDER BY tu.created_at DESC
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró ningún tenant con ese email' },
        { status: 404 }
      );
    }

    const user = result.rows[0] as {
      tenant_id: string;
      tenant_name: string;
      email: string;
      status: string;
      onboarding_status: string | null;
      user_id: string;
      reset_token: string | null;
      reset_token_expires: Date | string | null;
      email_verified: boolean;
    };

    const gate = await assertCanActOnTenant(req, user.tenant_id);
    if (!gate.ok) {
      return gate.response;
    }

    if (resetOnboardingFlow) {
      await sql`
        UPDATE tenants
        SET onboarding_status = 'pending', updated_at = NOW()
        WHERE id = ${user.tenant_id}
      `;
    }

    // Si el token expiró o no existe, o forzamos reinicio del flujo, generar uno nuevo
    let onboardingToken = user.reset_token;
    let tokenExpiry = user.reset_token_expires;

    const needsNewToken =
      resetOnboardingFlow ||
      !onboardingToken ||
      !tokenExpiry ||
      new Date(tokenExpiry) < new Date();

    if (needsNewToken) {
      onboardingToken =
        Math.random().toString(36).slice(-32) +
        Math.random().toString(36).slice(-32);
      tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Válido por 24 horas

      await sql`
        UPDATE tenant_users 
        SET 
          reset_token = ${onboardingToken},
          reset_token_expires = ${tokenExpiry.toISOString()}
        WHERE id = ${user.user_id}
      `;
    }

    // Generar el URL de onboarding
    const onboardingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?token=${onboardingToken}&email=${encodeURIComponent(email)}`;

    // Reenviar el email de onboarding
    try {
      await sendOnboardingEmail({
        to: email,
        onboardingUrl,
        tenantId: user.tenant_id,
        // No podemos recuperar la contraseña temporal original, pero el usuario puede usar el magic link
      });

      return NextResponse.json({
        success: true,
        message: resetOnboardingFlow
          ? 'Onboarding reiniciado a pendiente y email reenviado'
          : 'Email de onboarding reenviado correctamente',
        onboardingUrl: onboardingUrl, // Solo para debugging, no debería exponerse en producción
        token: onboardingToken, // Solo para debugging
        resetOnboardingFlow,
        note: 'El usuario puede usar el magic link del email para acceder sin contraseña',
      });
    } catch (mailErr: any) {
      console.error('✉️ Error reenviando email de onboarding:', mailErr);

      // Aún así devolver el token para que el admin pueda ayudar manualmente
      return NextResponse.json(
        {
          success: false,
          error: 'Error enviando email, pero aquí está el token de onboarding',
          onboardingUrl: onboardingUrl,
          token: onboardingToken,
          emailError: mailErr.message,
          resetOnboardingFlow,
          note: 'Puedes compartir este URL con el usuario manualmente',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error recuperando onboarding:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint para obtener información del onboarding sin reenviar email
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const emailRaw = searchParams.get('email');

    if (!emailRaw) {
      return NextResponse.json(
        { error: 'Email es requerido como query parameter' },
        { status: 400 }
      );
    }

    const email = emailRaw.trim().toLowerCase();

    // Buscar el tenant y usuario por email
    const result = await sql`
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        t.email,
        t.status,
        t.plan_id,
        t.onboarding_status,
        tu.id as user_id,
        tu.reset_token,
        tu.reset_token_expires,
        tu.email_verified,
        tu.created_at
      FROM tenants t
      JOIN tenant_users tu ON t.id = tu.tenant_id
      WHERE LOWER(TRIM(t.email)) = ${email}
        AND tu.role = 'owner'
      ORDER BY tu.created_at DESC
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'No se encontró ningún tenant con ese email' },
        { status: 404 }
      );
    }

    const user = result.rows[0] as {
      tenant_id: string;
      tenant_name: string;
      email: string;
      status: string;
      plan_id: string;
      onboarding_status: string | null;
      user_id: string;
      reset_token: string | null;
      reset_token_expires: Date | string | null;
      email_verified: boolean;
    };

    const gate = await assertCanActOnTenant(req, user.tenant_id);
    if (!gate.ok) {
      return gate.response;
    }

    const hasValidToken =
      user.reset_token &&
      user.reset_token_expires &&
      new Date(user.reset_token_expires) > new Date();

    const onboardingUrl = hasValidToken
      ? `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?token=${user.reset_token}&email=${encodeURIComponent(email)}`
      : null;

    return NextResponse.json({
      success: true,
      tenant: {
        id: user.tenant_id,
        name: user.tenant_name,
        email: user.email,
        status: user.status,
        plan_id: user.plan_id,
        onboarding_status: user.onboarding_status,
      },
      onboarding: {
        hasToken: !!user.reset_token,
        tokenValid: hasValidToken,
        tokenExpires: user.reset_token_expires,
        emailVerified: user.email_verified,
        onboardingUrl: onboardingUrl,
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo información de onboarding:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}
