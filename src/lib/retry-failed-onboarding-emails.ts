/**
 * Reintenta emails de onboarding:
 * - status failed/pending (rate-limit Zoho, etc.)
 * - status sent sin abrir + onboarding incompleto (≥24h) → nuevo asunto (best practice SaaS)
 * No reenvía si el tenant ya completó onboarding o hay bounce real.
 */

import { sql } from '@/lib/db';
import { sendOnboardingEmail } from '@/lib/mailer';
import {
  buildOnboardingUrl,
  findOnboardingOwnerByEmail,
  issueFreshOnboardingCredentials,
  onboardingEmailVariantForOwner,
} from '@/lib/onboarding-magic-link';
import { liftFalseSmtpBounceSuppression } from '@/lib/email-suppression';

type TrackRow = {
  id: string;
  recipient_email: string;
  tenant_id: string;
  status: string;
  kind: 'failed' | 'unopened';
};

async function sendOneOnboardingRetry(opts: {
  email: string;
  tenantIdHint?: string;
  dryRun: boolean;
  subjectOverride?: string;
  trackingId?: string;
}): Promise<'sent' | 'skipped' | 'dry' | { error: string }> {
  const email = opts.email;
  const owner = await findOnboardingOwnerByEmail(email);
  if (!owner?.user_id) return 'skipped';
  if (String(owner.onboarding_status || '').toLowerCase() === 'completed') {
    // Completado sin habitaciones: igual conviene nudge, pero no vía este path de "pending"
    return 'skipped';
  }

  await liftFalseSmtpBounceSuppression(email);

  if (opts.dryRun) return 'dry';

  const { token, tempPassword } = await issueFreshOnboardingCredentials(owner.user_id);
  let outreachLite = false;
  try {
    const notesR = await sql`
      SELECT notes FROM tenants WHERE id = ${owner.tenant_id}::uuid LIMIT 1
    `;
    const notes = String(notesR.rows[0]?.notes || '');
    outreachLite = /outreach|one.?click|owner_outreach/i.test(notes);
  } catch {
    /* ignore */
  }
  // Forzar path lite (crear habitación) también si la alta fue 1-clic por email tracking
  if (!outreachLite && opts.tenantIdHint) {
    outreachLite = true;
  }
  const onboardingUrl = buildOnboardingUrl(
    token,
    'es',
    outreachLite ? { src: 'outreach' } : undefined
  );
  const mail = await sendOnboardingEmail({
    to: email,
    onboardingUrl,
    tempPassword,
    tenantId: owner.tenant_id,
    variant: onboardingEmailVariantForOwner(owner.plan_type),
    locale: 'es',
    subjectOverride: opts.subjectOverride,
  });

  if (mail?.success) {
    if (opts.trackingId) {
      try {
        await sql`
          UPDATE email_tracking
          SET
            metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
              superseded_by_retry: true,
              retry_kind: opts.subjectOverride ? 'unopened_nudge' : 'failed_retry',
            })}::jsonb,
            updated_at = NOW()
          WHERE id = ${opts.trackingId}::uuid
        `;
      } catch {
        /* ignore */
      }
    }
    return 'sent';
  }
  return { error: String(mail?.error || 'no_success') };
}

export async function retryFailedOnboardingEmails(opts?: {
  dryRun?: boolean;
  max?: number;
  /** Solo este email (recover puntual). */
  email?: string;
}): Promise<{
  scanned: number;
  retried: number;
  sent: number;
  skipped: number;
  unopenedNudged: number;
  errors: string[];
}> {
  const dryRun = Boolean(opts?.dryRun);
  const max = Math.min(Math.max(opts?.max ?? 15, 1), 40);
  const errors: string[] = [];
  let scanned = 0;
  let retried = 0;
  let sent = 0;
  let skipped = 0;
  let unopenedNudged = 0;

  const meta = await sql`SELECT to_regclass('public.email_tracking') AS reg`;
  if (!meta.rows[0]?.reg) {
    return {
      scanned: 0,
      retried: 0,
      sent: 0,
      skipped: 0,
      unopenedNudged: 0,
      errors: ['email_tracking ausente'],
    };
  }

  const emailFilter = opts?.email?.trim().toLowerCase() || null;
  const rows: TrackRow[] = [];

  // 1) Fallidos / pending SMTP
  const failed = emailFilter
    ? await sql`
        SELECT DISTINCT ON (LOWER(TRIM(recipient_email)))
          id::text AS id,
          recipient_email,
          tenant_id::text AS tenant_id,
          status
        FROM email_tracking
        WHERE status IN ('failed', 'pending')
          AND email_type = 'onboarding'
          AND LOWER(TRIM(recipient_email)) = ${emailFilter}
          AND created_at >= NOW() - INTERVAL '14 days'
        ORDER BY LOWER(TRIM(recipient_email)), created_at DESC
        LIMIT ${max}
      `
    : await sql`
        SELECT DISTINCT ON (LOWER(TRIM(recipient_email)))
          id::text AS id,
          recipient_email,
          tenant_id::text AS tenant_id,
          status
        FROM email_tracking
        WHERE status IN ('failed', 'pending')
          AND email_type = 'onboarding'
          AND created_at >= NOW() - INTERVAL '7 days'
        ORDER BY LOWER(TRIM(recipient_email)), created_at DESC
        LIMIT ${Math.ceil(max / 2)}
      `;

  for (const r of failed.rows) {
    rows.push({
      id: String(r.id),
      recipient_email: String(r.recipient_email || ''),
      tenant_id: String(r.tenant_id || ''),
      status: String(r.status || ''),
      kind: 'failed',
    });
  }

  // 2) Enviados sin abrir + tenant onboarding incompleto (24h–7d)
  // Best practice: mismo cuerpo, asunto nuevo → recupera ~15-20% opens
  if (!emailFilter || rows.length < max) {
    const remain = Math.max(1, max - rows.length);
    const unopened = emailFilter
      ? await sql`
          SELECT DISTINCT ON (LOWER(TRIM(et.recipient_email)))
            et.id::text AS id,
            et.recipient_email,
            et.tenant_id::text AS tenant_id,
            et.status
          FROM email_tracking et
          JOIN tenants t ON t.id = et.tenant_id
          WHERE et.email_type = 'onboarding'
            AND et.status = 'sent'
            AND et.opened_at IS NULL
            AND COALESCE(et.opened_count, 0) = 0
            AND et.clicked_at IS NULL
            AND et.created_at <= NOW() - INTERVAL '24 hours'
            AND et.created_at >= NOW() - INTERVAL '7 days'
            AND COALESCE(t.onboarding_status, 'pending') IN ('pending', 'in_progress')
            AND LOWER(TRIM(et.recipient_email)) = ${emailFilter}
            AND COALESCE(et.metadata->>'superseded_by_retry', 'false') <> 'true'
          ORDER BY LOWER(TRIM(et.recipient_email)), et.created_at DESC
          LIMIT ${remain}
        `
      : await sql`
          SELECT DISTINCT ON (LOWER(TRIM(et.recipient_email)))
            et.id::text AS id,
            et.recipient_email,
            et.tenant_id::text AS tenant_id,
            et.status
          FROM email_tracking et
          JOIN tenants t ON t.id = et.tenant_id
          WHERE et.email_type = 'onboarding'
            AND et.status = 'sent'
            AND et.opened_at IS NULL
            AND COALESCE(et.opened_count, 0) = 0
            AND et.clicked_at IS NULL
            AND et.created_at <= NOW() - INTERVAL '24 hours'
            AND et.created_at >= NOW() - INTERVAL '7 days'
            AND COALESCE(t.onboarding_status, 'pending') IN ('pending', 'in_progress')
            AND COALESCE(et.metadata->>'superseded_by_retry', 'false') <> 'true'
          ORDER BY LOWER(TRIM(et.recipient_email)), et.created_at DESC
          LIMIT ${remain}
        `;

    const seen = new Set(rows.map((r) => r.recipient_email.toLowerCase()));
    for (const r of unopened.rows) {
      const em = String(r.recipient_email || '').toLowerCase();
      if (!em || seen.has(em)) continue;
      seen.add(em);
      rows.push({
        id: String(r.id),
        recipient_email: String(r.recipient_email || ''),
        tenant_id: String(r.tenant_id || ''),
        status: String(r.status || ''),
        kind: 'unopened',
      });
    }
  }

  scanned = rows.length;

  for (const row of rows) {
    const email = String(row.recipient_email || '')
      .trim()
      .toLowerCase();
    if (!email.includes('@')) {
      skipped++;
      continue;
    }

    try {
      const subjectOverride =
        row.kind === 'unopened'
          ? '⏳ Tu habitación en Delfín sigue sin crear (1 min)'
          : undefined;

      const result = await sendOneOnboardingRetry({
        email,
        tenantIdHint: row.tenant_id,
        dryRun,
        subjectOverride,
        trackingId: row.id,
      });

      if (result === 'skipped') {
        skipped++;
        continue;
      }
      retried++;
      if (result === 'dry') continue;
      if (result === 'sent') {
        sent++;
        if (row.kind === 'unopened') unopenedNudged++;
      } else if (typeof result === 'object' && result.error) {
        errors.push(`${email}:${result.error}`);
        if (/Unusual sending|5\.4\.6|try after sometime|rate.?limit/i.test(result.error)) {
          errors.push('abort:zoho-rate-limit');
          break;
        }
      }
      await new Promise((r) => setTimeout(r, 1800));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${email}:${msg}`);
      if (/Unusual sending|5\.4\.6|try after sometime|rate.?limit/i.test(msg)) {
        errors.push('abort:zoho-rate-limit');
        break;
      }
    }
  }

  return { scanned, retried, sent, skipped, unopenedNudged, errors };
}
