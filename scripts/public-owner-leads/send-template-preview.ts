#!/usr/bin/env npx tsx
/**
 * Envía la plantilla real de captación a un buzón de prueba (no cuenta en cupo).
 * Uso: npx tsx scripts/public-owner-leads/send-template-preview.ts [email]
 */
import { buildColdOutreachEmail } from '../../src/lib/public-owner-leads/template';
import { buildOutreachOptOutUrl } from '../../src/lib/public-owner-leads/optout';
import { buildOutreachActivateUrl } from '../../src/lib/public-owner-leads/activate-link';
import { sendOutreachMail } from '../../src/lib/public-owner-leads/send-smtp';

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
    senderName: 'Alberto',
  });

  const subject = `[PREVIEW plantilla captación] ${mail.subject}`;
  const info = await sendOutreachMail({
    to,
    subject,
    text: `--- ESTO ES UNA PREVIEW PARA REVISAR LA PLANTILLA (no es un lead real) ---\n\n${mail.text}`,
    html: `<div style="background:#fef3c7;padding:10px 14px;font-family:system-ui;font-size:13px;margin-bottom:12px;border-radius:8px"><strong>Preview</strong> — mismo HTML que reciben los propietarios. No cuenta en el cupo de captación.</div>${mail.html}`,
    optOutUrl,
  });

  console.log(JSON.stringify({ ok: true, to, subject, messageId: info.messageId }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
