#!/usr/bin/env npx tsx
/**
 * Envía la plantilla real de captación a un buzón de prueba (no cuenta en cupo).
 * Uso: npx tsx scripts/public-owner-leads/send-template-preview.ts [email]
 *
 * Incluye logos de redes embebidos (CID) para que se vean aunque aún no estén en prod.
 */
import path from 'path';
import fs from 'fs';
import { buildColdOutreachEmail, getOutreachSocialLinks } from '../../src/lib/public-owner-leads/template';
import { buildOutreachOptOutUrl } from '../../src/lib/public-owner-leads/optout';
import { buildOutreachActivateUrl } from '../../src/lib/public-owner-leads/activate-link';
import { createOutreachTransport, outreachFromAddress } from '../../src/lib/public-owner-leads/send-smtp';

async function main() {
  const to = (process.argv[2] || 'contacto@delfincheckin.com').trim().toLowerCase();
  const domain = 'ejemplo-casa-rural.es';
  const sourceUrl = 'https://www.ejemplo-casa-rural.es/contacto';
  const optOutUrl = buildOutreachOptOutUrl(to, 'es');
  const signupUrl = buildOutreachActivateUrl(to);

  const mail = buildColdOutreachEmail({
    toEmail: to,
    domain,
    sourceUrl,
    optOutUrl,
    signupUrl,
    senderName: 'Alberto · Delfín Check-in',
  });

  const socials = getOutreachSocialLinks();
  const iconsDir = path.join(process.cwd(), 'public/email/social');
  let html = mail.html;
  const attachments: Array<{
    filename: string;
    path: string;
    cid: string;
    contentType: string;
  }> = [];

  for (const s of socials) {
    const filePath = path.join(iconsDir, s.iconFile);
    if (!fs.existsSync(filePath)) continue;
    const cid = `social-${s.iconFile}`;
    attachments.push({
      filename: s.iconFile,
      path: filePath,
      cid,
      contentType: 'image/png',
    });
    // Sustituir URL absoluta por cid: para esta preview
    html = html.split(s.icon).join(`cid:${cid}`);
  }

  // Comprobar CTAs críticos en HTML
  const checks = {
    hasActivateCta: html.includes('/api/public/outreach-activate') || html.includes('Probar gratis'),
    hasVideo: html.includes('youtube.com') || html.includes(sourceUrl),
    hasOptOut: html.includes(optOutUrl) || html.includes('date de baja'),
    hasInstagram: html.includes('instagram.com'),
    hasFacebook: html.includes('facebook.com'),
    hasYoutube: html.includes('youtube.com'),
    socialIconsEmbedded: attachments.length === 4,
  };
  console.log(JSON.stringify({ checks, signupUrlPreview: signupUrl.slice(0, 80) + '…' }, null, 2));
  if (!checks.hasActivateCta || !checks.hasOptOut || !checks.socialIconsEmbedded) {
    throw new Error('Plantilla incompleta: faltan CTA, baja o logos sociales');
  }

  const subject = `[PREVIEW plantilla captación] ${mail.subject}`;
  const transport = createOutreachTransport();
  const listUnsub = `<${optOutUrl}>, <mailto:soporte@delfincheckin.com?subject=baja>`;
  const info = await transport.sendMail({
    from: outreachFromAddress(),
    to,
    subject,
    text: `--- ESTO ES UNA PREVIEW PARA REVISAR LA PLANTILLA (no es un lead real) ---\n\nCTA registro 1-clic:\n${signupUrl}\n\n${mail.text}`,
    html: `<div style="background:#fef3c7;padding:10px 14px;font-family:system-ui;font-size:13px;margin-bottom:12px;border-radius:8px"><strong>Preview</strong> — mismo HTML que reciben los propietarios. Botón «Probar gratis» = alta 1-clic. Logos sociales embebidos. No cuenta en el cupo de captación.</div>${html}`,
    attachments,
    headers: {
      'List-Unsubscribe': listUnsub,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      'X-Delfin-Campaign': 'public-owner-leads-preview',
    },
  });

  console.log(JSON.stringify({ ok: true, to, subject, messageId: info.messageId, attachments: attachments.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
