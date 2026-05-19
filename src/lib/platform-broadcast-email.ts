/**
 * Plantilla de email masivo / comunicaciones de plataforma (estilo Delfín Check-in).
 * Tablas + estilos inline para compatibilidad Gmail/Outlook.
 */

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Convierte párrafos separados por línea en blanco a HTML seguro. */
export function paragraphsToHtml(body: string): string {
  const blocks = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return '<p style="margin:0 0 16px 0;">&nbsp;</p>';
  }

  return blocks
    .map((p) => {
      const withBreaks = escapeHtmlText(p).replace(/\n/g, '<br />');
      return `<p style="margin:0 0 16px 0;">${withBreaks}</p>`;
    })
    .join('\n');
}

export type PlatformBroadcastEmailParams = {
  subject: string;
  heroTitle: string;
  heroSubtitle?: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
};

export function buildPlatformBroadcastPlainText(params: PlatformBroadcastEmailParams): string {
  const lines: string[] = [
    params.heroTitle,
    params.heroSubtitle || '',
    '',
    params.body.trim(),
    '',
  ];
  if (params.ctaLabel && params.ctaUrl) {
    lines.push(`${params.ctaLabel}: ${params.ctaUrl}`, '');
  }
  if (params.footerNote) {
    lines.push(params.footerNote, '');
  }
  lines.push(`© ${new Date().getFullYear()} Delfín Check-in`);
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}

export function buildPlatformBroadcastEmailHtml(params: PlatformBroadcastEmailParams): string {
  const heroSubtitle = params.heroSubtitle
    ? `<p style="margin:12px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.4;color:#e8e9ff;">${escapeHtmlText(params.heroSubtitle)}</p>`
    : '';

  const bodyHtml = paragraphsToHtml(params.body);

  const ctaBlock =
    params.ctaLabel && params.ctaUrl
      ? `
          <tr>
            <td align="center" style="padding:8px 32px 24px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                <tr>
                  <td align="center" bgcolor="#2563eb" style="background-color:#2563eb;border-radius:8px;">
                    <a href="${escapeHtmlAttr(params.ctaUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#ffffff !important;text-decoration:none;border-radius:8px;">${escapeHtmlText(params.ctaLabel)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
      : '';

  const footerNote = params.footerNote
    ? `
          <tr>
            <td style="padding:0 32px 16px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fff8e6;border-left:4px solid #e6a800;border-radius:4px;">
                <tr>
                  <td style="padding:16px 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#6d5200;">
                    ${escapeHtmlText(params.footerNote)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtmlText(params.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td align="center" style="padding:32px 24px;background-color:#5b63d9;">
              <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1;">🐬</p>
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.25;color:#ffffff;font-weight:bold;">${escapeHtmlText(params.heroTitle)}</h1>
              ${heroSubtitle}
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#333333;">
              ${bodyHtml}
            </td>
          </tr>
          ${ctaBlock}
          ${footerNote}
          <tr>
            <td style="padding:20px 24px;background-color:#f8f9fa;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#6b7280;text-align:center;">
              <p style="margin:0;">Delfín Check-in — gestión de alojamientos</p>
              <p style="margin:8px 0 0 0;">© ${new Date().getFullYear()} Delfín Check-in</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Texto por defecto para campaña de reactivación tras fix de onboarding. */
export const REACTIVATION_BROADCAST_DEFAULTS = {
  subject: 'Ya puedes activar tu cuenta en Delfín Check-in 🐬',
  heroTitle: 'Tu cuenta ya está lista',
  heroSubtitle: 'Hemos corregido un problema de acceso — retoma la configuración cuando quieras',
  body: `Hola,

Gracias por registrarte en Delfín Check-in. Detectamos un problema técnico que impedía completar la activación en el primer acceso; ya está solucionado.

Qué hacer ahora:
1. Abre de nuevo el email de activación que te enviamos al registrarte (revisa spam o promociones).
2. Si ves un error de token, pulsa «Enviar nuevo enlace de activación» en esa pantalla (válido 72 horas).
3. También puedes entrar en el panel con tu email y contraseña.

Dentro del panel encontrarás vídeos paso a paso para configurar MIR, limpieza, microsite y más. Varios propietarios ya están probando la plataforma y seguimos mejorando cada día con vuestro feedback.

Si algo no te cuadra, responde a este correo y te ayudamos.`,
  ctaLabel: 'Entrar al panel',
  ctaUrl: 'https://admin.delfincheckin.com/admin-login',
  footerNote:
    'Consejo: si no ves nuestros correos, revisa la carpeta Spam y márcalos como «correo deseado».',
} as const;
