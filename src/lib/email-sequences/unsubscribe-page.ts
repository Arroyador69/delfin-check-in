import {
  decodeUnsubscribeEmail,
  recordUnsubscribe,
  verifyUnsubscribeSignature,
} from '@/lib/email-sequences/unsubscribe';

export type UnsubscribePageResult =
  | { ok: true; email: string; html: string; title: string }
  | { ok: false; html: string; title: string };

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
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
}

export async function processUnsubscribeRequest(
  encoded: string,
  signature: string
): Promise<UnsubscribePageResult> {
  const email = decodeUnsubscribeEmail(encoded);

  if (!email || !verifyUnsubscribeSignature(email, signature)) {
    return {
      ok: false,
      title: 'Enlace no válido',
      html: wrapHtml(
        'Enlace no válido',
        '<h1>Enlace no válido</h1><p>Este enlace de baja ha expirado o no es correcto. Si necesitas ayuda, escribe a <a href="mailto:soporte@delfincheckin.com">soporte@delfincheckin.com</a>.</p>'
      ),
    };
  }

  await recordUnsubscribe(email, 'one_click_link');

  const safeEmail = email.replace(/</g, '&lt;');
  return {
    ok: true,
    email,
    title: 'Baja confirmada',
    html: wrapHtml(
      'Baja confirmada',
      `<h1>Te has dado de baja correctamente</h1>
       <p>El email <strong>${safeEmail}</strong> no recibirá más recordatorios de activación o conversión de Delfín Check-in.</p>
       <p>Seguirás recibiendo emails <strong>transaccionales</strong> importantes (acceso, facturación, seguridad).</p>
       <p>¿Fue un error? Escríbenos a <a href="mailto:soporte@delfincheckin.com">soporte@delfincheckin.com</a>.</p>`
    ),
  };
}
