import { describe, expect, it } from 'vitest';
import {
  isOnboardingDeferredTask as isDeferredTaskDb,
  ONBOARDING_DEFERRED_META,
} from '@/lib/onboarding-reminders';
import {
  isOnboardingDeferredTask,
  onboardingReminderMobileRoute,
  tenantNotificationMobileRoute,
} from '@/lib/onboarding-notification-routes';

describe('onboarding-reminders (API)', () => {
  it('reconoce tareas aplazadas válidas', () => {
    expect(isDeferredTaskDb('units')).toBe(true);
    expect(isDeferredTaskDb('mir')).toBe(true);
    expect(isDeferredTaskDb('unknown')).toBe(false);
  });

  it('define enlace a ajustes para unidades', () => {
    expect(ONBOARDING_DEFERRED_META.units.link).toBe('/settings');
  });
});

describe('onboarding-notification-routes (móvil)', () => {
  it('reconoce tareas aplazadas', () => {
    expect(isOnboardingDeferredTask('units')).toBe(true);
    expect(isOnboardingDeferredTask(null)).toBe(false);
  });

  it('enruta unidades a ajustes generales', () => {
    expect(onboardingReminderMobileRoute('units')).toBe('/(app)/settings/general');
  });

  it('enruta recordatorio onboarding desde notificación API', () => {
    expect(
      tenantNotificationMobileRoute({
        id: '1',
        type: 'onboarding_reminder',
        body: 'property_profile',
      })
    ).toBe('/(app)/settings/properties');
  });
});
