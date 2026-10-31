import { describe, expect, it } from 'vitest';
import { isCorsOriginAllowed, publicCorsHeaders } from '../src/lib/cors-allowlist';

describe('cors-allowlist', () => {
  it('permite orígenes Delfín conocidos', () => {
    expect(isCorsOriginAllowed('https://form.delfincheckin.com')).toBe(true);
    expect(isCorsOriginAllowed('https://admin.delfincheckin.com')).toBe(true);
  });

  it('rechaza orígenes arbitrarios', () => {
    expect(isCorsOriginAllowed('https://evil.example')).toBe(false);
    expect(isCorsOriginAllowed(null)).toBe(false);
  });

  it('publicCorsHeaders no usa *', () => {
    const h = publicCorsHeaders('https://evil.example');
    expect(h['Access-Control-Allow-Origin']).not.toBe('*');
    expect(h['Access-Control-Allow-Origin']).toBe('https://form.delfincheckin.com');
  });
});
