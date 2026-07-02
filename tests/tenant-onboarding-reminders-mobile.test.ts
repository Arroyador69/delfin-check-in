import { describe, expect, it } from 'vitest';
import {
  onboardingReminderMobileRoute,
  tenantNotificationMobileRoute,
} from '../DelfinCheckInApp/lib/onboarding-reminders';

describe('mobile onboarding-reminders', () => {
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
