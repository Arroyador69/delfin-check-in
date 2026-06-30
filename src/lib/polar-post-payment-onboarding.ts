import { sql } from '@vercel/postgres';
import { sendOnboardingEmail } from '@/lib/mailer';
import {
  buildOnboardingUrl,
  findOnboardingOwnerByEmail,
  issueFreshOnboardingCredentials,
} from '@/lib/onboarding-magic-link';
import { mergePolarMetadataSources } from '@/lib/polar-plan-config';

const POST_PAYMENT_SOURCES = new Set([
  'onboarding',
  'upgrade_plan',
  'free_extra_units',
  'public_subscribe',
]);

/**
 * Tras pago Polar: reenvía magic link de onboarding si la cuenta aún no completó el setup.
 * Solo en subscription.active para no duplicar con created/updated.
 */
export async function maybeSendPostPaymentOnboardingEmail(
  tenantId: string,
  sub: unknown,
  eventType: string
): Promise<void> {
  if (eventType !== 'subscription.active') return;

  const meta = mergePolarMetadataSources(sub);
  const source = String(meta?.source || '').toLowerCase();
  if (!POST_PAYMENT_SOURCES.has(source)) return;

  const tenantRow = await sql`
    SELECT email, onboarding_status
    FROM tenants
    WHERE id = ${tenantId}::uuid
    LIMIT 1
  `;
  const row = tenantRow.rows[0] as { email?: string; onboarding_status?: string | null } | undefined;
  if (!row?.email) return;
  if (row.onboarding_status === 'completed') return;

  const email = String(row.email).trim().toLowerCase();
  const owner = await findOnboardingOwnerByEmail(email);
  if (!owner) return;

  const locale = String(meta?.locale || 'es');
  const { token, tempPassword } = await issueFreshOnboardingCredentials(owner.user_id);
  const onboardingUrl = buildOnboardingUrl(token, locale);

  try {
    await sendOnboardingEmail({
      to: email,
      onboardingUrl,
      tempPassword,
      tenantId,
      variant: 'web_plan_paid',
      locale,
    });
    console.log(`✅ [polar] Email post-pago onboarding enviado tenant=${tenantId}`);
  } catch (e) {
    console.error('[polar] Error enviando email post-pago onboarding:', e);
  }
}
