/**
 * Plantilla cold B2B: email público del alojamiento.
 * Norma clientes: cero jerga técnica — docs/COMUNICACION_CLIENTES.md
 * Mantener en sync con scripts/public-owner-leads/lib/template.ts
 *
 * Frontend email-safe (tablas, inline CSS, 600px, vídeo = miniatura+link).
 * Copy estable: no cambiar el texto del cuerpo sin acuerdo.
 */

export type ColdEmailAudience = 'owner' | 'agency' | 'hotel';

export interface ColdEmailParams {
  toEmail: string;
  domain: string;
  sourceUrl: string;
  optOutUrl: string;
  signupUrl?: string;
  senderName?: string;
  /** Agencias multi-vivienda / hoteles: copy de prioridad. */
  audience?: ColdEmailAudience;
}

/** Vídeo del principio de la landing: «¿Qué es Delfín Check-in?» */
export const OUTREACH_INTRO_VIDEO_ID = 'sH4Yv5t5hdI';
export const OUTREACH_INTRO_VIDEO_URL = `https://www.youtube.com/watch?v=${OUTREACH_INTRO_VIDEO_ID}`;
export const OUTREACH_INTRO_VIDEO_THUMB = `https://img.youtube.com/vi/${OUTREACH_INTRO_VIDEO_ID}/hqdefault.jpg`;

function socialIconBase(): string {
  return String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
}

/** 4 redes oficiales (override con OUTREACH_SOCIAL_* en .env). Logos 24×24 iguales. */
export function getOutreachSocialLinks(): Array<{
  label: string;
  url: string;
  icon: string;
  iconFile: string;
}> {
  const base = socialIconBase();
  return [
    {
      label: 'Instagram',
      url:
        process.env.OUTREACH_SOCIAL_INSTAGRAM?.trim() ||
        'https://www.instagram.com/delfincheckin',
      iconFile: 'instagram.png',
      icon: `${base}/email/social/instagram.png`,
    },
    {
      label: 'Facebook',
      url:
        process.env.OUTREACH_SOCIAL_FACEBOOK?.trim() ||
        'https://www.facebook.com/delfincheckin',
      iconFile: 'facebook.png',
      icon: `${base}/email/social/facebook.png`,
    },
    {
      label: 'X',
      url:
        process.env.OUTREACH_SOCIAL_TWITTER?.trim() ||
        'https://twitter.com/delfincheckin',
      iconFile: 'x.png',
      icon: `${base}/email/social/x.png`,
    },
    {
      label: 'YouTube',
      url:
        process.env.OUTREACH_SOCIAL_YOUTUBE?.trim() ||
        'https://www.youtube.com/@delfincheckin',
      iconFile: 'youtube.png',
      icon: `${base}/email/social/youtube.png`,
    },
  ];
}

export function buildColdOutreachEmail(params: ColdEmailParams): {
  subject: string;
  text: string;
  html: string;
} {
  const audience = params.audience || 'owner';
  const isAgency = audience === 'agency';
  const isHotel = audience === 'hotel';
  const domainLabel =
    params.domain ||
    (isAgency ? 'vuestra gestora' : isHotel ? 'vuestro hotel' : 'tu alojamiento');
  const signup =
    params.signupUrl ||
    process.env.OUTREACH_SIGNUP_URL?.trim() ||
    'https://delfincheckin.com/parte-viajeros/#empezar';
  const sender = params.senderName || 'Alberto · Delfín Check-in';
  const year = new Date().getFullYear();
  const socials = getOutreachSocialLinks();
  const videoUrl =
    process.env.OUTREACH_INTRO_VIDEO_URL?.trim() || OUTREACH_INTRO_VIDEO_URL;
  const videoThumb =
    process.env.OUTREACH_INTRO_VIDEO_THUMB?.trim() || OUTREACH_INTRO_VIDEO_THUMB;

  const subject = isAgency
    ? `${domainLabel}: parte MIR para todo vuestro portfolio — trato prioritario`
    : isHotel
      ? `${domainLabel}: parte de viajeros MIR por habitaciones — prueba prioritaria`
      : `${domainLabel}: parte de viajeros MIR — pruébalo gratis`;
  const preheader = isAgency
    ? 'Os escribimos a vosotros: gestoras con muchas viviendas. Prioridad de onboarding y soporte.'
    : isHotel
      ? 'Hoteles y hostales: parte MIR por habitación, prueba sencilla y atención directa.'
      : 'Parte de viajeros MIR · pruébalo gratis sin tarjeta. Vídeo en 1 min.';

  const pitchBody = isAgency
    ? `Os escribo directamente a ${domainLabel}: sé que gestionáis varias (o muchas) viviendas de uso turístico / vacacional. Con Delfín Check-in cada propiedad puede enviar el parte al MIR / SES Hospedajes sin líos: el huésped rellena, vosotros revisáis y enviáis — también desde el móvil. Para gestoras con volumen alto os damos trato priorizado y onboarding especializado (no es el mismo flujo que un dueño con una sola casa).`
    : isHotel
      ? `Os escribo a ${domainLabel}: en hoteles y hostales el RD 933/2021 también obliga a registrar viajeros y enviar el parte al MIR / SES Hospedajes. Con Delfín Check-in el huésped rellena el parte por habitación/estancia, lo revisáis y lo enviáis al Ministerio — fácil en móvil. Si tenéis varias habitaciones o varios establecimientos, prioridad de atención al probarlo.`
      : `En España el RD 933/2021 obliga a registrar a los viajeros y enviar el parte al MIR / SES Hospedajes. Con Delfín Check-in el huésped rellena el parte, tú lo revisas y lo envías al Ministerio — fácil, también desde el móvil.`;

  const trialLine = isAgency
    ? `Probadlo gratis, sin tarjeta. Un clic y en un minutito estáis dentro (email ya asociado). Si tenéis muchas viviendas: prioridad de onboarding y soporte dedicado. Luego, si encaja, desde 2€/mes por propiedad.`
    : isHotel
      ? `Probadlo gratis, sin tarjeta. Un clic y en un minutito estáis registrados. Si operáis varias habitaciones o más de un establecimiento, prioridad de atención. Si más adelante encaja, desde 2€/mes.`
      : `Puedes probarlo gratis (1 propiedad), sin tarjeta. Un clic y en un minutito estás registrado: te llega el correo para entrar y empezar. Si más adelante te encaja, desde 2€/mes; si no, te quedas en gratis o te das de baja.`;

  const socialText = [
    'Síguenos (por si te viene bien):',
    ...socials.map((s) => `· ${s.label}: ${s.url}`),
  ].join('\n');
  // Fila profesional: logo 24×24 + nombre, mismo tamaño en las 4 redes (tablas email-safe)
  const socialHtml = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;"><tr>${socials
    .map(
      (s) =>
        `<td align="center" style="padding:0 10px 8px 0;vertical-align:middle;">
          <a href="${escapeAttr(s.url)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;color:#0f172a;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
              <tr>
                <td style="vertical-align:middle;padding:0 8px 0 0;">
                  <img src="${escapeAttr(s.icon)}" width="24" height="24" alt="" style="display:block;width:24px;height:24px;border:0;border-radius:6px;" />
                </td>
                <td style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#0369a1;line-height:24px;white-space:nowrap;">
                  ${escapeHtml(s.label)}
                </td>
              </tr>
            </table>
          </a>
        </td>`
    )
    .join('')}</tr></table>`;

  // Texto plano
  const text = [
    `Hola,`,
    ``,
    `Soy ${sender}. Te escribo porque el email de contacto de ${domainLabel} está publicado en ${params.sourceUrl} (contacto a email público de tu web; sin listas compradas).`,
    ``,
    pitchBody,
    ``,
    `Vídeo (qué es Delfín Check-in):`,
    videoUrl,
    ``,
    trialLine,
    ``,
    `Probar gratis ahora:`,
    signup,
    ``,
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

  // HTML: tablas + CSS inline (Outlook/Gmail). Vídeo = miniatura enlazada (no iframe).
  const html = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#eef6fc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!-- Preheader oculto -->
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef6fc;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #dbe7f3;border-radius:12px;border-collapse:separate;">
          <!-- Header marca (color sólido: mejor en Outlook que gradients) -->
          <tr>
            <td align="left" style="background-color:#0284c7;padding:22px 28px;border-radius:12px 12px 0 0;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.25;font-weight:700;color:#ffffff;">Delfín Check-in</p>
              <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;color:#e0f2fe;">delfincheckin.com</p>
            </td>
          </tr>

          <!-- Cuerpo: mismo texto -->
          <tr>
            <td style="padding:28px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#0f172a;">
              <p style="margin:0 0 16px;">Hola,</p>
              <p style="margin:0 0 16px;">Soy <strong>${escapeHtml(sender)}</strong>. Te escribo porque el email de
                <strong>${escapeHtml(domainLabel)}</strong> está publicado en
                <a href="${escapeAttr(params.sourceUrl)}" style="color:#0284c7;text-decoration:underline;">${escapeHtml(params.sourceUrl)}</a>
                (contacto a email público de tu web; sin listas compradas).</p>
              <p style="margin:0 0 8px;">${escapeHtml(pitchBody)}</p>
            </td>
          </tr>

          <!-- Vídeo: thumbnail + play (best practice email) -->
          <tr>
            <td align="center" style="padding:12px 28px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td align="center" style="background-color:#0f172a;border-radius:10px;">
                    <a href="${escapeAttr(videoUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:block;">
                      <img src="${escapeAttr(videoThumb)}" width="544" height="306" alt="Ver vídeo: Qué es Delfín Check-in" style="display:block;width:100%;max-width:544px;height:auto;border:0;border-radius:10px 10px 0 0;" />
                    </a>
                    <a href="${escapeAttr(videoUrl)}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;background-color:#0f172a;padding:14px 16px;border-radius:0 0 10px 10px;">
                      <span style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;">&#9654;&nbsp; Ver vídeo · Qué es Delfín Check-in</span>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#0f172a;">
              <p style="margin:0;">${escapeHtml(trialLine)}</p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:20px 28px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td align="center" bgcolor="#0284c7" style="border-radius:10px;background-color:#0284c7;">
                    <a href="${escapeAttr(signup)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:16px 32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;line-height:1.2;">
                      Probar gratis ahora
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#64748b;">
                En un minutito estás dentro (móvil u ordenador).<br/>
                <a href="${escapeAttr(signup)}" style="color:#0284c7;word-break:break-all;">${escapeHtml(signup)}</a>
              </p>
            </td>
          </tr>

          <!-- Síguenos -->
          <tr>
            <td style="padding:20px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#475569;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-weight:700;color:#0f172a;font-size:15px;">Síguenos</p>
              <p style="margin:0 0 14px;font-size:13px;color:#64748b;">Si te encaja, un follow nos ayuda a llegar a más anfitriones.</p>
              ${socialHtml}
            </td>
          </tr>

          <!-- Baja / pie -->
          <tr>
            <td style="padding:16px 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#64748b;">
              <p style="margin:0 0 12px;">Si no te interesa, <a href="${escapeAttr(params.optOutUrl)}" style="color:#0284c7;">date de baja en un clic</a>
                y no te volveremos a escribir. También puedes responder “baja” o escribir a
                <a href="mailto:soporte@delfincheckin.com" style="color:#0284c7;">soporte@delfincheckin.com</a>.</p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">© ${year} Delfín Check-in · Origen: web pública (${escapeHtml(domainLabel)})</p>
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
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
