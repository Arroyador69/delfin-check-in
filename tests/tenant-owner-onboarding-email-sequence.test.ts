import { describe, expect, it } from 'vitest';
import {
  OWNER_ONBOARDING_UTM,
  SEQUENCE_KEY_OWNER_TRIAL_MIR,
} from '@/lib/email-sequences/constants';
import { withOwnerOnboardingUtm } from '@/lib/email-sequences/email-links';
import { applyOwnerTrialMirUtms, buildLifecycleUrls } from '@/lib/email-sequences/send';
import { renderLifecycleTemplate } from '@/lib/email-sequences/templates';

describe('owner_trial_mir constants', () => {
  it('expone clave y UTM de campaña', () => {
    expect(SEQUENCE_KEY_OWNER_TRIAL_MIR).toBe('owner_trial_mir');
    expect(OWNER_ONBOARDING_UTM).toEqual({
      utm_source: 'email',
      utm_medium: 'onboarding',
      utm_campaign: 'trial_mir',
    });
  });
});

describe('withOwnerOnboardingUtm', () => {
  it('añade UTM a URL absoluta', () => {
    const url = withOwnerOnboardingUtm(
      'https://admin.delfincheckin.com/es/onboarding?token=abc',
      'onboarding'
    );
    const u = new URL(url);
    expect(u.searchParams.get('utm_source')).toBe('email');
    expect(u.searchParams.get('utm_medium')).toBe('onboarding');
    expect(u.searchParams.get('utm_campaign')).toBe('trial_mir');
    expect(u.searchParams.get('utm_content')).toBe('onboarding');
    expect(u.searchParams.get('token')).toBe('abc');
  });
});

describe('applyOwnerTrialMirUtms', () => {
  it('marca todos los CTAs de buildLifecycleUrls', () => {
    const urls = applyOwnerTrialMirUtms(
      buildLifecycleUrls('11111111-1111-1111-1111-111111111111')
    );
    for (const value of Object.values(urls)) {
      expect(value).toContain('utm_source=email');
      expect(value).toContain('utm_medium=onboarding');
      expect(value).toContain('utm_campaign=trial_mir');
    }
  });
});

describe('plantillas owner_trial_mir', () => {
  const base = {
    ownerName: 'Ana García',
    onboardingUrl:
      'https://admin.delfincheckin.com/es/onboarding?utm_source=email&utm_medium=onboarding&utm_campaign=trial_mir&utm_content=onboarding',
    billingUrl: 'https://admin.delfincheckin.com/es/settings/billing',
    checkinUpgradeUrl: 'https://admin.delfincheckin.com/es/upgrade-plan?plan=checkin',
    unsubscribeUrl: 'https://admin.delfincheckin.com/api/email/unsubscribe?e=test',
    guestFormUrl:
      'https://admin.delfincheckin.com/api/public/form-redirect/t1?utm_source=email&utm_medium=onboarding&utm_campaign=trial_mir&utm_content=guest_form',
    tapWallUrl:
      'https://tap.delfincheckin.com/?utm_source=email&utm_medium=onboarding&utm_campaign=trial_mir&utm_content=tap_wall',
    mirStatusUrl:
      'https://admin.delfincheckin.com/es/estado-envios-mir?utm_source=email&utm_medium=onboarding&utm_campaign=trial_mir&utm_content=mir_status',
    onboardingStatus: 'in_progress' as const,
  };

  it('D0 habla de MIR en 15 min y distingue productos', () => {
    const mail = renderLifecycleTemplate('trial_d0_welcome', base);
    expect(mail.subject.toLowerCase()).toContain('mir');
    expect(mail.html).toContain('Configurar MIR en 15 min');
    expect(mail.html).toContain('Check-in');
    expect(mail.html).toContain('Tap Wall');
    expect(mail.html).toContain('utm_campaign=trial_mir');
  });

  it('D1 incluye checklist y formulario huésped', () => {
    const mail = renderLifecycleTemplate('trial_d1_checklist', base);
    expect(mail.html).toContain('Checklist MIR');
    expect(mail.html).toContain('formulario huésped');
    expect(mail.text).toContain(base.guestFormUrl);
  });

  it('D5 deja claro que Tap Wall es add-on NFC', () => {
    const mail = renderLifecycleTemplate('trial_d5_tap_wall', base);
    expect(mail.subject).toMatch(/Tap Wall/i);
    expect(mail.html).toContain('no sustituye');
    expect(mail.html).toContain('NFC');
  });

  it('D7 apunta a estado MIR / próxima llegada', () => {
    const mail = renderLifecycleTemplate('trial_d7_arrival_ok', base);
    expect(mail.subject.toLowerCase()).toContain('mir');
    expect(mail.html).toContain('próximas llegadas');
    expect(mail.text).toContain(base.mirStatusUrl);
  });
});
