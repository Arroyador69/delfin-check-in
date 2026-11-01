import crypto from 'crypto';
import { sql } from '@/lib/db';
import { stopSequenceByEmail } from './sequence-db';

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

  await sql`
    CREATE TABLE IF NOT EXISTS email_unsubscribes (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      scope VARCHAR(50) DEFAULT 'lifecycle',
      reason TEXT,
      unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(email, scope)
    )
  `;

  await sql`
    INSERT INTO email_unsubscribes (email, scope, reason)
    VALUES (${normalized}, ${SCOPE}, ${reason || 'owner_outreach_optout'})
    ON CONFLICT (email, scope) DO NOTHING
  `;

  await sql`
    INSERT INTO email_unsubscribes (email, scope, reason)
    VALUES (${normalized}, 'all', ${reason || 'owner_outreach_optout'})
    ON CONFLICT (email, scope) DO NOTHING
  `;

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
      // Parar follow-ups (no-op seguro si la migración followup no está aplicada)
      await stopSequenceByEmail(normalized, 'stopped_optout');
    }
  } catch (e) {
    console.warn('[outreach-optout] public_owner_leads no actualizada:', e);
  }
}
