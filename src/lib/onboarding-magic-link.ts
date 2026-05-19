import crypto from 'crypto';
import { sql } from '@/lib/db';

export const ONBOARDING_TOKEN_HOURS = 72;

let schemaEnsured = false;

/** Columnas dedicadas al magic link de onboarding (no compartir con reset_token de recovery). */
export async function ensureOnboardingMagicTokenSchema(): Promise<void> {
  if (schemaEnsured) return;
  try {
    await sql`
      ALTER TABLE tenant_users
      ADD COLUMN IF NOT EXISTS onboarding_magic_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS onboarding_magic_token_expires TIMESTAMPTZ
    `;
    schemaEnsured = true;
  } catch (e) {
    console.warn('ensureOnboardingMagicTokenSchema:', e);
  }
}

export function generateOnboardingToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function onboardingTokenExpiry(): Date {
  const d = new Date();
  d.setHours(d.getHours() + ONBOARDING_TOKEN_HOURS);
  return d;
}

export function buildOnboardingUrl(token: string, email: string, locale = 'es'): string {
  const base = String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
  const loc = locale && locale !== 'es' ? `/${locale}` : '/es';
  return `${base}${loc}/onboarding?token=${token}&email=${encodeURIComponent(email)}`;
}

/** Owner row for onboarding magic link (tenant + user). */
export async function findOnboardingOwnerByEmail(emailRaw: string) {
  await ensureOnboardingMagicTokenSchema();
  const email = emailRaw.trim().toLowerCase();
  const result = await sql`
    SELECT
      t.id as tenant_id,
      t.name as tenant_name,
      t.email as tenant_email,
      t.status,
      t.onboarding_status,
      tu.id as user_id,
      tu.email as user_email,
      tu.onboarding_magic_token,
      tu.onboarding_magic_token_expires,
      tu.reset_token,
      tu.reset_token_expires,
      tu.email_verified
    FROM tenants t
    JOIN tenant_users tu ON t.id = tu.tenant_id
    WHERE tu.role = 'owner'
      AND tu.is_active = true
      AND (
        LOWER(TRIM(t.email)) = ${email}
        OR LOWER(TRIM(tu.email)) = ${email}
      )
    ORDER BY tu.created_at DESC
    LIMIT 1
  `;
  return result.rows[0] as
    | {
        tenant_id: string;
        tenant_name: string;
        tenant_email: string;
        status: string;
        onboarding_status: string | null;
        user_id: string;
        user_email: string;
        onboarding_magic_token: string | null;
        onboarding_magic_token_expires: Date | string | null;
        reset_token: string | null;
        reset_token_expires: Date | string | null;
        email_verified: boolean;
      }
    | undefined;
}

export async function issueFreshOnboardingToken(userId: string): Promise<{
  token: string;
  expires: Date;
}> {
  await ensureOnboardingMagicTokenSchema();
  const token = generateOnboardingToken();
  const expires = onboardingTokenExpiry();
  await sql`
    UPDATE tenant_users
    SET
      onboarding_magic_token = ${token},
      onboarding_magic_token_expires = ${expires.toISOString()},
      updated_at = NOW()
    WHERE id = ${userId}
  `;
  return { token, expires };
}

/** Invalida el magic link de onboarding (p. ej. tras cambiar contraseña o completar). */
export async function clearOnboardingMagicToken(userId: string): Promise<void> {
  await ensureOnboardingMagicTokenSchema();
  await sql`
    UPDATE tenant_users
    SET
      onboarding_magic_token = NULL,
      onboarding_magic_token_expires = NULL,
      updated_at = NOW()
    WHERE id = ${userId}
  `;
}
