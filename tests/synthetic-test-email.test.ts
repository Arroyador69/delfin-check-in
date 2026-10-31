import { describe, expect, it } from 'vitest';
import { isSyntheticTestEmail } from '../src/lib/synthetic-test-email';

describe('isSyntheticTestEmail', () => {
  it('detecta buzones de smoke test', () => {
    expect(isSyntheticTestEmail('prueba-mirofish-now-1@delfincheckin.com')).toBe(true);
    expect(isSyntheticTestEmail('prueba-checkout-123@delfincheckin.com')).toBe(true);
    expect(isSyntheticTestEmail('test-activate@example.com')).toBe(true);
  });

  it('no bloquea emails reales', () => {
    expect(isSyntheticTestEmail('owner@casarural.es')).toBe(false);
    expect(isSyntheticTestEmail('soporte@delfincheckin.com')).toBe(false);
    expect(isSyntheticTestEmail('hola@hotel-playa.com')).toBe(false);
  });
});
