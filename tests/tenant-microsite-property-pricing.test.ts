import { describe, expect, it } from 'vitest';
import { isPostgresWeekdayDow, isPostgresWeekendDow } from '@/lib/microsite-property-pricing';

describe('microsite-property-pricing DOW', () => {
  it('finde = vie, sáb, dom (0, 5, 6)', () => {
    expect(isPostgresWeekendDow(0)).toBe(true);
    expect(isPostgresWeekendDow(5)).toBe(true);
    expect(isPostgresWeekendDow(6)).toBe(true);
  });

  it('entre semana = lun–jue (1–4)', () => {
    expect(isPostgresWeekdayDow(1)).toBe(true);
    expect(isPostgresWeekdayDow(2)).toBe(true);
    expect(isPostgresWeekdayDow(3)).toBe(true);
    expect(isPostgresWeekdayDow(4)).toBe(true);
    expect(isPostgresWeekdayDow(5)).toBe(false);
    expect(isPostgresWeekdayDow(0)).toBe(false);
  });
});
