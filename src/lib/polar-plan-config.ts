/**
 * Configuración de planes tras pago Polar (alineada con superadmin/tenants/update-plan y PLANS.md).
 */
export type PolarPaidPlan = 'checkin' | 'standard' | 'pro';

export interface PolarPlanRow {
  plan_id: string;
  ads_enabled: boolean;
  legal_module: boolean;
  max_rooms: number;
  max_rooms_included: number;
  base_plan_price: number;
  extra_room_price: number | null;
}

export const POLAR_PAID_PLAN_ROWS: Record<PolarPaidPlan, PolarPlanRow> = {
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

export const POLAR_FREE_PLAN_ROW = {
  plan_type: 'free' as const,
  plan_id: 'basic',
  ads_enabled: true,
  legal_module: false,
  max_rooms: 2,
  max_rooms_included: 2,
  base_plan_price: 0,
  extra_room_price: null as number | null,
};

export function isPolarPaidPlan(v: string): v is PolarPaidPlan {
  return v === 'checkin' || v === 'standard' || v === 'pro';
}

export function safePlanFromPolarMetadata(meta: unknown): PolarPaidPlan | null {
  if (!meta || typeof meta !== 'object') return null;
  const p = String((meta as Record<string, unknown>).plan || '').toLowerCase();
  return isPolarPaidPlan(p) ? p : null;
}

/** Respaldo si Polar no reenvía metadata.plan (comparando IDs de producto). */
export function inferPolarPlanFromProductId(sub: unknown): PolarPaidPlan | null {
  if (!sub || typeof sub !== 'object') return null;
  const s = sub as Record<string, unknown>;
  const pid = String(s.productId || s.product_id || '').trim();
  if (!pid) return null;
  const ids: [PolarPaidPlan, string][] = [
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

export function mergePolarMetadataSources(sub: unknown): Record<string, unknown> | null {
  if (!sub || typeof sub !== 'object') return null;
  const s = sub as Record<string, unknown>;
  const parts: unknown[] = [
    s.metadata,
    (s.customer as Record<string, unknown> | undefined)?.metadata,
    (s.checkout as Record<string, unknown> | undefined)?.metadata,
  ];
  const merged: Record<string, unknown> = {};
  for (const p of parts) {
    if (p && typeof p === 'object') {
      Object.assign(merged, p as Record<string, unknown>);
    }
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

export function inferPolarPlanFromSubscription(sub: unknown): PolarPaidPlan | null {
  const meta = mergePolarMetadataSources(sub);
  return safePlanFromPolarMetadata(meta) ?? inferPolarPlanFromProductId(sub);
}

export function polarSubscriptionStatus(sub: unknown): string {
  if (!sub || typeof sub !== 'object') return '';
  const s = sub as Record<string, unknown>;
  return String(s.status || '').trim().toLowerCase();
}

/** Asientos/unidades contratadas en checkout Polar (metadata rooms o seats). */
export function subscribedRoomsFromPolarSubscription(sub: unknown): number | null {
  const meta = mergePolarMetadataSources(sub);
  if (!meta) return null;
  const raw = meta.rooms ?? meta.seats;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

export function isPolarSubscriptionActiveStatus(status: string): boolean {
  return status === 'active' || status === 'trialing';
}
