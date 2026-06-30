import { sql } from '@vercel/postgres';
import { getPolarClient } from '@/lib/polar-server';
import {
  ensurePolarTenantColumns,
  syncTenantFromPolarSubscription,
} from '@/lib/polar-subscription-sync';
import { isPolarSubscriptionActiveStatus } from '@/lib/polar-plan-config';

export type PolarConfirmPaymentResult = {
  success: boolean;
  plan_type?: string;
  polar_subscription_status?: string | null;
  legal_module?: boolean;
  synced?: boolean;
  error?: string;
};

function isPaidPlanType(planType: string): boolean {
  return planType === 'checkin' || planType === 'standard' || planType === 'pro';
}

function isPaymentConfirmed(
  planType: string,
  polarStatus: string | null | undefined,
  legalModule: boolean
): boolean {
  if (!isPaidPlanType(planType)) return false;
  if (polarStatus && isPolarSubscriptionActiveStatus(polarStatus)) return true;
  return legalModule;
}

async function collectSubscriptions(
  polar: ReturnType<typeof getPolarClient>,
  opts: { customerId?: string; externalCustomerId?: string }
): Promise<unknown[]> {
  const found: unknown[] = [];
  const requests = [
    opts.customerId ? { customerId: opts.customerId, active: true, limit: 10 } : null,
    opts.externalCustomerId
      ? { externalCustomerId: opts.externalCustomerId, active: true, limit: 10 }
      : null,
  ].filter(Boolean) as Array<{ customerId?: string; externalCustomerId?: string; active: boolean; limit: number }>;

  for (const req of requests) {
    try {
      const page = await polar.subscriptions.list(req);
      for await (const item of page) {
        found.push(item);
      }
    } catch {
      // Siguiente estrategia de búsqueda.
    }
  }
  return found;
}

/**
 * Sincroniza plan del tenant consultando Polar (si el webhook llegó tarde o falló).
 */
export async function confirmPolarPaymentForTenant(
  tenantId: string
): Promise<PolarConfirmPaymentResult> {
  await ensurePolarTenantColumns();

  const tenantRow = await sql`
    SELECT
      plan_type,
      legal_module,
      polar_subscription_id,
      polar_customer_id,
      polar_subscription_status
    FROM tenants
    WHERE id = ${tenantId}::uuid
    LIMIT 1
  `;
  const t = tenantRow.rows[0] as
    | {
        plan_type?: string;
        legal_module?: boolean;
        polar_subscription_id?: string | null;
        polar_customer_id?: string | null;
        polar_subscription_status?: string | null;
      }
    | undefined;

  if (!t) {
    return { success: false, error: 'tenant_not_found' };
  }

  const planType = String(t.plan_type || 'free');
  const polarStatus = t.polar_subscription_status || null;
  const legalModule = !!t.legal_module;

  if (isPaymentConfirmed(planType, polarStatus, legalModule)) {
    return {
      success: true,
      plan_type: planType,
      polar_subscription_status: polarStatus,
      legal_module: legalModule,
      synced: false,
    };
  }

  const polar = getPolarClient();
  let sub: unknown = null;

  const subId = String(t.polar_subscription_id || '').trim();
  if (subId) {
    try {
      sub = await polar.subscriptions.get({ id: subId });
    } catch {
      sub = null;
    }
  }

  if (!sub) {
    const customerId = String(t.polar_customer_id || '').trim();
    const candidates = await collectSubscriptions(polar, {
      customerId: customerId || undefined,
      externalCustomerId: tenantId,
    });
    sub =
      candidates.find((c) => {
        if (!c || typeof c !== 'object') return false;
        const status = String((c as Record<string, unknown>).status || '').toLowerCase();
        return isPolarSubscriptionActiveStatus(status);
      }) || candidates[0] || null;
  }

  if (!sub) {
    return {
      success: false,
      error: 'no_subscription_found',
      plan_type: planType,
      polar_subscription_status: polarStatus,
      legal_module: legalModule,
    };
  }

  await syncTenantFromPolarSubscription(sub, 'subscription.active');

  const after = await sql`
    SELECT plan_type, legal_module, polar_subscription_status
    FROM tenants
    WHERE id = ${tenantId}::uuid
    LIMIT 1
  `;
  const row = after.rows[0] as
    | {
        plan_type?: string;
        legal_module?: boolean;
        polar_subscription_status?: string | null;
      }
    | undefined;

  const nextPlan = String(row?.plan_type || 'free');
  const nextStatus = row?.polar_subscription_status || null;
  const nextLegal = !!row?.legal_module;

  return {
    success: isPaymentConfirmed(nextPlan, nextStatus, nextLegal),
    plan_type: nextPlan,
    polar_subscription_status: nextStatus,
    legal_module: nextLegal,
    synced: true,
    error: isPaymentConfirmed(nextPlan, nextStatus, nextLegal) ? undefined : 'sync_incomplete',
  };
}

/** Usado por el polling del onboarding (cliente). */
export function isPolarCheckoutConfirmedForPlan(
  planType: string,
  targetPlan: string,
  polarStatus: string | null | undefined,
  legalModule: boolean
): boolean {
  if (planType !== targetPlan) return false;
  return isPaymentConfirmed(planType, polarStatus, legalModule);
}
