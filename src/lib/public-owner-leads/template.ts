/**
 * Plantilla cold B2B alquiler vacacional (buenas prácticas conversión).
 * Norma clientes: cero jerga técnica — docs/COMUNICACION_CLIENTES.md
 * Mantener en sync con scripts/public-owner-leads/lib/template.ts
 *
 * Buenas prácticas (Reply / SendIQ 2025):
 * - No decir de dónde salió el email ni “listas” (quema confianza).
 * - Valor + resultado, 1 solo CTA grande, corto y escaneable.
 * - SES Hospedajes obligatorio + más valor (limpieza, reservas directas, menos comisiones OTA).
 * - Lenguaje de cliente: «registro / pruébalo gratis», nunca «onboarding».
 */

export type ColdEmailAudience = 'owner' | 'agency' | 'hotel';

export interface ColdEmailParams {
  toEmail: string;
  domain: string;
  /** Se mantiene por compat API; ya NO se menciona en el cuerpo del mail. */
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

/** 4 redes oficiales. Logos 24×24 iguales. */
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
        'https://www.instagram.com/delfincheckin/',
      iconFile: 'instagram.png',
      icon: `${base}/email/social/instagram.png`,
    },
    {
      label: 'Facebook',
      url:
        process.env.OUTREACH_SOCIAL_FACEBOOK?.trim() ||
        'https://www.facebook.com/profile.php?id=61586844961934',
      iconFile: 'facebook.png',
      icon: `${base}/email/social/facebook.png`,
    },
    {
      label: 'TikTok',
      url:
        process.env.OUTREACH_SOCIAL_TIKTOK?.trim() ||
        process.env.OUTREACH_SOCIAL_TWITTER?.trim() || // legacy env name
        'https://www.tiktok.com/@delfincheckin',
      iconFile: 'tiktok.png',
      icon: `${base}/email/social/tiktok.png`,
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
  const sender = params.senderName || 'Equipo Delfín Check-in';
  const year = new Date().getFullYear();
  const socials = getOutreachSocialLinks();
  const videoUrl =
    process.env.OUTREACH_INTRO_VIDEO_URL?.trim() || OUTREACH_INTRO_VIDEO_URL;
  const videoThumb =
    process.env.OUTREACH_INTRO_VIDEO_THUMB?.trim() || OUTREACH_INTRO_VIDEO_THUMB;

  // Asunto personalizado por dominio + audiencia (sin jerga “onboarding”)
  const subject = isAgency
    ? `${domainLabel}: registro en 1 minuto — prueba gratis`
    : isHotel
      ? `${domainLabel}: registro en 1 minuto — check-in en el móvil`
      : `${domainLabel}: regístrate en 1 minuto y pruébalo gratis`;

  const preheader = isAgency
    ? `Para ${domainLabel}: sin tarjeta, en un minuto tenéis el enlace del huésped.`
    : isHotel
      ? `Para ${domainLabel}: sin tarjeta, en un minuto el enlace de check-in del huésped.`
      : `Para ${domainLabel}: sin tarjeta, en un minuto pruebas el check-in gratis.`;

  const greeting = isAgency || isHotel ? 'Hola,' : 'Hola,';

  // Hook + valor anclado al dominio del lead (sin “encontré tu email”)
  const pitchBody = isAgency
    ? `Os escribo por ${domainLabel}. Si gestionáis viviendas turísticas, el parte de viajeros a SES Hospedajes es obligatorio. Con Delfín Check-in el huésped rellena en el móvil, vosotros revisáis y enviáis. En el plan gratis el envío es manual; con Plan Check-in (~2€/mes) es automático. También: limpiezas, reservas directas (menos comisiones Airbnb/Booking) y panel multi-vivienda.`
    : isHotel
      ? `Os escribo por ${domainLabel}. En hoteles y hostales el RD 933/2021 exige registrar viajeros en SES Hospedajes. Con Delfín Check-in el huésped hace el check-in en el móvil. Gratis: envío manual del parte + panel y extras. Plan Check-in (~2€/mes): envío automático. Además limpiezas y reservas directas.`
      : `Te escribo por ${domainLabel}. Si tienes un alquiler vacacional en España, debes enviar el parte de viajeros a SES Hospedajes. Con Delfín Check-in el huésped rellena en el móvil — ahorras tiempo en cada llegada.

Gratis (sin tarjeta): formulario, panel, limpiezas y envío manual a SES Hospedajes. Plan Check-in (~2€/mes): envío automático. Cuando crezcas, reservas directas y reputación Google están en planes superiores.`;

  const trialLine = isAgency
    ? `Para ${domainLabel}: cread la cuenta en 1 minuto (gratis, sin tarjeta), elegís el tipo de alojamiento, creáis la primera unidad y ya tenéis el enlace del huésped. Lo demás lo podéis completar después, con calma.`
    : isHotel
      ? `Para ${domainLabel}: registraos en 1 minuto (gratis, sin tarjeta) — habitación + enlace del huésped listos. Si queréis envío automático a SES Hospedajes, Plan Check-in desde 2€/mes.`
      : `Para ${domainLabel}: regístrate en Delfín Check-in en 1 minuto y pruébalo gratis (sin tarjeta): creas tu unidad y copias el enlace del huésped. Si más adelante quieres envío automático a SES Hospedajes, Plan Check-in desde 2€/mes.`;

  const ctaLabel = isAgency || isHotel
    ? 'Crear cuenta gratis · 1 minuto'
    : 'Regístrate gratis · 1 minuto';

  const socialText = [
    'Síguenos:',
    ...socials.map((s) => `· ${s.label}: ${s.url}`),
  ].join('\n');

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

  const text = [
    greeting,
    ``,
    `Soy ${sender}.`,
    ``,
    pitchBody,
    ``,
    `Vídeo (1 min):`,
    videoUrl,
    ``,
    trialLine,
    ``,
    `Regístrate en 1 minuto (gratis, sin tarjeta):`,
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
    `© ${year} Delfín Check-in`,
  ].join('\n');

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
<body style="margin:0;padding:0;background-color:#e8f4fc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#e8f4fc;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <!--[if mso]><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #cfe5f5;border-radius:14px;border-collapse:separate;overflow:hidden;">
          <!-- Barra marca -->
          <tr>
            <td style="background-color:#0369a1;height:6px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td align="left" style="background-color:#0284c7;padding:26px 28px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.2;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Delfín Check-in</p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.4;color:#e0f2fe;">Parte SES Hospedajes · limpiezas · reservas directas</p>
            </td>
          </tr>

          <!-- Franja confianza -->
          <tr>
            <td align="center" style="background-color:#f0f9ff;padding:14px 20px;border-bottom:1px solid #e0f2fe;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#0369a1;letter-spacing:0.02em;">
                GRATIS &nbsp;·&nbsp; SIN TARJETA &nbsp;·&nbsp; 1 MINUTO &nbsp;·&nbsp; ESPAÑA
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#0f172a;">
              <p style="margin:0 0 14px;">${escapeHtml(greeting)}</p>
              <p style="margin:0 0 16px;">Soy <strong>${escapeHtml(sender)}</strong>.</p>
              ${pitchBody
                .split(/\n\n+/)
                .map(
                  (p) =>
                    `<p style="margin:0 0 16px;">${escapeHtml(p.trim())}</p>`
                )
                .join('')}
            </td>
          </tr>

          <!-- Beneficios en filas (email-safe, llamativo) -->
          <tr>
            <td style="padding:4px 28px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;border:1px solid #bae6fd;border-radius:12px;background-color:#f8fbff;">
                <tr>
                  <td style="padding:18px 20px 6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#0c4a6e;">
                    Todo en un solo sitio
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#334155;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e0f2fe;">
                          <span style="color:#0284c7;font-weight:700;">&#10003;</span>&nbsp; Parte de viajeros a SES Hospedajes (obligatorio)
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e0f2fe;">
                          <span style="color:#0284c7;font-weight:700;">&#10003;</span>&nbsp; Calendario de limpiezas
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="color:#0284c7;font-weight:700;">&#10003;</span>&nbsp; Reservas directas (menos comisiones Airbnb / Booking)
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:18px 28px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td align="center" style="background-color:#0f172a;border-radius:12px;">
                    <a href="${escapeAttr(videoUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:block;">
                      <img src="${escapeAttr(videoThumb)}" width="544" height="306" alt="Ver vídeo: Qué es Delfín Check-in" style="display:block;width:100%;max-width:544px;height:auto;border:0;border-radius:12px 12px 0 0;" />
                    </a>
                    <a href="${escapeAttr(videoUrl)}" target="_blank" rel="noopener noreferrer" style="display:block;text-decoration:none;background-color:#0f172a;padding:14px 16px;border-radius:0 0 12px 12px;">
                      <span style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;">&#9654;&nbsp; Ver en 1 minuto qué es Delfín Check-in</span>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 28px 4px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#0f172a;">
              <p style="margin:0;">${escapeHtml(trialLine)}</p>
            </td>
          </tr>

          <!-- CTA principal (doble borde = más presencia en clientes de correo) -->
          <tr>
            <td align="center" style="padding:24px 28px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td align="center" bgcolor="#075985" style="border-radius:14px;background-color:#075985;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#0284c7" style="border-radius:12px;background-color:#0284c7;mso-padding-alt:0;">
                          <a href="${escapeAttr(signup)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:20px 44px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;line-height:1.25;">
                            ${escapeHtml(ctaLabel)}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#0369a1;font-weight:700;">
                Registro en 1 minuto · gratis · sin tarjeta · sin compromiso
              </p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.45;color:#64748b;">
                Plan Check-in (envío automático a SES Hospedajes): 2€/mes + 2€/propiedad adicional
              </p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;color:#94a3b8;">
                Si el botón no funciona: <a href="${escapeAttr(signup)}" style="color:#0284c7;word-break:break-all;">abrir enlace</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:22px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#475569;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-weight:700;color:#0f172a;font-size:15px;">Síguenos</p>
              <p style="margin:0 0 14px;font-size:13px;color:#64748b;">Consejos para anfitriones y novedades del producto.</p>
              ${socialHtml}
            </td>
          </tr>

          <tr>
            <td style="padding:16px 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#64748b;">
              <p style="margin:0 0 12px;">Si no te interesa, <a href="${escapeAttr(params.optOutUrl)}" style="color:#0284c7;">date de baja en un clic</a>
                y no te volveremos a escribir. También puedes responder “baja” o escribir a
                <a href="mailto:soporte@delfincheckin.com" style="color:#0284c7;">soporte@delfincheckin.com</a>.</p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">© ${year} Delfín Check-in</p>
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

/** Tipo de toque de la secuencia (alineado con `TouchKind` de sequence.ts). */
export type OutreachTouch =
  | 'cold'
  | 'fu_click'
  | 'fu_open'
  | 'fu_silent'
  | 'fu_recovery';

export interface FollowUpEmailParams {
  toEmail: string;
  domain: string;
  /** Compat API; no se menciona en el cuerpo. */
  sourceUrl: string;
  optOutUrl: string;
  signupUrl: string;
  audience?: ColdEmailAudience;
  touch: Exclude<OutreachTouch, 'cold'>;
  /** 0 = R1, 1 = R2 (solo fu_recovery). */
  recoveryStep?: number;
}

/**
 * Follow-up corto (click > open > silencio). Mismo esqueleto HTML que el cold
 * (cabecera, CTA, opt-out) pero sin vídeo ni bloque de beneficios.
 * Hotel/agencia: tono «vosotros». VR (owner): empuja Plan Check-in (~2€).
 */
export function buildFollowUpOutreachEmail(params: FollowUpEmailParams): {
  subject: string;
  text: string;
  html: string;
} {
  const audience = params.audience || 'owner';
  const isAgency = audience === 'agency';
  const isHotel = audience === 'hotel';
  const plural = isAgency || isHotel;
  const touch = params.touch;
  const domainLabel =
    params.domain ||
    (isAgency ? 'vuestra gestora' : isHotel ? 'vuestro hotel' : 'tu alojamiento');
  const signup = params.signupUrl;
  const sender = 'Equipo Delfín Check-in';
  const year = new Date().getFullYear();

  let subject: string;
  let preheader: string;
  let paragraphs: string[];
  let ctaLabel: string;

  if (touch === 'fu_recovery') {
    const step = params.recoveryStep ?? 0;
    if (step >= 1) {
      subject = plural
        ? `${domainLabel}: última ayuda con el check-in SES`
        : `${domainLabel}: última ayuda con tu check-in SES`;
      preheader = plural
        ? 'Enlace directo · 1 minuto · si no os sirve, no os escribimos más por esto.'
        : 'Enlace directo · 1 minuto · si no te sirve, no te escribimos más por esto.';
      paragraphs = plural
        ? [
            `Última ayuda para ${domainLabel}: el enlace de abajo crea la cuenta en 1 minuto (gratis, sin tarjeta) y deja listo el check-in del huésped para SES Hospedajes.`,
            `Si no os encaja, no pasa nada: no os volveremos a escribir por este tema.`,
          ]
        : [
            `Última ayuda para ${domainLabel}: el enlace de abajo crea tu cuenta en 1 minuto (gratis, sin tarjeta) y deja listo el check-in del huésped para SES Hospedajes.`,
            `Si no te encaja, no pasa nada: no te volveré a escribir por este tema.`,
          ];
      ctaLabel = plural ? 'Crear cuenta ahora' : 'Crear mi cuenta ahora';
    } else {
      subject = plural
        ? `${domainLabel}: abristeis el mail — el parte SES sigue siendo obligatorio`
        : `${domainLabel}: abriste el mail — el parte SES sigue siendo obligatorio`;
      preheader = plural
        ? 'Sin tarjeta. En 1 minuto tenéis el enlace del huésped. Muchos se quedan a un clic.'
        : 'Sin tarjeta. En 1 minuto tienes el enlace del huésped. Muchos se quedan a un clic.';
      paragraphs = plural
        ? [
            `Abristeis un correo sobre Delfín Check-in para ${domainLabel}. Suele pasar: se mira, se deja para después… y el parte de viajeros a SES Hospedajes sigue siendo obligatorio en cada llegada.`,
            `En 1 minuto (gratis, sin tarjeta) creáis la cuenta y tenéis el enlace del huésped. El envío automático del parte es opcional después (Plan Check-in ~2€/mes).`,
          ]
        : [
            `Abriste un correo sobre Delfín Check-in para ${domainLabel}. Suele pasar: se mira, se deja para después… y el parte de viajeros a SES Hospedajes sigue siendo obligatorio en cada llegada.`,
            `En 1 minuto (gratis, sin tarjeta) creas la cuenta y tienes el enlace del huésped. El envío automático del parte es opcional después (Plan Check-in ~2€/mes).`,
          ];
      ctaLabel = plural ? 'Resolverlo en 1 minuto' : 'Resolverlo en 1 minuto';
    }
  } else if (touch === 'fu_click') {
    subject = `${domainLabel}: ${plural ? 'os faltó' : 'te faltó'} un minuto`;
    preheader = plural
      ? 'Visteis el registro de Delfín Check-in: queda 1 minuto para tener el enlace del huésped.'
      : 'Viste el registro de Delfín Check-in: queda 1 minuto para tener tu enlace del huésped.';
    if (isHotel) {
      paragraphs = [
        `Vimos que os interesó Delfín Check-in para ${domainLabel}. Os quedó a medias: registraos en 1 minuto (gratis, sin tarjeta) y tendréis el enlace de check-in del huésped listo.`,
        `El huésped rellena en el móvil y el parte de viajeros a SES Hospedajes sale sin papeleo en recepción. Si más adelante queréis que el envío sea automático, está el Plan Check-in; para empezar no hace falta.`,
      ];
    } else if (isAgency) {
      paragraphs = [
        `Vimos que os interesó Delfín Check-in para ${domainLabel}. Os faltó un minuto: cread la cuenta (gratis, sin tarjeta) y ya tenéis el enlace del huésped.`,
        `Con el Plan Check-in (~2€/mes + 2€ por propiedad adicional) el envío del parte de viajeros a SES Hospedajes es automático en todas vuestras viviendas.`,
      ];
    } else {
      paragraphs = [
        `Vimos que te interesó Delfín Check-in para ${domainLabel}. Te faltó un minuto: regístrate (gratis, sin tarjeta) y ya tienes tu enlace de check-in para el huésped.`,
        `Con el Plan Check-in (~2€/mes) el envío del parte de viajeros a SES Hospedajes es automático: el huésped rellena en el móvil y tú no tocas nada.`,
      ];
    }
    ctaLabel = plural ? 'Crear cuenta · 1 minuto' : 'Regístrate · 1 minuto';
  } else if (touch === 'fu_open') {
    subject = `${domainLabel}: check-in SES en el móvil`;
    preheader = plural
      ? 'El huésped hace el check-in en el móvil y vosotros enviáis el parte a SES Hospedajes.'
      : 'El huésped hace el check-in en el móvil y tú envías el parte a SES Hospedajes.';
    if (isHotel) {
      paragraphs = [
        `Para ${domainLabel}: el huésped hace el check-in en el móvil y el parte de viajeros a SES Hospedajes queda listo sin copiar datos a mano.`,
        `Registraos en 1 minuto, gratis y sin tarjeta.`,
      ];
    } else if (isAgency) {
      paragraphs = [
        `Para ${domainLabel}: el huésped hace el check-in en el móvil y el parte a SES Hospedajes sale sin copiar datos a mano. Con Plan Check-in (~2€/mes) es automático.`,
        `Cread la cuenta en 1 minuto, gratis y sin tarjeta.`,
      ];
    } else {
      paragraphs = [
        `Para ${domainLabel}: el huésped hace el check-in en el móvil y el parte a SES Hospedajes sale sin copiar datos a mano. Con Plan Check-in (~2€/mes) es automático.`,
        `Regístrate en 1 minuto, gratis y sin tarjeta.`,
      ];
    }
    ctaLabel = plural ? 'Crear cuenta gratis · 1 minuto' : 'Regístrate gratis · 1 minuto';
  } else {
    subject = `última nota sobre ${domainLabel}`;
    if (plural) {
      paragraphs = [
        `Última nota sobre ${domainLabel}: si os sirve el check-in en el móvil con parte a SES Hospedajes, podéis registraros gratis en 1 minuto. Si no, no os escribimos más.`,
      ];
    } else {
      paragraphs = [
        `Última nota sobre ${domainLabel}: si te sirve el check-in en el móvil con parte a SES Hospedajes (envío automático con Plan Check-in, ~2€/mes), puedes registrarte gratis en 1 minuto. Si no, no te escribimos más.`,
      ];
    }
    preheader = plural
      ? 'Una sola frase y no os escribimos más.'
      : 'Una sola frase y no te escribimos más.';
    ctaLabel = plural ? 'Crear cuenta gratis' : 'Regístrate gratis';
  }

  const priceLine = isHotel
    ? ''
    : 'Plan Check-in (envío automático a SES Hospedajes): 2€/mes + 2€/propiedad adicional';
  const optOutIntro = plural
    ? 'Si no os interesa, baja aquí y no os escribiremos más:'
    : 'Si no te interesa, baja aquí y no te escribiremos más:';

  const text = [
    `Hola,`,
    ``,
    ...paragraphs.flatMap((p) => [p, ``]),
    `${ctaLabel}:`,
    signup,
    ...(priceLine ? [``, priceLine] : []),
    ``,
    optOutIntro,
    params.optOutUrl,
    ``,
    `Un saludo,`,
    sender,
    `https://delfincheckin.com`,
    ``,
    `© ${year} Delfín Check-in`,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#e8f4fc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#e8f4fc;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #cfe5f5;border-radius:14px;border-collapse:separate;overflow:hidden;">
          <tr>
            <td style="background-color:#0369a1;height:6px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td align="left" style="background-color:#0284c7;padding:20px 28px;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:22px;line-height:1.2;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Delfín Check-in</p>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 28px 6px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#0f172a;">
              <p style="margin:0 0 14px;">Hola,</p>
              ${paragraphs
                .map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`)
                .join('\n              ')}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:14px 28px 8px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                <tr>
                  <td align="center" bgcolor="#075985" style="border-radius:14px;background-color:#075985;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#0284c7" style="border-radius:12px;background-color:#0284c7;mso-padding-alt:0;">
                          <a href="${escapeAttr(signup)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:18px 40px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;line-height:1.25;">
                            ${escapeHtml(ctaLabel)}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#0369a1;font-weight:700;">
                Gratis · sin tarjeta · sin compromiso
              </p>${
                priceLine
                  ? `
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.45;color:#64748b;">
                ${escapeHtml(priceLine)}
              </p>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 26px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#64748b;border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 12px;">${plural ? 'Si no os interesa' : 'Si no te interesa'}, <a href="${escapeAttr(params.optOutUrl)}" style="color:#0284c7;">${plural ? 'daos de baja en un clic' : 'date de baja en un clic'}</a>
                y no ${plural ? 'os' : 'te'} volveremos a escribir. También puedes escribir a
                <a href="mailto:soporte@delfincheckin.com" style="color:#0284c7;">soporte@delfincheckin.com</a>.</p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">© ${year} Delfín Check-in</p>
            </td>
          </tr>
        </table>
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
