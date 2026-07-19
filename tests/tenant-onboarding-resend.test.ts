import { describe, it, expect } from 'vitest';
import {
  generateOnboardingToken,
  generateOnboardingTempPassword,
  ONBOARDING_TOKEN_HOURS,
} from '@/lib/onboarding-magic-link';

describe('onboarding resend credentials', () => {
  it('genera token de longitud suficiente para magic link', () => {
    const token = generateOnboardingToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
  });

  it('genera password temporal usable en el email', () => {
    const pwd = generateOnboardingTempPassword();
    expect(pwd.length).toBeGreaterThanOrEqual(8);
  });

  it('ventana de token es 72h', () => {
    expect(ONBOARDING_TOKEN_HOURS).toBe(72);
  });
});
