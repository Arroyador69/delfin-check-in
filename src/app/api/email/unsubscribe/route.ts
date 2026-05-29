import { NextRequest, NextResponse } from 'next/server';
import {
  decodeUnsubscribeEmail,
  recordUnsubscribe,
  verifyUnsubscribeSignature,
} from '@/lib/email-sequences/unsubscribe';

function htmlPage(title: string, body: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} · Delfín Check-in</title>
  <style>
    body{font-family:Arial,sans-serif;background:#f1f5f9;margin:0;padding:40px 16px;color:#334155}
    .card{max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
    h1{font-size:22px;color:#0f172a;margin:0 0 12px}
    p{line-height:1.6;margin:0 0 12px}
    a{color:#2563eb}
  </style>
</head>
<body><div class="card">${body}</div></body>
</html>`;
  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

/**
 * Baja one-click de emails lifecycle (RGPD/LSSI).
 * GET /api/email/unsubscribe?e=BASE64URL&s=HMAC
 */
export async function GET(req: NextRequest) {
  const encoded = req.nextUrl.searchParams.get('e') || '';
  const signature = req.nextUrl.searchParams.get('s') || '';
  const email = decodeUnsubscribeEmail(encoded);

  if (!email || !verifyUnsubscribeSignature(email, signature)) {
    return htmlPage(
      'Enlace no válido',
      '<h1>Enlace no válido</h1><p>Este enlace de baja ha expirado o no es correcto. Si necesitas ayuda, escribe a <a href="mailto:soporte@delfincheckin.com">soporte@delfincheckin.com</a>.</p>'
    );
  }

  await recordUnsubscribe(email, 'one_click_link');

  return htmlPage(
    'Baja confirmada',
    `<h1>Te has dado de baja correctamente</h1>
     <p>El email <strong>${email.replace(/</g, '&lt;')}</strong> no recibirá más recordatorios de activación o conversión de Delfín Check-in.</p>
     <p>Seguirás recibiendo emails <strong>transaccionales</strong> importantes (acceso, facturación, seguridad).</p>
     <p>¿Fue un error? Escríbenos a <a href="mailto:soporte@delfincheckin.com">soporte@delfincheckin.com</a>.</p>`
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const encoded = String(body.e || '');
    const signature = String(body.s || '');
    const email = decodeUnsubscribeEmail(encoded);

    if (!email || !verifyUnsubscribeSignature(email, signature)) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 400 });
    }

    await recordUnsubscribe(email, body.reason ? String(body.reason) : 'api_post');
    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
