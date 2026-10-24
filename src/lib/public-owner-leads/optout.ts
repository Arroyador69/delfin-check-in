import crypto from 'crypto';
import { sql } from '@/lib/db';

const SCOPE = 'marketing';
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

export function verifyOutreachOptOutSignature(email: string, signature: string): boolean {
  if (!email || !signature) return false;
  const expected = signOutreachOptOut(email);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function buildOutreachOptOutUrl(email: string, locale = 'es'): string {
  const base = String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
  const normalized = email.trim().toLowerCase();
  const sig = signOutreachOptOut(normalized);
  const e = Buffer.from(normalized, 'utf8').toString('base64url');
  const loc = locale.trim() || 'es';
  return `${base}/${loc}/baja-outreach?e=${encodeURIComponent(e)}&s=${encodeURIComponent(sig)}`;
}

export function decodeOptOutEmail(encoded: string): string | null {
  try {
    return Buffer.from(encoded, 'base64url').toString('utf8').trim().toLowerCase();
  } catch {
    return null;
  }
}

/** Marca baja en email_unsubscribes (marketing) y public_owner_leads si existe. */
export async function recordOutreachOptOut(email: string, reason?: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const { upsertEmailSuppression } = await import('@/lib/email-suppression');

  await upsertEmailSuppression({
    email: normalized,
    reason: 'unsubscribe',
    source: 'outreach_optout',
    scope: SCOPE,
  });
  await upsertEmailSuppression({
    email: normalized,
    reason: 'unsubscribe',
    source: reason || 'outreach_optout',
    scope: 'all',
  });

  try {
    const meta = await sql`SELECT to_regclass('public.public_owner_leads') AS reg`;
    if (meta.rows[0]?.reg) {
      await sql`
        UPDATE public_owner_leads
        SET
          opted_out = true,
          opted_out_at = NOW(),
          status = CASE WHEN status = 'queued' THEN 'skipped' ELSE status END,
          updated_at = NOW(),
          notes = COALESCE(notes, '') || ' | opt-out web'
        WHERE LOWER(TRIM(email)) = ${normalized}
      `;
    }
  } catch (e) {
    console.warn('[outreach-optout] public_owner_leads no actualizada:', e);
  }
}
