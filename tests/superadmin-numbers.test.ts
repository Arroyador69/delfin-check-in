import { describe, expect, it } from 'vitest';
import { formatPercent, toFiniteNumber } from '@/lib/numbers';

describe('toFiniteNumber', () => {
  it('acepta number finito', () => {
    expect(toFiniteNumber(42.5)).toBe(42.5);
  });

  it('convierte string DECIMAL de Postgres', () => {
    expect(toFiniteNumber('73.50')).toBe(73.5);
  });

  it('fallback ante null/undefined/objeto', () => {
    expect(toFiniteNumber(null)).toBe(0);
    expect(toFiniteNumber(undefined, 10)).toBe(10);
    expect(toFiniteNumber({})).toBe(0);
  });
});

describe('formatPercent', () => {
  it('no lanza si signal_intensity llega como string', () => {
    expect(formatPercent('85.3', 0)).toBe('85%');
  });
});
