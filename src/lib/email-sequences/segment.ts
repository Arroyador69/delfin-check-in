import { sql } from '@/lib/db';
import { resolveEffectivePlanType } from '@/lib/tenant-plan-billing';
import type { LifecycleSegment } from '@/lib/email-sequences/constants';

export interface TenantLifecycleState {
  tenant_id: string;
  email: string;
  name: string;
  onboarding_status: string | null;
  plan_type: string | null;
  plan_id: string | null;
  current_rooms: number;
  properties_count: number;
  room_rows_count: number;
  reservations_count: number;
  effective_plan: string;
  phase_1_goal_met: boolean;
  phase_2_goal_met: boolean;
  segment: LifecycleSegment;
  is_unsubscribed: boolean;
}

export async function isEmailUnsubscribed(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const r = await sql`
    SELECT 1 FROM email_unsubscribes
    WHERE LOWER(email) = ${normalized}
      AND scope IN ('all', 'lifecycle')
    LIMIT 1
  `;
  return r.rows.length > 0;
}

export async function getTenantPropertiesCount(tenantId: string): Promise<number> {
  try {
    const r = await sql`
      SELECT COUNT(*)::int AS c FROM tenant_properties
      WHERE tenant_id = ${tenantId}::uuid
        AND (is_active IS NULL OR is_active = true)
    `;
    return Number(r.rows[0]?.c || 0);
  } catch {
    return 0;
  }
}

export async function getTenantReservationsCount(tenantId: string): Promise<number> {
  try {
    const r = await sql`
      SELECT COUNT(*)::int AS c FROM reservations
      WHERE tenant_id = ${tenantId}::uuid
    `;
    return Number(r.rows[0]?.c || 0);
  } catch {
    return 0;
  }
}

/** Habitaciones reales en tabla Room (puede diferir de tenants.current_rooms). */
export async function getTenantRoomRowsCount(tenantId: string): Promise<number> {
  try {
    const r = await sql`
      SELECT COUNT(DISTINCT r.id)::int AS c
      FROM "Room" r
      INNER JOIN tenants t ON t.id = ${tenantId}::uuid
      WHERE r."lodgingId"::text = t.id::text
         OR (
           t.lodging_id IS NOT NULL
           AND BTRIM(t.lodging_id::text) <> ''
           AND r."lodgingId"::text = BTRIM(t.lodging_id::text)
         )
    `;
    return Number(r.rows[0]?.c || 0);
  } catch {
    return 0;
  }
}

export function computePhase1GoalMet(
  onboardingStatus: string | null,
  currentRooms: number,
  propertiesCount: number,
  reservationsCount: number = 0,
  roomRowsCount: number = 0
): boolean {
  const hasProperty =
    (currentRooms ?? 0) >= 1 || propertiesCount >= 1 || (roomRowsCount ?? 0) >= 1;
  const onboardingDone = onboardingStatus === 'completed';
  // Ya recibe reservas del formulario de huéspedes: no insistir con "retoma onboarding".
  if (reservationsCount >= 1) return true;
  return onboardingDone && hasProperty;
}

export function computePhase2GoalMet(planType: string | null, planId: string | null): boolean {
  const effective = resolveEffectivePlanType({
    plan_type: planType as 'free' | 'checkin' | 'standard' | 'pro' | null,
    plan_id: planId,
  });
  return effective !== 'free';
}

/**
 * Paso inicial en Fase 1 según estado real del propietario (evita reenviar bienvenida a cuentas antiguas).
 * Índices alineados con email_sequence_steps.step_order en schema.ts.
 */
export function inferPhase1StartStep(state: TenantLifecycleState): number {
  const st = (state.onboarding_status || 'pending').toLowerCase();
  if (state.phase_1_goal_met) return 6;
  const hasProperty =
    state.current_rooms >= 1 ||
    state.properties_count >= 1 ||
    state.room_rows_count >= 1;
  if (st === 'completed' && !hasProperty) {
    return 3; // p1_social_proof — falta propiedad
  }
  if (st === 'in_progress' && !hasProperty && state.reservations_count < 1) {
    return 4; // p1_resume — realmente a medias
  }
  if (st === 'in_progress' && (hasProperty || state.reservations_count >= 1)) {
    return 5; // ya usa el producto; saltar "retoma a medias"
  }
  return 0; // p1_welcome — pending / sin empezar
}

export function resolveLifecycleSegment(
  state: Omit<TenantLifecycleState, 'segment'>,
  isUnsubscribed: boolean
): LifecycleSegment {
  if (isUnsubscribed) return 'unsubscribed';
  if (state.phase_2_goal_met) return 'phase_2_completed';
  if (state.phase_1_goal_met) {
    if (!state.phase_2_goal_met) return 'phase_2_eligible';
    return 'phase_2_completed';
  }
  return 'phase_1_eligible';
}

export async function loadTenantLifecycleState(tenantId: string): Promise<TenantLifecycleState | null> {
  const r = await sql`
    SELECT
      t.id,
      t.email,
      t.name,
      t.onboarding_status,
      t.plan_type,
      t.plan_id,
      COALESCE(t.current_rooms, 0)::int AS current_rooms
    FROM tenants t
    WHERE t.id = ${tenantId}::uuid
    LIMIT 1
  `;
  if (!r.rows[0]) return null;
  const row = r.rows[0];
  const email = String(row.email || '').trim().toLowerCase();
  const propertiesCount = await getTenantPropertiesCount(tenantId);
  const reservationsCount = await getTenantReservationsCount(tenantId);
  const roomRowsCount = await getTenantRoomRowsCount(tenantId);
  const phase1 = computePhase1GoalMet(
    row.onboarding_status,
    Number(row.current_rooms || 0),
    propertiesCount,
    reservationsCount,
    roomRowsCount
  );
  const phase2 = computePhase2GoalMet(row.plan_type, row.plan_id);
  const unsub = email ? await isEmailUnsubscribed(email) : false;

  const base = {
    tenant_id: String(row.id),
    email,
    name: String(row.name || 'Propietario'),
    onboarding_status: row.onboarding_status as string | null,
    plan_type: row.plan_type as string | null,
    plan_id: row.plan_id as string | null,
    current_rooms: Number(row.current_rooms || 0),
    properties_count: propertiesCount,
    room_rows_count: roomRowsCount,
    reservations_count: reservationsCount,
    effective_plan: resolveEffectivePlanType({
      plan_type: row.plan_type,
      plan_id: row.plan_id,
    }),
    phase_1_goal_met: phase1,
    phase_2_goal_met: phase2,
    is_unsubscribed: unsub,
  };

  return {
    ...base,
    segment: resolveLifecycleSegment(base, unsub),
  };
}

export async function loadAllTenantsForLifecycleSync(): Promise<TenantLifecycleState[]> {
  const r = await sql`
    SELECT t.id
    FROM tenants t
    WHERE t.email IS NOT NULL AND TRIM(t.email) <> ''
    ORDER BY t.created_at ASC
  `;

  const results: TenantLifecycleState[] = [];
  for (const row of r.rows) {
    const state = await loadTenantLifecycleState(String(row.id));
    if (state) results.push(state);
  }
  return results;
}
