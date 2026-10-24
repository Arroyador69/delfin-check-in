import crypto from 'crypto';

const TOKEN_SCOPE = 'owner_outreach';

function getSecret(): string {
  return (
    process.env.EMAIL_UNSUBSCRIBE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.JWT_SECRET ||
    'delfin-owner-outreach-unsub-dev'
  );
}

export function signOutreachOptOut(email: string): string {
  const normalized = email.trim().toLowerCase();
  return crypto
    .createHmac('sha256', getSecret())
    .update(`${normalized}:${TOKEN_SCOPE}`)
    .digest('hex');
}

export function buildOutreachOptOutUrl(email: string, locale = 'es'): string {
  const base = String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
  const normalized = email.trim().toLowerCase();
  const sig = signOutreachOptOut(normalized);
  const e = Buffer.from(normalized, 'utf8').toString('base64url');
  return `${base}/${locale}/baja-outreach?e=${encodeURIComponent(e)}&s=${encodeURIComponent(sig)}`;
}
