import { NextRequest, NextResponse } from 'next/server';
import { signupFreeActivate } from '@/lib/signup-free-activate';
import {
  decodeOptOutEmail,
} from '@/lib/public-owner-leads/optout';
import { verifyOutreachActivateSignature } from '@/lib/public-owner-leads/activate-link';

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
    a.btn{display:inline-block;margin-top:8px;background:#0284c7;color:#fff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px;}
    .fine{font-size:.85rem;color:#64748b;}
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

/**
 * GET 1-clic desde mail outreach (móvil-friendly):
 * verifica firma → crea tenant FREE + email onboarding.
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
    };

    if (activateRes.status === 200 || data.success) {
      return htmlPage(
        '¡Cuenta creada!',
        `<p>Te hemos enviado el enlace de <strong>onboarding</strong> a <strong>${email}</strong>.</p>
         <p>Ábrelo desde el móvil o el ordenador (revisa spam / promociones).</p>
         <p class="fine">Plan gratis (1 propiedad), sin tarjeta. Cuando quieras, Check-in desde 2€/mes.</p>
         <p><a class="btn" href="https://delfincheckin.com/parte-viajeros/">Ver cómo funciona</a></p>`,
        true
      );
    }

    const err = String(data.error || '');
    if (
      activateRes.status === 400 &&
      (data.alreadyActivated || /ya (tiene|está|está registrado)/i.test(err) || /already/i.test(err))
    ) {
      return htmlPage(
        'Ya tienes cuenta',
        `<p>Este email ya está registrado. Revisa tu correo (también spam) o inicia sesión en
          <a href="https://admin.delfincheckin.com">admin.delfincheckin.com</a>.</p>
         <p class="fine">Si no encuentras el mail de onboarding, escribe a soporte@delfincheckin.com.</p>`,
        true
      );
    }

    return htmlPage(
      'No se pudo completar',
      `<p>${err || 'Inténtalo de nuevo en unos minutos.'}</p>
       <p><a class="btn" href="https://delfincheckin.com/parte-viajeros/?email=${encodeURIComponent(email)}#empezar">Probar desde la web</a></p>`,
      false
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[outreach-activate]', msg);
    return htmlPage(
      'Error temporal',
      '<p>No se pudo crear la cuenta ahora. Prueba en unos minutos o escribe a soporte@delfincheckin.com.</p>',
      false
    );
  }
}
