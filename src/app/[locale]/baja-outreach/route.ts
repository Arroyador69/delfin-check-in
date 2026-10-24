import { NextRequest, NextResponse } from 'next/server';
import {
  decodeOptOutEmail,
  recordOutreachOptOut,
  verifyOutreachOptOutSignature,
} from '@/lib/public-owner-leads/optout';

function pageHtml(opts: { title: string; body: string; ok: boolean }): string {
  const color = opts.ok ? '#065f46' : '#991b1b';
  const bg = opts.ok ? '#ecfdf5' : '#fef2f2';
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${opts.title} · Delfín Check-in</title>
</head>
<body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0f172a;">
  <main style="max-width:520px;margin:48px auto;padding:24px;background:${bg};border:1px solid #e2e8f0;border-radius:12px;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#0369a1;">Delfín Check-in</p>
    <h1 style="margin:0 0 12px;font-size:22px;color:${color};">${opts.title}</h1>
    <p style="margin:0;line-height:1.55;color:#334155;">${opts.body}</p>
    <p style="margin:20px 0 0;font-size:13px;"><a href="https://delfincheckin.com" style="color:#2563eb;">delfincheckin.com</a></p>
  </main>
</body>
</html>`;
}

/**
 * Baja one-click del outreach B2B (emails públicos en web propia).
 * Query: ?e=<base64url email>&s=<hmac>
 */
export async function GET(req: NextRequest) {
  const encoded = req.nextUrl.searchParams.get('e') || '';
  const signature = req.nextUrl.searchParams.get('s') || '';
  const email = decodeOptOutEmail(encoded);

  if (!email || !verifyOutreachOptOutSignature(email, signature)) {
    return new NextResponse(
      pageHtml({
        title: 'Enlace no válido',
        body: 'Este enlace de baja no es válido o ha caducado. Escribe a soporte@delfincheckin.com si quieres dejar de recibir mensajes.',
        ok: false,
      }),
      { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  try {
    await recordOutreachOptOut(email, 'owner_outreach_optout_link');
  } catch (e) {
    console.error('[baja-outreach]', e);
    return new NextResponse(
      pageHtml({
        title: 'Error temporal',
        body: 'No hemos podido registrar la baja ahora. Reinténtalo en unos minutos o escribe a soporte@delfincheckin.com.',
        ok: false,
      }),
      { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }

  const safeEmail = email.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return new NextResponse(
    pageHtml({
      title: 'Baja registrada',
      body: `Hemos dado de baja <strong>${safeEmail}</strong> de los emails de captación. No te enviaremos más outreach comercial a esta dirección.`,
      ok: true,
    }),
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
