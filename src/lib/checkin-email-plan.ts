import type { Tenant } from '@/lib/tenant';
import { resolveEffectivePlanType, type BillingPlanType } from '@/lib/tenant-plan-billing';

/** Standard y Pro: configurar y enviar instrucciones de check-in por email al huésped (PMS + automático reservas directas). */
export function hasCheckinInstructionsEmailPlan(
  tenant: Pick<Tenant, 'plan_type' | 'plan_id'>
): boolean {
  const e = resolveEffectivePlanType(tenant);
  return e === 'standard' || e === 'pro';
}

export function getEffectiveBillingPlanType(
  tenant: Pick<Tenant, 'plan_type' | 'plan_id'>
): BillingPlanType {
  return resolveEffectivePlanType(tenant);
}
