/**
 * Plantilla cold B2B legal: email publicado en web del alojamiento.
 * Incluye origen, oferta prueba gratis + MIR, y link de baja.
 */

export interface ColdEmailParams {
  toEmail: string;
  domain: string;
  sourceUrl: string;
  optOutUrl: string;
  signupUrl?: string;
  senderName?: string;
}

export function buildColdOutreachEmail(params: ColdEmailParams): {
  subject: string;
  text: string;
  html: string;
} {
  const domainLabel = params.domain || 'tu alojamiento';
  const signup = params.signupUrl || 'https://delfincheckin.com';
  const sender = params.senderName || 'Alberto · Delfín Check-in';
  const year = new Date().getFullYear();

  const subject = `Prueba gratis Delfín Check-in para ${domainLabel} (registro MIR)`;

  const text = [
    `Hola,`,
    ``,
    `Soy ${sender}. He visto el email de contacto publicado en ${params.sourceUrl} y te escribo solo por eso — primera toma de contacto B2B, sin listas compradas.`,
    ``,
    `Delfín Check-in ayuda a alojamientos a registrar viajeros y enviar datos al MIR con onboarding guiado. Puedes empezar con una prueba gratis (1 propiedad).`,
    ``,
    `Si te encaja: ${signup}`,
    ``,
    `Si no te interesa, puedes darte de baja aquí (un clic) y no te volveremos a escribir:`,
    params.optOutUrl,
    ``,
    `También puedes responder “baja” o escribir a soporte@delfincheckin.com.`,
    ``,
    `Gracias,`,
    sender,
    `https://delfincheckin.com`,
    ``,
    `© ${year} Delfín Check-in · Email obtenido de web pública del negocio`,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f5f5;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;">
        <tr><td style="padding:28px 28px 8px;font-size:16px;line-height:1.55;">
          <p style="margin:0 0 14px;">Hola,</p>
          <p style="margin:0 0 14px;">Soy <strong>${escapeHtml(sender)}</strong>. He visto el email de contacto publicado en
            <a href="${escapeAttr(params.sourceUrl)}" style="color:#2563eb;">${escapeHtml(params.sourceUrl)}</a>
            y te escribo solo por eso (contacto B2B a email público; sin listas compradas ni redes sociales).</p>
          <p style="margin:0 0 14px;"><strong>Delfín Check-in</strong> ayuda a alojamientos a registrar viajeros y completar el
            <strong>onboarding MIR</strong>. Puedes empezar con <strong>prueba gratis</strong> (1 propiedad).</p>
        </td></tr>
        <tr><td align="center" style="padding:8px 28px 20px;">
          <a href="${escapeAttr(signup)}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:6px;">Probar gratis ahora</a>
        </td></tr>
        <tr><td style="padding:0 28px 24px;font-size:14px;line-height:1.5;color:#4b5563;">
          <p style="margin:0 0 10px;">Si no te interesa, <a href="${escapeAttr(params.optOutUrl)}" style="color:#2563eb;">darte de baja en un clic</a>
            y no te volveremos a escribir. También puedes responder “baja” o escribir a
            <a href="mailto:soporte@delfincheckin.com">soporte@delfincheckin.com</a>.</p>
          <p style="margin:0;font-size:12px;color:#9ca3af;">© ${year} Delfín Check-in · Origen: web pública del negocio (${escapeHtml(domainLabel)})</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}
