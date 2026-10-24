import { sql } from '@/lib/db';
import { ensureEmailSequenceSchema } from '@/lib/email-sequences/schema';

/** Motivos canónicos de suppression global por email. */
export type SuppressionReason = 'bounce' | 'unsubscribe' | 'tenant_inactive' | 'manual';

export type SuppressionSource =
  | 'zoho_undelivered'
  | 'smtp_bounce'
  | 'csv_import'
  | 'unsubscribe_web'
  | 'tenant_status'
  | 'tenant_scan'
  | 'manual'
  | 'outreach_optout'
  | string;

const SUPPRESSION_SCOPE = 'all';

let columnsReady = false;

/** Amplía email_unsubscribes con source + created_at (idempotente). */
export async function ensureEmailSuppressionSchema(): Promise<boolean> {
  const base = await ensureEmailSequenceSchema();
  if (!base) return false;
  if (columnsReady) return true;
  try {
    await sql`ALTER TABLE email_unsubscribes ADD COLUMN IF NOT EXISTS source VARCHAR(80)`;
    await sql`ALTER TABLE email_unsubscribes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`;
    await sql`
      UPDATE email_unsubscribes
      SET created_at = COALESCE(created_at, unsubscribed_at, NOW())
      WHERE created_at IS NULL
    `;
    columnsReady = true;
    return true;
  } catch (e) {
    console.error('ensureEmailSuppressionSchema:', e);
    return false;
  }
}

export function normalizeSuppressionEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

/**
 * True si el email está en la lista de suppression (baja, bounce, tenant inactivo, etc.).
 * Scope global: cualquier fila en email_unsubscribes bloquea marketing/onboarding/secuencias.
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  const normalized = normalizeSuppressionEmail(email);
  if (!normalized || !normalized.includes('@')) return false;

  await ensureEmailSuppressionSchema();

  try {
    const r = await sql`
      SELECT 1 FROM email_unsubscribes
      WHERE LOWER(TRIM(email)) = ${normalized}
      LIMIT 1
    `;
    return r.rows.length > 0;
  } catch (e) {
    console.warn('isEmailSuppressed: consulta falló, no bloquear envío', e);
    return false;
  }
}

export async function upsertEmailSuppression(params: {
  email: string;
  reason: SuppressionReason;
  source?: SuppressionSource;
  scope?: string;
}): Promise<{ inserted: boolean; email: string }> {
  const normalized = normalizeSuppressionEmail(params.email);
  if (!normalized || !normalized.includes('@')) {
    return { inserted: false, email: normalized };
  }

  await ensureEmailSuppressionSchema();

  const scope = params.scope || SUPPRESSION_SCOPE;
  const source = params.source || 'manual';
  const reason = params.reason;

  const before = await sql`
    SELECT 1 FROM email_unsubscribes
    WHERE LOWER(TRIM(email)) = ${normalized} AND scope = ${scope}
    LIMIT 1
  `;

  await sql`
    INSERT INTO email_unsubscribes (email, scope, reason, source, unsubscribed_at, created_at)
    VALUES (${normalized}, ${scope}, ${reason}, ${source}, NOW(), NOW())
    ON CONFLICT (email, scope) DO UPDATE SET
      reason = COALESCE(EXCLUDED.reason, email_unsubscribes.reason),
      source = COALESCE(EXCLUDED.source, email_unsubscribes.source),
      unsubscribed_at = COALESCE(email_unsubscribes.unsubscribed_at, NOW())
  `;

  return { inserted: before.rows.length === 0, email: normalized };
}

export async function upsertEmailSuppressions(
  emails: string[],
  reason: SuppressionReason,
  source: SuppressionSource
): Promise<{ processed: number; inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;
  const seen = new Set<string>();

  for (const raw of emails) {
    const normalized = normalizeSuppressionEmail(raw);
    if (!normalized || !normalized.includes('@') || seen.has(normalized)) {
      skipped += 1;
      continue;
    }
    seen.add(normalized);
    const r = await upsertEmailSuppression({ email: normalized, reason, source });
    if (r.inserted) inserted += 1;
  }

  return { processed: seen.size, inserted, skipped };
}

/** Detecta errores SMTP típicos de bounce permanente (550, mailbox unavailable, etc.). */
export function isSmtpHardBounceError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error || '');
  const code =
    typeof error === 'object' && error !== null && 'responseCode' in error
      ? Number((error as { responseCode?: number }).responseCode)
      : NaN;
  const response =
    typeof error === 'object' && error !== null && 'response' in error
      ? String((error as { response?: string }).response || '')
      : '';

  const blob = `${msg} ${response}`.toLowerCase();

  if (code === 550 || code === 551 || code === 552 || code === 553) return true;
  if (/\b550\b/.test(blob) || /\b551\b/.test(blob) || /\b553\b/.test(blob)) return true;
  if (
    blob.includes('user unknown') ||
    blob.includes('mailbox unavailable') ||
    blob.includes('mailbox not found') ||
    blob.includes('recipient rejected') ||
    blob.includes('no such user') ||
    blob.includes('does not exist') ||
    blob.includes('invalid recipient') ||
    blob.includes('address rejected')
  ) {
    return true;
  }
  return false;
}

/** Si el error es bounce duro, inserta suppression (best-effort). */
export async function maybeSuppressOnSmtpBounce(
  email: string,
  error: unknown
): Promise<boolean> {
  if (!isSmtpHardBounceError(error)) return false;
  try {
    await upsertEmailSuppression({
      email,
      reason: 'bounce',
      source: 'smtp_bounce',
    });
    return true;
  } catch (e) {
    console.warn('maybeSuppressOnSmtpBounce: falló upsert', e);
    return false;
  }
}

const INACTIVE_TENANT_STATUSES = ['cancelled', 'suspended', 'inactive', 'churned'] as const;

export function isInactiveTenantStatus(status: string | null | undefined): boolean {
  const s = String(status || '')
    .trim()
    .toLowerCase();
  return (INACTIVE_TENANT_STATUSES as readonly string[]).includes(s);
}

/** Upsert suppression del owner cuando el tenant pasa a cancelado/inactivo. */
export async function suppressTenantOwnerIfInactive(params: {
  email: string | null | undefined;
  status: string | null | undefined;
  source?: SuppressionSource;
}): Promise<boolean> {
  if (!isInactiveTenantStatus(params.status)) return false;
  const email = normalizeSuppressionEmail(params.email || '');
  if (!email) return false;
  await upsertEmailSuppression({
    email,
    reason: 'tenant_inactive',
    source: params.source || 'tenant_status',
  });
  return true;
}

/** Escanea tenants cancelados/inactivos y suprime emails de owner. */
export async function syncInactiveTenantSuppressions(): Promise<{
  scanned: number;
  suppressed: number;
}> {
  await ensureEmailSuppressionSchema();

  const r = await sql`
    SELECT email, status
    FROM tenants
    WHERE email IS NOT NULL
      AND TRIM(email) <> ''
      AND LOWER(TRIM(status)) IN ('cancelled', 'suspended', 'inactive', 'churned')
  `;

  let suppressed = 0;
  for (const row of r.rows) {
    const ok = await suppressTenantOwnerIfInactive({
      email: String(row.email),
      status: String(row.status),
      source: 'tenant_scan',
    });
    if (ok) suppressed += 1;
  }

  return { scanned: r.rows.length, suppressed };
}

/** Extrae emails de una línea/CSV (columnas email, Email, recipient, etc.). */
export function parseEmailsFromCsvText(text: string): string[] {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const header = lines[0].toLowerCase();
  const hasHeader =
    header.includes('email') ||
    header.includes('recipient') ||
    header.includes('address') ||
    header.includes('to');

  const out: string[] = [];
  const start = hasHeader ? 1 : 0;

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const matches = line.match(emailRe);
    if (matches) {
      for (const m of matches) out.push(m);
    }
  }

  return out;
}
