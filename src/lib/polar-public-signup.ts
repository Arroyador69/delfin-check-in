import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Polar } from '@polar-sh/sdk';
import { sql } from '@vercel/postgres';
import { createTenantUser, findTenantByEmail } from '@/lib/tenant';
import { sendOnboardingEmail } from '@/lib/mailer';

export type PolarPublicPlan = 'checkin' | 'standard' | 'pro';

function polarServer(): 'sandbox' | 'production' {
  const server = (process.env.POLAR_SERVER as 'sandbox' | 'production' | undefined) || 'sandbox';
  return server === 'production' ? 'production' : 'sandbox';
}

function getPolar(): Polar {
  const token = String(process.env.POLAR_ACCESS_TOKEN || '').trim();
  if (!token) throw new Error('POLAR_ACCESS_TOKEN no configurado');
  return new Polar({ accessToken: token, server: polarServer() });
}

/** Alineado con `superadmin/tenants/update-plan` para columnas de negocio. */
const PLAN_ROWS: Record<
  PolarPublicPlan,
  {
    plan_id: string;
    ads_enabled: boolean;
    legal_module: boolean;
    max_rooms: number;
    max_rooms_included: number;
    base_plan_price: number;
    extra_room_price: number | null;
  }
> = {
  checkin: {
    plan_id: 'premium',
    ads_enabled: true,
    legal_module: true,
    max_rooms: -1,
    max_rooms_included: 0,
    base_plan_price: 2,
    extra_room_price: 2,
  },
  standard: {
    plan_id: 'standard',
    ads_enabled: false,
    legal_module: true,
    max_rooms: -1,
    max_rooms_included: 4,
    base_plan_price: 9.99,
    extra_room_price: 2,
  },
  pro: {
    plan_id: 'enterprise',
    ads_enabled: false,
    legal_module: true,
    max_rooms: -1,
    max_rooms_included: 6,
    base_plan_price: 29.99,
    extra_room_price: 2,
  },
};

function safePlanFromMetadata(meta: unknown): PolarPublicPlan | null {
  if (!meta || typeof meta !== 'object') return null;
  const p = String((meta as Record<string, unknown>).plan || '').toLowerCase();
  if (p === 'checkin' || p === 'standard' || p === 'pro') return p;
  return null;
}

/** Respaldo si Polar no reenvía `metadata.plan` en la suscripción (comparando IDs de producto). */
function inferPlanFromProductId(sub: any): PolarPublicPlan | null {
  const pid = String(sub?.productId || sub?.product_id || '').trim();
  if (!pid) return null;
  const ids: [PolarPublicPlan, string][] = [
    ['checkin', String(process.env.POLAR_PRODUCT_CHECKIN_ID || '').trim()],
    ['checkin', String(process.env.POLAR_PRODUCT_CHECKIN_YEARLY_ID || '').trim()],
    ['standard', String(process.env.POLAR_PRODUCT_STANDARD_ID || '').trim()],
    ['standard', String(process.env.POLAR_PRODUCT_STANDARD_YEARLY_ID || '').trim()],
    ['pro', String(process.env.POLAR_PRODUCT_PRO_ID || '').trim()],
    ['pro', String(process.env.POLAR_PRODUCT_PRO_YEARLY_ID || '').trim()],
  ];
  for (const [plan, envId] of ids) {
    if (envId && pid === envId) return plan;
  }
  return null;
}

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
    const polar = getPolar();
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

  const plan = safePlanFromMetadata(meta) ?? inferPlanFromProductId(sub);
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
    await sql`
      UPDATE tenants
      SET polar_customer_id = ${customerId},
          polar_subscription_id = ${subId},
          polar_subscription_status = 'active',
          polar_last_event_at = NOW(),
          plan_type = ${plan},
          plan_id = ${cfg.plan_id},
          ads_enabled = ${cfg.ads_enabled},
          legal_module = ${cfg.legal_module},
          max_rooms = ${cfg.max_rooms},
          max_rooms_included = ${cfg.max_rooms_included},
          base_plan_price = ${cfg.base_plan_price},
          extra_room_price = ${cfg.extra_room_price},
          updated_at = NOW()
      WHERE id = ${existing.id}::uuid
    `;
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
        await sql`
          UPDATE tenants
          SET polar_customer_id = ${customerId},
              polar_subscription_id = ${subId},
              polar_subscription_status = 'active',
              polar_last_event_at = NOW(),
              plan_type = ${plan},
              plan_id = ${cfg.plan_id},
              ads_enabled = ${cfg.ads_enabled},
              legal_module = ${cfg.legal_module},
              max_rooms = ${cfg.max_rooms},
              max_rooms_included = ${cfg.max_rooms_included},
              base_plan_price = ${cfg.base_plan_price},
              extra_room_price = ${cfg.extra_room_price},
              updated_at = NOW()
          WHERE id = ${again.id}::uuid
        `;
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

  const onboardingToken = crypto.randomBytes(32).toString('hex');
  const tokenExpiry = new Date();
  tokenExpiry.setHours(tokenExpiry.getHours() + 24);

  await sql`
    UPDATE tenant_users
    SET
      reset_token = ${onboardingToken},
      reset_token_expires = ${tokenExpiry.toISOString()},
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
  const base = String(process.env.NEXT_PUBLIC_APP_URL || 'https://admin.delfincheckin.com').replace(/\/+$/, '');
  const onboardingUrl = `${base}/${loc}/onboarding?token=${onboardingToken}&email=${encodeURIComponent(email)}`;

  try {
    await sendOnboardingEmail({
      to: email,
      onboardingUrl,
      tempPassword: tempPassword,
      /** Nunca usar copy de lista de espera: este alta viene del pago web / Polar. */
      variant: 'web_plan_paid',
    });
  } catch (e) {
    console.error('[polar public] Error enviando email de onboarding:', e);
  }
}
