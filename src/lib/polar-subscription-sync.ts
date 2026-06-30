import { sql } from '@vercel/postgres';
import { findTenantByEmail } from '@/lib/tenant';
import { getPolarClient } from '@/lib/polar-server';
import {
  inferPolarPlanFromSubscription,
  isPolarSubscriptionActiveStatus,
  mergePolarMetadataSources,
  POLAR_FREE_PLAN_ROW,
  POLAR_PAID_PLAN_ROWS,
  type PolarPaidPlan,
  polarSubscriptionStatus,
  safePlanFromPolarMetadata,
  subscribedRoomsFromPolarSubscription,
} from '@/lib/polar-plan-config';
import { maybeSendPostPaymentOnboardingEmail } from '@/lib/polar-post-payment-onboarding';

export type PolarSyncResult = {
  ok: boolean;
  tenantId?: string;
  plan?: string;
  action?: string;
  detail?: string;
};

/** Columnas Polar en tenants (idempotente; el webhook también las creaba en runtime). */
export async function ensurePolarTenantColumns(): Promise<void> {
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_customer_id TEXT`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_checkout_id TEXT`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_subscription_status TEXT`;
  await sql`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS polar_last_event_at TIMESTAMPTZ`;
}

function safeTenantIdFromMetadata(meta: unknown): string | null {
  if (!meta || typeof meta !== 'object') return null;
  const tenantId = (meta as Record<string, unknown>).tenant_id;
  if (typeof tenantId !== 'string') return null;
  const trimmed = tenantId.trim();
  return trimmed || null;
}

function externalIdFromSubscription(sub: unknown): string | null {
  if (!sub || typeof sub !== 'object') return null;
  const s = sub as Record<string, unknown>;
  const customer = s.customer as Record<string, unknown> | undefined;
  const candidates = [
    s.customerExternalId,
    s.customer_external_id,
    customer?.externalId,
    customer?.external_id,
  ];
  for (const c of candidates) {
    const id = String(c || '').trim();
    if (id && /^[0-9a-f-]{36}$/i.test(id)) return id;
  }
  return null;
}

async function resolveEmailFromSubscription(sub: unknown): Promise<string | null> {
  if (!sub || typeof sub !== 'object') return null;
  const s = sub as Record<string, unknown>;
  const customer = s.customer as Record<string, unknown> | undefined;
  const direct = String(customer?.email || s.customerEmail || '').trim();
  if (direct) return direct.toLowerCase();

  const cid = String(s.customerId || s.customer_id || customer?.id || '').trim();
  if (!cid) return null;

  try {
    const polar = getPolarClient();
    const customerRow = await polar.customers.get({ id: cid });
    const e = String((customerRow as { email?: string | null }).email || '').trim();
    return e ? e.toLowerCase() : null;
  } catch {
    return null;
  }
}

/** Resuelve tenant por metadata, external_id (UUID) o email del cliente Polar. */
export async function resolveTenantIdForPolarSubscription(sub: unknown): Promise<string | null> {
  const meta = mergePolarMetadataSources(sub);
  const fromMeta = safeTenantIdFromMetadata(meta);
  if (fromMeta) return fromMeta;

  const externalId = externalIdFromSubscription(sub);
  if (externalId) return externalId;

  const email = await resolveEmailFromSubscription(sub);
  if (!email) return null;

  const existing = await findTenantByEmail(email);
  return existing?.id || null;
}

export async function applyPaidPlanToTenant(
  tenantId: string,
  plan: PolarPaidPlan,
  polar: {
    subscriptionId: string;
    customerId: string | null;
    status: string;
    subscribedRooms?: number | null;
  }
): Promise<void> {
  const cfg = POLAR_PAID_PLAN_ROWS[plan];
  const roomsJson =
    polar.subscribedRooms != null && polar.subscribedRooms >= 1
      ? JSON.stringify({ rooms: polar.subscribedRooms, seats: polar.subscribedRooms })
      : null;

  if (roomsJson) {
    await sql`
      UPDATE tenants
      SET
        plan_type = ${plan},
        plan_id = ${cfg.plan_id},
        ads_enabled = ${cfg.ads_enabled},
        legal_module = ${cfg.legal_module},
        max_rooms = ${cfg.max_rooms},
        max_rooms_included = ${cfg.max_rooms_included},
        base_plan_price = ${cfg.base_plan_price},
        extra_room_price = ${cfg.extra_room_price},
        polar_subscription_id = ${polar.subscriptionId},
        polar_customer_id = ${polar.customerId},
        polar_subscription_status = ${polar.status},
        polar_last_event_at = NOW(),
        polar_last_checkout_context = COALESCE(polar_last_checkout_context, '{}'::jsonb) || ${roomsJson}::jsonb,
        updated_at = NOW()
      WHERE id = ${tenantId}::uuid
    `;
    return;
  }

  await sql`
    UPDATE tenants
    SET
      plan_type = ${plan},
      plan_id = ${cfg.plan_id},
      ads_enabled = ${cfg.ads_enabled},
      legal_module = ${cfg.legal_module},
      max_rooms = ${cfg.max_rooms},
      max_rooms_included = ${cfg.max_rooms_included},
      base_plan_price = ${cfg.base_plan_price},
      extra_room_price = ${cfg.extra_room_price},
      polar_subscription_id = ${polar.subscriptionId},
      polar_customer_id = ${polar.customerId},
      polar_subscription_status = ${polar.status},
      polar_last_event_at = NOW(),
      updated_at = NOW()
    WHERE id = ${tenantId}::uuid
  `;
}

export async function applyFreePlanAfterPolarCancel(
  tenantId: string,
  polar: { subscriptionId: string; customerId: string | null; status: string }
): Promise<void> {
  const f = POLAR_FREE_PLAN_ROW;
  await sql`
    UPDATE tenants
    SET
      plan_type = ${f.plan_type},
      plan_id = ${f.plan_id},
      ads_enabled = ${f.ads_enabled},
      legal_module = ${f.legal_module},
      max_rooms = ${f.max_rooms},
      max_rooms_included = ${f.max_rooms_included},
      base_plan_price = ${f.base_plan_price},
      extra_room_price = ${f.extra_room_price},
      polar_subscription_id = ${polar.subscriptionId},
      polar_customer_id = ${polar.customerId},
      polar_subscription_status = ${polar.status},
      polar_last_event_at = NOW(),
      updated_at = NOW()
    WHERE id = ${tenantId}::uuid
  `;
}

/**
 * Sincroniza plan del tenant tras eventos Polar de suscripción.
 * Corrige el bug: antes solo se guardaban IDs Polar sin activar plan_type/legal_module.
 */
export async function syncTenantFromPolarSubscription(
  sub: unknown,
  eventType: string
): Promise<PolarSyncResult> {
  await ensurePolarTenantColumns();

  const tenantId = await resolveTenantIdForPolarSubscription(sub);
  if (!tenantId) {
    return { ok: false, action: 'skip', detail: 'no_tenant' };
  }

  if (!sub || typeof sub !== 'object') {
    return { ok: false, tenantId, detail: 'invalid_sub' };
  }

  const s = sub as Record<string, unknown>;
  const subscriptionId = String(s.id || '').trim();
  const customerId =
    String(s.customerId || s.customer_id || (s.customer as Record<string, unknown> | undefined)?.id || '').trim() ||
    null;
  const status = polarSubscriptionStatus(sub) || eventType.replace('subscription.', '');

  const polarRefs = { subscriptionId, customerId, status };

  const isCancel =
    eventType === 'subscription.canceled' ||
    eventType === 'subscription.revoked' ||
    status === 'canceled' ||
    status === 'revoked';

  if (isCancel) {
    await applyFreePlanAfterPolarCancel(tenantId, polarRefs);
    console.log(`✅ [polar sync] plan=free tenant=${tenantId} event=${eventType}`);
    return { ok: true, tenantId, plan: 'free', action: 'downgraded' };
  }

  const shouldActivate =
    eventType === 'subscription.active' ||
    eventType === 'subscription.created' ||
    eventType === 'subscription.updated' ||
    eventType === 'subscription.uncanceled';

  if (!shouldActivate) {
    await sql`
      UPDATE tenants
      SET polar_subscription_id = ${subscriptionId},
          polar_customer_id = ${customerId},
          polar_subscription_status = ${status},
          polar_last_event_at = NOW()
      WHERE id = ${tenantId}::uuid
    `;
    return { ok: true, tenantId, action: 'polar_refs_only' };
  }

  if (!isPolarSubscriptionActiveStatus(status) && eventType !== 'subscription.active') {
    await sql`
      UPDATE tenants
      SET polar_subscription_id = ${subscriptionId},
          polar_customer_id = ${customerId},
          polar_subscription_status = ${status},
          polar_last_event_at = NOW()
      WHERE id = ${tenantId}::uuid
    `;
    return { ok: true, tenantId, action: 'inactive_status', detail: status };
  }

  const plan = inferPolarPlanFromSubscription(sub);
  if (!plan) {
    console.warn(`⚠️ [polar sync] No se pudo inferir plan tenant=${tenantId} event=${eventType}`);
    await sql`
      UPDATE tenants
      SET polar_subscription_id = ${subscriptionId},
          polar_customer_id = ${customerId},
          polar_subscription_status = ${status || 'active'},
          polar_last_event_at = NOW()
      WHERE id = ${tenantId}::uuid
    `;
    return { ok: false, tenantId, action: 'unknown_plan', detail: 'infer_plan_failed' };
  }

  await applyPaidPlanToTenant(tenantId, plan, {
    ...polarRefs,
    status: status || 'active',
    subscribedRooms: subscribedRoomsFromPolarSubscription(sub),
  });

  await maybeSendPostPaymentOnboardingEmail(tenantId, sub, eventType);

  console.log(`✅ [polar sync] plan=${plan} tenant=${tenantId} event=${eventType}`);
  return { ok: true, tenantId, plan, action: 'activated' };
}

/** Para tests / imports desde polar-public-signup. */
export { safePlanFromPolarMetadata };
