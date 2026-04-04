import nodemailer from 'nodemailer';

/**
 * Correos de notas de limpieza (misma pista SMTP que el resto del producto).
 * Vercel: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (o SMTP_PASSWORD), SMTP_SECURE opcional.
 * Remitente: SMTP_FROM_CLEANING → SMTP_FROM_BOOKING → SMTP_FROM_ONBOARDING → SMTP_FROM → noreply@delfincheckin.com
 */
export function getCleaningNotifyTransporter(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) return null;
  const user = process.env.SMTP_USER?.trim();
  const pass = (process.env.SMTP_PASSWORD || process.env.SMTP_PASS)?.trim();
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

export function getCleaningNotifyFrom(): string {
  return (
    process.env.SMTP_FROM_CLEANING?.trim() ||
    process.env.SMTP_FROM_BOOKING?.trim() ||
    process.env.SMTP_FROM_ONBOARDING?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    '"Delfín Check-in" <noreply@delfincheckin.com>'
  );
}
