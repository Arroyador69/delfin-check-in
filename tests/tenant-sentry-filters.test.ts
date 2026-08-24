import { describe, expect, it } from 'vitest';
import {
  isBenignNetworkOrAbortError,
  isBrowserExtensionNoise,
  isEmptyObjectRejection,
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

  it('ignora ruido MetaMask / extensiones wallet', () => {
    const err = new Error('Failed to connect to MetaMask');
    err.name = 'i';
    expect(isBrowserExtensionNoise(err)).toBe(true);
    expect(shouldDropSentryEvent(err)).toBe(true);
    expect(
      shouldDropSentryEvent(null, {
        exception: {
          values: [
            {
              type: 'Error',
              value: 'MetaMask extension not found',
              stacktrace: {
                frames: [{ filename: 'app:///scripts/inpage.js' }],
              },
            },
          ],
        },
      })
    ).toBe(true);
  });

  it('ignora Promise.reject({}) (Object captured as promise rejection)', () => {
    expect(isEmptyObjectRejection({})).toBe(true);
    expect(
      shouldDropSentryEvent({
        name: 'UnhandledRejection',
        message: 'Object captured as promise rejection with keys: [object has no keys]',
      })
    ).toBe(true);
  });

  it('no ignora errores de aplicación reales', () => {
    expect(isBenignNetworkOrAbortError(new Error('Validación MIR fallida'))).toBe(false);
    expect(shouldDropSentryEvent(new Error('NeonDbError: syntax error'))).toBe(false);
    expect(isBrowserExtensionNoise(new Error('Login fallido'))).toBe(false);
  });

  it('sigue filtrando NEXT_REDIRECT', () => {
    expect(isNextJsNavigationControlError(new Error('NEXT_REDIRECT'))).toBe(true);
  });

  it('ignora ruido MetaMask también por title/tags del evento Sentry', () => {
    expect(
      shouldDropSentryEvent(null, {
        title: 'i: Failed to connect to MetaMask',
        culprit: '/admin-login',
        tags: [{ key: 'transaction', value: '/admin-login' }],
        exception: {
          values: [{ type: 'i', value: 'Failed to connect to MetaMask' }],
        },
      })
    ).toBe(true);
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
