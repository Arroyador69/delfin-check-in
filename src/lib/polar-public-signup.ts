import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { sql } from '@vercel/postgres';
import { createTenantUser, findTenantByEmail } from '@/lib/tenant';
import { sendOnboardingEmail } from '@/lib/mailer';
import { getPolarClient } from '@/lib/polar-server';
import {
  inferPolarPlanFromSubscription,
  POLAR_PAID_PLAN_ROWS,
  safePlanFromPolarMetadata,
  type PolarPaidPlan,
} from '@/lib/polar-plan-config';
import { applyPaidPlanToTenant } from '@/lib/polar-subscription-sync';

export type PolarPublicPlan = PolarPaidPlan;

const PLAN_ROWS = POLAR_PAID_PLAN_ROWS;

function isPublicSubscribeMetadata(meta: unknown): boolean {
  if (!meta || typeof meta !== 'object') return false;
  return String((meta as Record<string, unknown>).source || '') === 'public_subscribe';
}

async function resolveEmailFromSubscription(sub: any): Promise<string | null> {
  const direct = String(sub?.customer?.email || '').trim();
  if (direct) return direct.toLowerCase();

  const cid = String(sub?.customerId || sub?.customer_id || '').trim();
  if (!cid) return null;

  try {
    const polar = getPolarClient();
    const customer = await polar.customers.get({ id: cid });
    const e = String((customer as { email?: string | null }).email || '').trim();
    return e ? e.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Tras `subscription.active` sin `tenant_id` en metadata: crea tenant + owner o enlaza Polar a existente.
 */
export async function provisionTenantFromPolarPublicSubscription(sub: any): Promise<void> {
  const meta = sub?.metadata;
  if (!isPublicSubscribeMetadata(meta)) return;

  const plan = safePlanFromPolarMetadata(meta) ?? inferPolarPlanFromSubscription(sub);
  if (!plan) return;

  const email = await resolveEmailFromSubscription(sub);
  if (!email) {
    console.warn('[polar public] Sin email de cliente; no se crea tenant');
    return;
  }

  const subId = String(sub?.id || '').trim();
  const customerId = String(sub?.customerId || sub?.customer_id || '').trim();
  if (!subId || !customerId) return;

  const cfg = PLAN_ROWS[plan];
  const tenantName = email.split('@')[0] || 'Propietario';
  const tenantConfig = {
    propertyName: tenantName,
    timezone: 'Europe/Madrid',
    language: String((meta as Record<string, unknown>).locale || 'es'),
    currency: 'EUR',
  };

  const existing = await findTenantByEmail(email);
  if (existing?.id) {
    await applyPaidPlanToTenant(existing.id, plan, {
      subscriptionId: subId,
      customerId,
      status: 'active',
    });
    return;
  }

  const tempPassword = crypto.randomBytes(12).toString('base64').slice(0, 16);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  let tenantId: string | null = null;
  try {
    const ins = await sql`
      INSERT INTO tenants (
        name,
        email,
        plan_id,
        plan_type,
        max_rooms,
        current_rooms,
        ads_enabled,
        legal_module,
        onboarding_status,
        status,
        config,
        max_rooms_included,
        base_plan_price,
        extra_room_price,
        polar_customer_id,
        polar_subscription_id,
        polar_subscription_status,
        polar_last_event_at
      ) VALUES (
        ${tenantName},
        ${email},
        ${cfg.plan_id},
        ${plan},
        ${cfg.max_rooms},
        0,
        ${cfg.ads_enabled},
        ${cfg.legal_module},
        'pending',
        'active',
        ${JSON.stringify(tenantConfig)}::jsonb,
        ${cfg.max_rooms_included},
        ${cfg.base_plan_price},
        ${cfg.extra_room_price},
        ${customerId},
        ${subId},
        'active',
        NOW()
      )
      RETURNING id
    `;
    tenantId = ins.rows[0]?.id as string;
  } catch (e: unknown) {
    const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code?: string }).code) : '';
    if (code === '23505') {
      const again = await findTenantByEmail(email);
      if (again?.id) {
        await applyPaidPlanToTenant(again.id, plan, {
          subscriptionId: subId,
          customerId,
          status: 'active',
        });
      }
      return;
    }
    throw e;
  }

  if (!tenantId) return;

  await createTenantUser({
    tenant_id: tenantId,
    email,
    password_hash: passwordHash,
    full_name: tenantName,
    role: 'owner',
  });

  const {
    buildOnboardingUrl,
    ensureOnboardingMagicTokenSchema,
    generateOnboardingToken,
    onboardingTokenExpiry,
  } = await import('@/lib/onboarding-magic-link');
  await ensureOnboardingMagicTokenSchema();
  const onboardingToken = generateOnboardingToken();
  const tokenExpiry = onboardingTokenExpiry();

  await sql`
    UPDATE tenant_users
    SET
      onboarding_magic_token = ${onboardingToken},
      onboarding_magic_token_expires = ${tokenExpiry.toISOString()},
      email_verified = false
    WHERE tenant_id = ${tenantId}::uuid AND email = ${email}
  `;

  try {
    const { generateReferralCodeForTenant } = await import('@/lib/referrals');
    await generateReferralCodeForTenant(tenantId);
  } catch {
    /* no bloquear */
  }

  const loc = String((meta as Record<string, unknown>).locale || 'es');
  const onboardingUrl = buildOnboardingUrl(onboardingToken, loc);

  try {
    await sendOnboardingEmail({
      to: email,
      onboardingUrl,
      tempPassword: tempPassword,
      tenantId,
      /** Nunca usar copy de lista de espera: este alta viene del pago web / Polar. */
      variant: 'web_plan_paid',
      locale: loc,
    });
  } catch (e) {
    console.error('[polar public] Error enviando email de onboarding:', e);
  }
}
