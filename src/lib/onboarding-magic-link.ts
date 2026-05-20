import crypto from 'crypto';
import { sql } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import type { OnboardingEmailVariant } from '@/lib/mailer';

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

/** Ruta pública de ayuda si un antivirus bloquea el enlace de activación. */
export function buildAntivirusHelpUrl(locale = 'es'): string {
  const base = String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
  const loc = locale && locale !== 'es' ? `/${locale}` : '/es';
  return `${base}${loc}/help/blocked-by-antivirus`;
}

/**
 * Enlace de activación (magic link). Solo `token` en la URL (menos falsos positivos AV).
 * Enlaces antiguos con `&email=` siguen funcionando en login/onboarding.
 */
export function buildOnboardingUrl(token: string, locale = 'es'): string {
  const base = String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(
    /\/+$/,
    ''
  );
  const loc = locale && locale !== 'es' ? `/${locale}` : '/es';
  return `${base}${loc}/onboarding?token=${encodeURIComponent(token)}`;
}

/** Resuelve owner por token activo (onboarding_magic_token o reset_token legacy). */
export async function findOnboardingOwnerByMagicToken(token: string) {
  await ensureOnboardingMagicTokenSchema();
  const result = await sql`
    SELECT
      t.id as tenant_id,
      t.name as tenant_name,
      t.email as tenant_email,
      t.status,
      t.onboarding_status,
      t.plan_id,
      t.plan_type,
      tu.id as user_id,
      tu.email as user_email,
      tu.onboarding_magic_token,
      tu.onboarding_magic_token_expires
    FROM tenants t
    JOIN tenant_users tu ON t.id = tu.tenant_id
    WHERE tu.role = 'owner'
      AND tu.is_active = true
      AND (
        (tu.onboarding_magic_token = ${token} AND tu.onboarding_magic_token_expires > NOW())
        OR (
          tu.onboarding_magic_token IS NULL
          AND tu.reset_token = ${token}
          AND tu.reset_token_expires > NOW()
          AND length(tu.reset_token) >= 32
        )
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
        plan_id: string | null;
        plan_type: string | null;
        user_id: string;
        user_email: string;
      }
    | undefined;
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
      t.plan_id,
      t.plan_type,
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
        plan_id: string | null;
        plan_type: string | null;
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

export function generateOnboardingTempPassword(): string {
  return crypto.randomBytes(12).toString('base64').slice(0, 16);
}

export async function rotateOnboardingTempPassword(userId: string): Promise<string> {
  const tempPassword = generateOnboardingTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await sql`
    UPDATE tenant_users
    SET password_hash = ${passwordHash}, updated_at = NOW()
    WHERE id = ${userId}
  `;
  return tempPassword;
}

export async function issueFreshOnboardingCredentials(userId: string): Promise<{
  token: string;
  expires: Date;
  tempPassword: string;
}> {
  const tempPassword = await rotateOnboardingTempPassword(userId);
  const { token, expires } = await issueFreshOnboardingToken(userId);
  return { token, expires, tempPassword };
}

export function onboardingEmailVariantForOwner(planType?: string | null): OnboardingEmailVariant {
  if (planType === 'free') return 'waitlist_launch';
  return 'default';
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
