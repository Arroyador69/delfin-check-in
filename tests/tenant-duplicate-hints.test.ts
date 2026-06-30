import { describe, expect, it } from 'vitest';
import { findTenantDuplicateGroups } from '@/lib/tenant-duplicate-hints';

describe('findTenantDuplicateGroups', () => {
  it('agrupa emails con misma parte local', () => {
    const groups = findTenantDuplicateGroups([
      { id: '1', email: 'gabbyfrancy@yahoo.it', name: 'Gabriella' },
      { id: '2', email: 'gabbyfrancy67@gmail.com', name: 'Gabriella F' },
    ]);
    expect(groups.some((g) => g.tenants.length >= 2)).toBe(true);
  });

  it('ignora emails únicos', () => {
    const groups = findTenantDuplicateGroups([
      { id: '1', email: 'alice@foo.com', name: 'Alice' },
      { id: '2', email: 'bob@bar.com', name: 'Bob' },
    ]);
    expect(groups).toHaveLength(0);
  });
});
