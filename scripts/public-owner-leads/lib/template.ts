/**
 * Plantilla cold B2B legal: email publicado en web del alojamiento.
 * Norma clientes: cero jerga técnica — ver docs/COMUNICACION_CLIENTES.md
 * Mantener en sync con scripts/public-owner-leads/lib/template.ts
 */

export interface ColdEmailParams {
  toEmail: string;
  domain: string;
  sourceUrl: string;
  optOutUrl: string;
  signupUrl?: string;
  senderName?: string;
}

/** 4 redes oficiales (override con OUTREACH_SOCIAL_* en .env). */
export function getOutreachSocialLinks(): Array<{ label: string; url: string }> {
  return [
    {
      label: 'Instagram',
      url:
        process.env.OUTREACH_SOCIAL_INSTAGRAM?.trim() ||
        'https://www.instagram.com/delfincheckin',
    },
    {
      label: 'Facebook',
      url:
        process.env.OUTREACH_SOCIAL_FACEBOOK?.trim() ||
        'https://www.facebook.com/delfincheckin',
    },
    {
      label: 'X (Twitter)',
      url:
        process.env.OUTREACH_SOCIAL_TWITTER?.trim() ||
        'https://twitter.com/delfincheckin',
    },
    {
      label: 'YouTube',
      url:
        process.env.OUTREACH_SOCIAL_YOUTUBE?.trim() ||
        'https://www.youtube.com/@delfincheckin',
    },
  ];
}

export function buildColdOutreachEmail(params: ColdEmailParams): {
  subject: string;
  text: string;
  html: string;
} {
  const domainLabel = params.domain || 'tu alojamiento';
  const signup =
    params.signupUrl ||
    process.env.OUTREACH_SIGNUP_URL?.trim() ||
    'https://delfincheckin.com/parte-viajeros/#empezar';
  const sender = params.senderName || 'Alberto · Delfín Check-in';
  const year = new Date().getFullYear();
  const socials = getOutreachSocialLinks();

  const subject = `${domainLabel}: parte de viajeros MIR — pruébalo gratis`;

  const socialText = socials.map((s) => `${s.label}: ${s.url}`).join('\n');
  const socialHtml = socials
    .map(
      (s) =>
        `<a href="${escapeAttr(s.url)}" style="color:#0284c7;text-decoration:none;margin:0 10px 0 0;font-weight:600;">${escapeHtml(s.label)}</a>`
    )
    .join('');

  const text = [
    `Hola,`,
    ``,
    `Soy ${sender}. Te escribo porque el email de contacto de ${domainLabel} está publicado en ${params.sourceUrl} (contacto a email público de tu web; sin listas compradas).`,
    ``,
    `En España el RD 933/2021 obliga a registrar a los viajeros y enviar el parte al MIR / SES Hospedajes. Con Delfín Check-in el huésped rellena el parte, tú lo revisas y lo envías al Ministerio — fácil, también desde el móvil.`,
    ``,
    `Puedes probarlo gratis (1 propiedad), sin tarjeta. Un clic y en un minutito estás registrado: te llega el correo para entrar y empezar. Si más adelante te encaja, desde 2€/mes; si no, te quedas en gratis o te das de baja.`,
    ``,
    `Probar gratis ahora:`,
    signup,
    ``,
    `También estamos en redes:`,
    socialText,
    ``,
    `Si no te interesa, baja aquí y no te escribiremos más:`,
    params.optOutUrl,
    ``,
    `También puedes responder “baja” o escribir a soporte@delfincheckin.com.`,
    ``,
    `Un saludo,`,
    sender,
    `https://delfincheckin.com`,
    ``,
    `© ${year} Delfín Check-in · Origen: web pública del negocio`,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f8fbff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f8fbff;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;">
        <tr><td style="padding:28px 28px 6px;font-size:16px;line-height:1.55;">
          <p style="margin:0 0 14px;">Hola,</p>
          <p style="margin:0 0 14px;">Soy <strong>${escapeHtml(sender)}</strong>. Te escribo porque el email de
            <strong>${escapeHtml(domainLabel)}</strong> está publicado en
            <a href="${escapeAttr(params.sourceUrl)}" style="color:#0284c7;">${escapeHtml(params.sourceUrl)}</a>
            (contacto a email público de tu web; sin listas compradas).</p>
          <p style="margin:0 0 14px;">El <strong>RD 933/2021</strong> obliga a registrar viajeros y enviar el parte al
            <strong>MIR / SES Hospedajes</strong>. Con <strong>Delfín Check-in</strong> el huésped rellena el parte,
            tú lo revisas y lo envías al Ministerio — fácil, también desde el móvil.</p>
          <p style="margin:0 0 8px;">Puedes <strong>probarlo gratis</strong> (1 propiedad), <strong>sin tarjeta</strong>.
            Un clic y <strong>en un minutito estás registrado</strong>: te llega el correo para entrar.
            Si más adelante te encaja, desde <strong>2€/mes</strong>; si no, puedes quedarte en gratis.</p>
        </td></tr>
        <tr><td align="center" style="padding:12px 28px 8px;">
          <a href="${escapeAttr(signup)}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:8px;font-size:16px;">Probar gratis ahora</a>
          <p style="margin:12px 0 0;font-size:13px;color:#64748b;">En un minutito estás dentro (móvil u ordenador).<br/>
            <a href="${escapeAttr(signup)}" style="color:#0284c7;word-break:break-all;">${escapeHtml(signup)}</a></p>
        </td></tr>
        <tr><td style="padding:4px 28px 20px;font-size:14px;line-height:1.6;color:#475569;">
          <p style="margin:0 0 8px;font-weight:700;color:#0f172a;">Síguenos</p>
          <p style="margin:0;">${socialHtml}</p>
        </td></tr>
        <tr><td style="padding:0 28px 24px;font-size:14px;line-height:1.5;color:#64748b;">
          <p style="margin:0 0 10px;">Si no te interesa, <a href="${escapeAttr(params.optOutUrl)}" style="color:#0284c7;">date de baja en un clic</a>
            y no te volveremos a escribir. También puedes responder “baja” o escribir a
            <a href="mailto:soporte@delfincheckin.com">soporte@delfincheckin.com</a>.</p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">© ${year} Delfín Check-in · Origen: web pública (${escapeHtml(domainLabel)})</p>
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
