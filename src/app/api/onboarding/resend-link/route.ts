import { NextRequest, NextResponse } from 'next/server';
import { sendOnboardingEmail } from '@/lib/mailer';
import {
  buildOnboardingUrl,
  findOnboardingOwnerByEmail,
  issueFreshOnboardingToken,
} from '@/lib/onboarding-magic-link';

export const runtime = 'nodejs';

/**
 * Reenvío público del enlace de onboarding (sin auth).
 * - Respuesta genérica (no revela si el email existe).
 * - Solo cuentas con onboarding pendiente; al reenviar se invalida el enlace anterior (uno activo).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const emailRaw = body?.email;
    if (!emailRaw || typeof emailRaw !== 'string' || !emailRaw.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Introduce un email válido' },
        { status: 400 }
      );
    }

    const email = emailRaw.trim().toLowerCase();
    if (email.length > 254) {
      return NextResponse.json({ success: false, error: 'Email no válido' }, { status: 400 });
    }
    const locale =
      typeof body?.locale === 'string' && body.locale.length === 2 ? body.locale : 'es';

    const owner = await findOnboardingOwnerByEmail(email);

    const genericOk = {
      success: true,
      message:
        'Si tu cuenta está pendiente de activación, recibirás un nuevo email en unos minutos. Revisa spam y promociones.',
    };

    if (
      !owner ||
      !['trial', 'active'].includes(owner.status) ||
      owner.onboarding_status === 'completed'
    ) {
      return NextResponse.json(genericOk);
    }

    // Un solo enlace válido: el nuevo sustituye al anterior en base de datos.
    const { token } = await issueFreshOnboardingToken(owner.user_id);
    const onboardingUrl = buildOnboardingUrl(token, email, locale);

    try {
      await sendOnboardingEmail({
        to: email,
        onboardingUrl,
        tenantId: owner.tenant_id,
        variant: 'web_plan_paid',
        locale,
      });
    } catch (mailErr) {
      console.error('resend-link: error enviando email', mailErr);
    }

    return NextResponse.json(genericOk);
  } catch (error) {
    console.error('resend-link:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo procesar la solicitud' },
      { status: 500 }
    );
  }
}
