import { describe, it, expect } from 'vitest';
import {
  clampMaxGuests,
  MIR_MAX_PERSONAS_PER_COMUNICACION,
  DEFAULT_MAX_GUESTS_PER_PROPERTY,
} from '@/lib/form-max-guests';

describe('form-max-guests API contract', () => {
  it('clampMaxGuests alinea admin y formulario público (1..50)', () => {
    expect(clampMaxGuests(5)).toBe(5);
    expect(clampMaxGuests(99)).toBe(MIR_MAX_PERSONAS_PER_COMUNICACION);
    expect(clampMaxGuests('abc')).toBe(DEFAULT_MAX_GUESTS_PER_PROPERTY);
  });

  it('límite MIR coincide con validación registro-flex', () => {
    expect(MIR_MAX_PERSONAS_PER_COMUNICACION).toBe(50);
  });
});
