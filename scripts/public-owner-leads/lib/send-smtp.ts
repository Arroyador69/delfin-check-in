import nodemailer from 'nodemailer';

export function createOutreachTransport() {
  const host = process.env.SMTP_HOST || '';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !user || !pass) {
    const missing = [];
    if (!host) missing.push('SMTP_HOST');
    if (!user) missing.push('SMTP_USER');
    if (!pass) missing.push('SMTP_PASS o SMTP_PASSWORD');
    throw new Error(`SMTP no configurado. Faltan: ${missing.join(', ')}`);
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export function outreachFromAddress(): string {
  return (
    process.env.SMTP_FROM_OUTREACH ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    'hola@delfincheckin.com'
  );
}

export async function sendOutreachMail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ messageId?: string }> {
  const transport = createOutreachTransport();
  const info = await transport.sendMail({
    from: outreachFromAddress(),
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
    headers: {
      'List-Unsubscribe': `<mailto:soporte@delfincheckin.com?subject=baja>`,
      'X-Delfin-Campaign': 'public-owner-leads',
    },
  });
  return { messageId: info.messageId };
}
