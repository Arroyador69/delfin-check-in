import { describe, expect, it } from 'vitest';
import { generateOnboardingTempPassword } from '@/lib/onboarding-magic-link';

describe('generateOnboardingTempPassword', () => {
  it('genera longitud fija y charset sin caracteres ambiguos 0/O/1/I/l', () => {
    const ambiguous = /[0O1Il]/;
    for (let i = 0; i < 40; i++) {
      const pwd = generateOnboardingTempPassword(12);
      expect(pwd).toHaveLength(12);
      expect(pwd).not.toMatch(ambiguous);
      expect(pwd).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789]+$/);
    }
  });
});
