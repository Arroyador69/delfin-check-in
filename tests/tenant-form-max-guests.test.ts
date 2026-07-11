import { describe, it, expect } from 'vitest';
import { clampMaxGuests, MIR_MAX_PERSONAS_PER_COMUNICACION, DEFAULT_MAX_GUESTS_PER_PROPERTY } from '@/lib/form-max-guests';

describe('form-max-guests', () => {
  it('clampMaxGuests respeta rango MIR 1..50', () => {
    expect(clampMaxGuests(0)).toBe(1);
    expect(clampMaxGuests(-3)).toBe(1);
    expect(clampMaxGuests(5)).toBe(5);
    expect(clampMaxGuests(99)).toBe(MIR_MAX_PERSONAS_PER_COMUNICACION);
    expect(clampMaxGuests('abc')).toBe(DEFAULT_MAX_GUESTS_PER_PROPERTY);
    expect(clampMaxGuests(3.7)).toBe(3);
  });
});
