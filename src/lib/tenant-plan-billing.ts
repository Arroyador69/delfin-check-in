import type { Tenant } from '@/lib/tenant';
import { calculatePlanPrice } from '@/lib/plan-pricing';

export type BillingPlanType = 'free' | 'checkin' | 'standard' | 'pro';

/**
 * Fuente de verdad: plan_type. plan_id legacy (basic/standard/premium...)
 * solo se usa como respaldo cuando falta plan_type.
 */
export function resolveEffectivePlanType(
  tenant: Pick<Tenant, 'plan_type' | 'plan_id'>
): BillingPlanType {
  const pt = tenant.plan_type;
  if (pt === 'free' || pt === 'checkin' || pt === 'standard' || pt === 'pro') {
    return pt;
  }

  const pid = String(tenant.plan_id || '');
  if (pid === 'free' || pid === 'basic') return 'free';
  if (pid === 'standard') return 'standard';
  if (pid === 'pro' || pid === 'enterprise') return 'pro';
  if (pid === 'premium') return 'checkin';
  return 'free';
}

export function resolveBillingRoomCount(
  effectivePlanType: BillingPlanType,
  tenant: Pick<Tenant, 'max_rooms'>,
  roomsUsed: number
): number {
  if (effectivePlanType === 'free') return 1;
  if (tenant.max_rooms === -1) return Math.max(1, roomsUsed || 0);
  if (tenant.max_rooms > 0) return tenant.max_rooms;
  return Math.max(1, roomsUsed || 1);
}

/**
 * Límite mostrado en UI (barra de uso). -1 = ilimitado.
 */
export function resolveDisplayMaxRooms(
  effectivePlanType: BillingPlanType,
  tenant: Pick<Tenant, 'max_rooms'>,
  billingRooms: number
): number {
  if (effectivePlanType === 'free') return 1;
  if (tenant.max_rooms === -1) return -1;
  if (tenant.max_rooms > 0) return tenant.max_rooms;
  return billingRooms;
}

function lodgingUnitWord(tenant: Tenant): { singular: string; plural: string } {
  const lt = (tenant.config as { lodgingType?: string } | null | undefined)?.lodgingType;
  if (lt === 'apartamentos') {
    return { singular: 'apartamento', plural: 'apartamentos' };
  }
  return { singular: 'habitación', plural: 'habitaciones' };
}

export interface TenantPlanPresentation {
  effective_plan_type: BillingPlanType;
  plan_name: string;
  plan_price_ex_vat: number;
  plan_vat_rate: number;
  plan_vat_amount: number;
  plan_price_total: number;
  plan_features: string[];
  max_rooms_effective: number;
  billing_rooms: number;
}

export async function getTenantPlanPresentation(
  tenant: Tenant,
  roomsUsed: number
): Promise<TenantPlanPresentation> {
  const effective = resolveEffectivePlanType(tenant);
  const billingRooms = resolveBillingRoomCount(effective, tenant, roomsUsed);
  const displayMax = resolveDisplayMaxRooms(effective, tenant, billingRooms);
  const { singular, plural } = lodgingUnitWord(tenant);
  const unitWord = billingRooms === 1 ? singular : plural;

  if (effective === 'free') {
    return {
      effective_plan_type: effective,
      plan_name: 'Básico (Gratis)',
      plan_price_ex_vat: 0,
      plan_vat_rate: 21,
      plan_vat_amount: 0,
      plan_price_total: 0,
      plan_features: [`1 ${singular} incluida`, 'Soporte básico'],
      max_rooms_effective: displayMax,
      billing_rooms: 1,
    };
  }

  const pricing = await calculatePlanPrice(effective, billingRooms, tenant.country_code || 'ES');

  const names: Record<Exclude<BillingPlanType, 'free'>, string> = {
    checkin: 'Check-in',
    standard: 'Standard',
    pro: 'Pro',
  };

  const baseFeatures: Record<Exclude<BillingPlanType, 'free'>, string[]> = {
    checkin: [
      `Suscripción: ${billingRooms} ${unitWord}`,
      'Check-in digital (MIR) incluido',
      'PMS completo',
    ],
    standard: [
      `Suscripción: ${billingRooms} ${unitWord}`,
      'Sin anuncios',
      'Check-in digital (MIR) incluido',
      'Instrucciones de check-in por email al huésped (seguimiento de apertura)',
    ],
    pro: [
      `Suscripción: ${billingRooms} ${unitWord}`,
      'Sin anuncios',
      'Reservas directas (comisión reducida)',
      'Instrucciones de check-in por email al huésped (seguimiento de apertura)',
    ],
  };

  return {
    effective_plan_type: effective,
    plan_name: names[effective],
    plan_price_ex_vat: pricing.subtotal,
    plan_vat_rate: pricing.vat.vatRate,
    plan_vat_amount: pricing.vat.vatAmount,
    plan_price_total: pricing.total,
    plan_features: baseFeatures[effective],
    max_rooms_effective: displayMax,
    billing_rooms: billingRooms,
  };
}
