import { describe, expect, it } from 'vitest';
import {
  isPolarCheckoutConfirmedForPlan,
} from '@/lib/polar-confirm-payment';

describe('isPolarCheckoutConfirmedForPlan', () => {
  it('confirma cuando plan coincide y polar está activo', () => {
    expect(isPolarCheckoutConfirmedForPlan('checkin', 'checkin', 'active', false)).toBe(true);
  });

  it('confirma con legal_module aunque polar_status vacío', () => {
    expect(isPolarCheckoutConfirmedForPlan('checkin', 'checkin', '', true)).toBe(true);
  });

  it('rechaza si el plan no coincide', () => {
    expect(isPolarCheckoutConfirmedForPlan('free', 'checkin', 'active', true)).toBe(false);
  });

  it('rechaza plan de pago sin polar ni legal_module', () => {
    expect(isPolarCheckoutConfirmedForPlan('checkin', 'checkin', 'canceled', false)).toBe(false);
  });
});
