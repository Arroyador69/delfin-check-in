import { describe, expect, it } from 'vitest';
import {
  isBenignNetworkOrAbortError,
  isNextJsNavigationControlError,
  shouldDropSentryEvent,
} from '@/lib/sentry-filter-next-navigation';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('sentry filters', () => {
  it('ignora Connection closed (ruido de red / cliente)', () => {
    expect(isBenignNetworkOrAbortError(new Error('Connection closed.'))).toBe(true);
    expect(isBenignNetworkOrAbortError(new Error('Connection closed'))).toBe(true);
    expect(shouldDropSentryEvent(new Error('Connection closed.'))).toBe(true);
  });

  it('ignora AbortError', () => {
    const err = new Error('The operation was aborted');
    err.name = 'AbortError';
    expect(isBenignNetworkOrAbortError(err)).toBe(true);
  });

  it('no ignora errores de aplicación reales', () => {
    expect(isBenignNetworkOrAbortError(new Error('Validación MIR fallida'))).toBe(false);
    expect(shouldDropSentryEvent(new Error('NeonDbError: syntax error'))).toBe(false);
  });

  it('sigue filtrando NEXT_REDIRECT', () => {
    expect(isNextJsNavigationControlError(new Error('NEXT_REDIRECT'))).toBe(true);
  });
});

describe('microsite-property-pricing SQL (regresión EXTRACT)', () => {
  it('no usa EXTRACT(... FROM ...) en tagged templates (rompe Neon)', () => {
    const file = readFileSync(
      path.join(process.cwd(), 'src/lib/microsite-property-pricing.ts'),
      'utf8'
    );
    expect(file).not.toMatch(/EXTRACT\s*\(/i);
    expect(file).toMatch(/date_part\s*\(\s*'dow'/);
  });
});
