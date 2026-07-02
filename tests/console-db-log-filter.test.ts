import { describe, expect, it } from 'vitest';
import { shouldPersistConsoleLogToDb } from '@/lib/console-db-log-filter';

describe('shouldPersistConsoleLogToDb', () => {
  it('ignora ruido de login fallido', () => {
    expect(
      shouldPersistConsoleLogToDb(
        'Login fallido (contraseña incorrecta): m***@gmail.com IP 94.73.44.201 (3 intentos restantes)'
      )
    ).toBe(false);
    expect(
      shouldPersistConsoleLogToDb(
        '⚠️ Contraseña incorrecta para m***@gmail.com desde IP: 94.73.44.201 (3 intentos restantes)'
      )
    ).toBe(false);
    expect(shouldPersistConsoleLogToDb('Rate limit exceeded for IP: 94.73.44.201')).toBe(false);
  });

  it('persiste errores reales', () => {
    expect(shouldPersistConsoleLogToDb('NeonDbError: syntax error at or near "EXTRACT"')).toBe(true);
  });
});
