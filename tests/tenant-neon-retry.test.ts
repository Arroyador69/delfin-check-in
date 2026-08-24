import { describe, expect, it, vi } from 'vitest';
import { isTransientNeonError, withNeonRetry } from '@/lib/neon-retry';

describe('isTransientNeonError', () => {
  it('detecta Database request failed de NeonDbError', () => {
    const err = new Error('Database request failed');
    err.name = 'NeonDbError';
    expect(isTransientNeonError(err)).toBe(true);
  });

  it('no marca errores SQL normales como transitorios', () => {
    const err = new Error('relation "blog_articles" does not exist');
    err.name = 'NeonDbError';
    expect(isTransientNeonError(err)).toBe(false);
  });

  it('detecta fetch failed anidado en sourceError', () => {
    const err = Object.assign(new Error('Database request failed'), {
      name: 'NeonDbError',
      sourceError: new Error('fetch failed'),
    });
    expect(isTransientNeonError(err)).toBe(true);
  });
});

describe('withNeonRetry', () => {
  it('reintenta y resuelve tras fallo transitorio', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('Database request failed'), { name: 'NeonDbError' }))
      .mockResolvedValueOnce('ok');

    await expect(withNeonRetry(fn, { retries: 2, baseDelayMs: 1, label: 'test' })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('no reintenta errores no transitorios', async () => {
    const err = Object.assign(new Error('duplicate key value'), { name: 'NeonDbError' });
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withNeonRetry(fn, { retries: 3, baseDelayMs: 1 })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
