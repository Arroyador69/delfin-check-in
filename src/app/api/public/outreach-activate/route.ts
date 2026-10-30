import { NextRequest, NextResponse } from 'next/server';
import { signupFreeActivate } from '@/lib/signup-free-activate';
import { decodeOptOutEmail } from '@/lib/public-owner-leads/optout';
import { verifyOutreachActivateSignature } from '@/lib/public-owner-leads/activate-link';
import { ONBOARDING_OUTREACH_COOKIE } from '@/lib/onboarding-outreach';
import {
  buildOnboardingUrl,
  findOnboardingOwnerByEmail,
  issueFreshOnboardingCredentials,
} from '@/lib/onboarding-magic-link';
import { sendOnboardingEmail } from '@/lib/mailer';
import { markPublicOwnerLeadSignedUp } from '@/lib/public-owner-leads/attribution';

export const runtime = 'nodejs';

function htmlPage(title: string, body: string, ok: boolean): NextResponse {
  const color = ok ? '#0284c7' : '#b91c1c';
  const doc = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} · Delfín Check-in</title>
  <style>
    body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fbff;color:#0f172a;}
    .wrap{max-width:440px;margin:0 auto;padding:48px 20px;}
    .card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px 24px;box-shadow:0 8px 30px rgba(15,23,42,.06);}
    h1{font-size:1.35rem;margin:0 0 12px;color:${color};}
    p{line-height:1.55;margin:0 0 12px;font-size:1rem;}
    a.btn{display:inline-block;margin-top:8px;background:#0284c7;color:#fff;text-decoration:none;font-weight:700;padding:14px 20px;border-radius:10px;font-size:1.05rem;}
    a.btn-secondary{display:inline-block;margin-top:10px;color:#0284c7;font-weight:600;text-decoration:underline;}
    .fine{font-size:.85rem;color:#64748b;}
    .email{word-break:break-all;font-weight:600;}
  </style>
</head>
<body>
  <div class="wrap"><div class="card">
    <p style="margin:0 0 8px;font-weight:700;color:#0ea5e9;">Delfín Check-in</p>
    <h1>${title}</h1>
    ${body}
  </div></div>
</body>
</html>`;
  return new NextResponse(doc, {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

/** Reemite magic link + email si ya tenía cuenta (onboarding a medias / “sin registro”). */
async function resumeOnboardingRedirect(email: string): Promise<string | null> {
  const owner = await findOnboardingOwnerByEmail(email);
  if (!owner?.user_id) return null;

  const { token, tempPassword } = await issueFreshOnboardingCredentials(owner.user_id);
  const onboardingUrl = buildOnboardingUrl(token, 'es', { src: 'outreach' });

  try {
    await sendOnboardingEmail({
      to: email,
      onboardingUrl,
      tempPassword,
      tenantId: owner.tenant_id,
      variant: 'waitlist_launch',
      locale: 'es',
    });
  } catch (e) {
    console.warn('[outreach-activate] resume email:', e);
  }

  void markPublicOwnerLeadSignedUp({ email, tenantId: owner.tenant_id });
  return onboardingUrl;
}

/**
 * GET 1-clic desde mail outreach:
 * alta FREE → redirect inmediato al onboarding (email ya asociado).
 * No depender del correo para “entrar”: el CTA del mail te deja dentro.
 */
export async function GET(req: NextRequest) {
  const e = req.nextUrl.searchParams.get('e') || '';
  const s = req.nextUrl.searchParams.get('s') || '';
  const expRaw = req.nextUrl.searchParams.get('exp') || '';
  const exp = Number(expRaw);

  const email = decodeOptOutEmail(e);
  if (!email || !email.includes('@') || !Number.isFinite(exp)) {
    return htmlPage(
      'Enlace no válido',
      '<p>Este enlace de prueba gratis no es válido. Escribe a <a href="mailto:soporte@delfincheckin.com">soporte@delfincheckin.com</a>.</p>',
      false
    );
  }

  if (!verifyOutreachActivateSignature(email, exp, s)) {
    return htmlPage(
      'Enlace caducado o no válido',
      `<p>Pide un enlace nuevo o regístrate en
        <a href="https://delfincheckin.com/parte-viajeros/?email=${encodeURIComponent(email)}#empezar">parte-viajeros</a>
        (sigue siendo gratis, sin tarjeta).</p>`,
      false
    );
  }

  try {
    const activateRes = await signupFreeActivate({
      email,
      name: null,
      source: 'owner_outreach_one_click',
      notes: 'outreach-activate-1click',
      locale: 'es',
      req,
      bodyExtra: { ref: 'owner_outreach', one_click: true },
    });

    const data = (await activateRes.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      alreadyActivated?: boolean;
      onboarding_url?: string;
    };

    let onboardingUrl =
      typeof data.onboarding_url === 'string' && data.onboarding_url.startsWith('http')
        ? data.onboarding_url
        : '';

    // Ya tenía cuenta / onboarding a medias → reemitir enlace y entrar igual
    if (
      !onboardingUrl &&
      (data.alreadyActivated ||
        activateRes.status === 400 ||
        /ya (tiene|está|está registrado)/i.test(String(data.error || '')))
    ) {
      onboardingUrl = (await resumeOnboardingRedirect(email)) || '';
    }

    // Alta 1-clic: forzar onboarding ligero aunque el activate no trajera src=
    if (onboardingUrl && !/[?&]src=outreach(?:&|$)/.test(onboardingUrl)) {
      onboardingUrl += onboardingUrl.includes('?') ? '&src=outreach' : '?src=outreach';
    }

    if (onboardingUrl) {
      const res = NextResponse.redirect(onboardingUrl, 302);
      res.cookies.set(ONBOARDING_OUTREACH_COOKIE, '1', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
      return res;
    }

    if (activateRes.status === 200 || data.success) {
      return htmlPage(
        '¡Listo! Revisa tu correo',
        `<p>Cuenta creada para <span class="email">${email}</span>. Te enviamos el enlace para entrar (mira también spam).</p>
         <p><a class="btn" href="https://admin.delfincheckin.com/es/login?email=${encodeURIComponent(email)}">Ir al login</a></p>
         <p class="fine">Gratis, sin tarjeta. En el asistente puedes saltar horario, MIR y datos opcionales.</p>`,
        true
      );
    }

    return htmlPage(
      'No se pudo completar',
      `<p>${String(data.error || 'Inténtalo de nuevo en unos minutos.')}</p>
       <p><a class="btn" href="https://delfincheckin.com/parte-viajeros/?email=${encodeURIComponent(email)}#empezar">Probar desde la web</a></p>`,
      false
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[outreach-activate]', msg);
    // Último recurso: si ya existe tenant, intentar magic link
    try {
      const url = await resumeOnboardingRedirect(email);
      if (url) {
        const res = NextResponse.redirect(url, 302);
        res.cookies.set(ONBOARDING_OUTREACH_COOKIE, '1', {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30,
          path: '/',
        });
        return res;
      }
    } catch {
      /* ignore */
    }
    return htmlPage(
      'Error temporal',
      '<p>No se pudo crear la cuenta ahora. Prueba en unos minutos o escribe a soporte@delfincheckin.com.</p>',
      false
    );
  }
}
