/**
 * Reintenta emails de onboarding con status=failed (p.ej. rate-limit Zoho).
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
import { isSyntheticTestEmail } from '@/lib/synthetic-test-email';
import { isOnboardingWelcomeRetryPaused } from '@/lib/public-owner-leads/constants';

export async function retryFailedOnboardingEmails(opts?: {
  dryRun?: boolean;
  max?: number;
  /** Solo este email (recover puntual). */
  email?: string;
  /** Ignorar kill switch (reenvío manual SuperAdmin / script). */
  force?: boolean;
}): Promise<{
  scanned: number;
  retried: number;
  sent: number;
  skipped: number;
  errors: string[];
  paused?: boolean;
}> {
  const dryRun = Boolean(opts?.dryRun);
  const max = Math.min(Math.max(opts?.max ?? 15, 1), 40);
  const errors: string[] = [];
  let scanned = 0;
  let retried = 0;
  let sent = 0;
  let skipped = 0;

  if (isOnboardingWelcomeRetryPaused() && !opts?.force && !opts?.email) {
    return {
      scanned: 0,
      retried: 0,
      sent: 0,
      skipped: 0,
      errors: [
        'Reintentos bienvenida pausados (ONBOARDING_WELCOME_RETRY_PAUSED / captación) — Zoho SMTP',
      ],
      paused: true,
    };
  }

  const meta = await sql`SELECT to_regclass('public.email_tracking') AS reg`;
  if (!meta.rows[0]?.reg) {
    return { scanned: 0, retried: 0, sent: 0, skipped: 0, errors: ['email_tracking ausente'] };
  }

  const emailFilter = opts?.email?.trim().toLowerCase() || null;

  // Incluye failed + pending (rate-limit Zoho no debe quedar como “fallido” duro).
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
        LIMIT ${max}
      `;

  scanned = failed.rows.length;

  for (const row of failed.rows) {
    const email = String(row.recipient_email || '')
      .trim()
      .toLowerCase();
    if (!email.includes('@')) {
      skipped++;
      continue;
    }
    if (isSyntheticTestEmail(email)) {
      skipped++;
      continue;
    }

    try {
      const owner = await findOnboardingOwnerByEmail(email);
      if (!owner?.user_id) {
        skipped++;
        continue;
      }
      if (String(owner.onboarding_status || '').toLowerCase() === 'completed') {
        skipped++;
        continue;
      }

      await liftFalseSmtpBounceSuppression(email);

      if (dryRun) {
        retried++;
        continue;
      }

      const { token, tempPassword } = await issueFreshOnboardingCredentials(owner.user_id);
      // Lite si viene de outreach / 1-clic (notas tenant o waitlist)
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
      });

      retried++;
      if (mail?.success) {
        sent++;
        // Marcar el tracking fallido/pending anterior como superseded (best-effort)
        try {
          await sql`
            UPDATE email_tracking
            SET
              metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
                superseded_by_retry: true,
              })}::jsonb,
              updated_at = NOW()
            WHERE id = ${row.id}::uuid AND status IN ('failed', 'pending')
          `;
        } catch {
          /* ignore */
        }
      } else {
        errors.push(`${email}:${mail?.error || 'no_success'}`);
        // Si Zoho sigue a rate-limit, no martillar el resto del lote
        if (/Unusual sending|5\.4\.6|try after sometime|rate.?limit/i.test(String(mail?.error || ''))) {
          errors.push('abort:zoho-rate-limit');
          break;
        }
      }
      // Pausa corta entre reenvíos (mismo buzón SMTP que outreach)
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

  return { scanned, retried, sent, skipped, errors };
}
