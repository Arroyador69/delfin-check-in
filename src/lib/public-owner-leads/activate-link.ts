/**
 * Enlace firmado 1-clic: crea tenant FREE + email onboarding desde el mail outreach.
 */

import crypto from 'crypto';

const TOKEN_SCOPE = 'owner_outreach_activate';
/** Validez del enlace (7 días). */
const TTL_SEC = 7 * 24 * 3600;

function getSecret(): string {
  return (
    process.env.EMAIL_UNSUBSCRIBE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.JWT_SECRET ||
    'delfin-owner-outreach-activate-dev'
  );
}

export function signOutreachActivate(email: string, exp: number): string {
  const normalized = email.trim().toLowerCase();
  return crypto
    .createHmac('sha256', getSecret())
    .update(`${normalized}:${exp}:${TOKEN_SCOPE}`)
    .digest('hex');
}

export function verifyOutreachActivateSignature(
  email: string,
  exp: number,
  signature: string
): boolean {
  if (!email || !signature || !exp) return false;
  if (exp * 1000 < Date.now()) return false;
  const expected = signOutreachActivate(email, exp);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** URL 1-clic → crea cuenta gratis + onboarding por email. */
export function buildOutreachActivateUrl(email: string): string {
  const base = String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
  const normalized = email.trim().toLowerCase();
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const sig = signOutreachActivate(normalized, exp);
  const e = Buffer.from(normalized, 'utf8').toString('base64url');
  return `${base}/api/public/outreach-activate?e=${encodeURIComponent(e)}&exp=${exp}&s=${encodeURIComponent(sig)}&ref=owner_outreach`;
}
