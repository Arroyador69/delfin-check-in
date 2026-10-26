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
  errors: string[];
}> {
  const dryRun = Boolean(opts?.dryRun);
  const max = Math.min(Math.max(opts?.max ?? 15, 1), 40);
  const errors: string[] = [];
  let scanned = 0;
  let retried = 0;
  let sent = 0;
  let skipped = 0;

  const meta = await sql`SELECT to_regclass('public.email_tracking') AS reg`;
  if (!meta.rows[0]?.reg) {
    return { scanned: 0, retried: 0, sent: 0, skipped: 0, errors: ['email_tracking ausente'] };
  }

  const emailFilter = opts?.email?.trim().toLowerCase() || null;

  const failed = emailFilter
    ? await sql`
        SELECT DISTINCT ON (LOWER(TRIM(recipient_email)))
          id::text AS id,
          recipient_email,
          tenant_id::text AS tenant_id
        FROM email_tracking
        WHERE status = 'failed'
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
          tenant_id::text AS tenant_id
        FROM email_tracking
        WHERE status = 'failed'
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
      const onboardingUrl = buildOnboardingUrl(token, 'es');
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
        // Marcar el tracking fallido anterior como superseded (best-effort)
        try {
          await sql`
            UPDATE email_tracking
            SET
              metadata = COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({
                superseded_by_retry: true,
              })}::jsonb,
              updated_at = NOW()
            WHERE id = ${row.id}::uuid AND status = 'failed'
          `;
        } catch {
          /* ignore */
        }
      } else {
        errors.push(`${email}:${mail?.error || 'no_success'}`);
      }
    } catch (e) {
      errors.push(`${email}:${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { scanned, retried, sent, skipped, errors };
}
