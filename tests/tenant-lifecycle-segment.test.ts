import { describe, expect, it } from 'vitest';
import {
  computePhase1GoalMet,
  inferPhase1StartStep,
  type TenantLifecycleState,
} from '@/lib/email-sequences/segment';

function baseState(overrides: Partial<TenantLifecycleState> = {}): TenantLifecycleState {
  return {
    tenant_id: 't1',
    email: 'test@example.com',
    name: 'Test',
    onboarding_status: 'pending',
    plan_type: 'free',
    plan_id: null,
    current_rooms: 0,
    properties_count: 0,
    room_rows_count: 0,
    reservations_count: 0,
    effective_plan: 'free',
    phase_1_goal_met: false,
    phase_2_goal_met: false,
    segment: 'phase_1_eligible',
    is_unsubscribed: false,
    ...overrides,
  };
}

describe('computePhase1GoalMet', () => {
  it('completa fase 1 si hay reservas aunque onboarding siga in_progress', () => {
    expect(
      computePhase1GoalMet('in_progress', 0, 0, 2, 0)
    ).toBe(true);
  });

  it('requiere propiedad si onboarding completed sin reservas', () => {
    expect(computePhase1GoalMet('completed', 1, 0, 0, 0)).toBe(true);
    expect(computePhase1GoalMet('completed', 0, 0, 0, 0)).toBe(false);
  });
});

describe('inferPhase1StartStep', () => {
  it('no envía p1_resume si ya hay reservas del formulario', () => {
    const step = inferPhase1StartStep(
      baseState({
        onboarding_status: 'in_progress',
        reservations_count: 1,
        phase_1_goal_met: true,
      })
    );
    expect(step).toBe(6);
  });

  it('envía p1_resume solo si in_progress sin unidad ni reservas', () => {
    expect(
      inferPhase1StartStep(
        baseState({ onboarding_status: 'in_progress', phase_1_goal_met: false })
      )
    ).toBe(4);
  });
});
