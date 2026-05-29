import crypto from 'crypto';
import { sql } from '@/lib/db';

const SCOPE = 'lifecycle';

function getSecret(): string {
  return (
    process.env.EMAIL_UNSUBSCRIBE_SECRET ||
    process.env.CRON_SECRET ||
    process.env.JWT_SECRET ||
    'delfin-lifecycle-unsub-dev'
  );
}

export function signUnsubscribeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  return crypto.createHmac('sha256', getSecret()).update(`${normalized}:${SCOPE}`).digest('hex');
}

export function verifyUnsubscribeSignature(email: string, signature: string): boolean {
  if (!email || !signature) return false;
  const expected = signUnsubscribeEmail(email);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function buildUnsubscribeUrl(email: string): string {
  const base = String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
  const normalized = email.trim().toLowerCase();
  const sig = signUnsubscribeEmail(normalized);
  const e = Buffer.from(normalized, 'utf8').toString('base64url');
  return `${base}/api/email/unsubscribe?e=${encodeURIComponent(e)}&s=${encodeURIComponent(sig)}`;
}

export async function recordUnsubscribe(
  email: string,
  reason?: string
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  await sql`
    INSERT INTO email_unsubscribes (email, scope, reason)
    VALUES (${normalized}, ${SCOPE}, ${reason || null})
    ON CONFLICT (email, scope) DO NOTHING
  `;

  await sql`
    UPDATE email_sequence_enrollments e
    SET status = 'paused', updated_at = NOW()
    FROM tenants t
    WHERE e.tenant_id = t.id
      AND LOWER(TRIM(t.email)) = ${normalized}
      AND e.status = 'active'
  `;
}

export function decodeUnsubscribeEmail(encoded: string): string | null {
  try {
    return Buffer.from(encoded, 'base64url').toString('utf8').trim().toLowerCase();
  } catch {
    return null;
  }
}
