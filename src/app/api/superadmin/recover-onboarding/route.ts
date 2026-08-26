import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdmin } from '@/lib/auth-superadmin';
import { sendOnboardingEmail } from '@/lib/mailer';
import {
  buildOnboardingUrl,
  findOnboardingOwnerByEmail,
  issueFreshOnboardingCredentials,
  onboardingEmailVariantForOwner,
} from '@/lib/onboarding-magic-link';
import { sql } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/superadmin/recover-onboarding
 * Regenera enlace + contraseña temporal y reenvía el email de activación.
 * Body: { email: string, resetOnboardingFlow?: boolean, locale?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { error } = await verifySuperAdmin(req);
    if (error) return error;

    const body = await req.json().catch(() => ({}));
    const emailRaw = body?.email;
    const resetOnboardingFlow = !!body?.resetOnboardingFlow;
    const locale =
      typeof body?.locale === 'string' && body.locale.length >= 2 ? String(body.locale).slice(0, 5) : 'es';

    if (!emailRaw || typeof emailRaw !== 'string' || !emailRaw.includes('@')) {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 });
    }

    const email = emailRaw.trim().toLowerCase();
    const owner = await findOnboardingOwnerByEmail(email);

    if (!owner) {
      return NextResponse.json(
        { error: 'No se encontró ningún tenant owner con ese email' },
        { status: 404 }
      );
    }

    if (resetOnboardingFlow) {
      await sql`
        UPDATE tenants
        SET onboarding_status = 'pending', updated_at = NOW()
        WHERE id = ${owner.tenant_id}
      `;
    }

    const { token, tempPassword } = await issueFreshOnboardingCredentials(owner.user_id);
    const onboardingUrl = buildOnboardingUrl(token, locale.startsWith('es') ? 'es' : locale.slice(0, 2));

    try {
      await sendOnboardingEmail({
        to: email,
        onboardingUrl,
        tempPassword,
        tenantId: owner.tenant_id,
        variant: onboardingEmailVariantForOwner(owner.plan_type),
        locale: locale.startsWith('es') ? 'es' : locale.slice(0, 2),
      });
    } catch (mailErr: any) {
      console.error('[superadmin/recover-onboarding] mail', mailErr);
      return NextResponse.json(
        {
          success: false,
          error: 'Credenciales regeneradas pero falló el envío del email',
          emailError: mailErr?.message || String(mailErr),
          onboardingUrl,
          tempPassword,
          resetOnboardingFlow,
          note: 'Puedes copiar el enlace y la contraseña temporal y enviárselos al cliente por otro canal.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: resetOnboardingFlow
        ? 'Onboarding reiniciado y email reenviado con nueva contraseña temporal'
        : 'Email de onboarding reenviado con nueva contraseña temporal',
      email,
      tenantId: owner.tenant_id,
      onboardingStatus: resetOnboardingFlow ? 'pending' : owner.onboarding_status,
      onboardingUrl,
      tempPassword,
      resetOnboardingFlow,
    });
  } catch (e: any) {
    console.error('[superadmin/recover-onboarding]', e);
    return NextResponse.json(
      { error: e?.message || 'Error interno' },
      { status: 500 }
    );
  }
}
