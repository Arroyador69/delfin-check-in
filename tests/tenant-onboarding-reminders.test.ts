import { describe, expect, it } from 'vitest';
import {
  isOnboardingDeferredTask,
  ONBOARDING_DEFERRED_META,
} from '@/lib/onboarding-reminders';

describe('onboarding-reminders', () => {
  it('reconoce tareas aplazadas válidas', () => {
    expect(isOnboardingDeferredTask('units')).toBe(true);
    expect(isOnboardingDeferredTask('mir')).toBe(true);
    expect(isOnboardingDeferredTask('unknown')).toBe(false);
  });

  it('define enlace a ajustes para unidades', () => {
    expect(ONBOARDING_DEFERRED_META.units.link).toBe('/settings');
  });
});
