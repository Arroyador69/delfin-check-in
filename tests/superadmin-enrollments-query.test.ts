import { describe, expect, it } from 'vitest';
import { buildLifecycleEnrollmentsQuery } from '@/lib/email-sequences/list-enrollments-query';

describe('buildLifecycleEnrollmentsQuery', () => {
  it('sin filtros no usa parámetros ni WHERE externo', () => {
    const { text, params } = buildLifecycleEnrollmentsQuery({ phase: null, status: null });
    expect(params).toEqual([]);
    expect(text).not.toMatch(/\$1/);
    expect(text).not.toMatch(/\n\s+WHERE s\.phase/);
  });

  it('filtro phase usa cast ::int en $1', () => {
    const { text, params } = buildLifecycleEnrollmentsQuery({ phase: 2, status: null });
    expect(params).toEqual([2]);
    expect(text).toMatch(/s\.phase = \$1::int/);
    expect(text).not.toMatch(/IS NULL OR/);
  });

  it('filtro status usa cast ::text', () => {
    const { text, params } = buildLifecycleEnrollmentsQuery({ phase: null, status: 'active' });
    expect(params).toEqual(['active']);
    expect(text).toMatch(/e\.status = \$1::text/);
  });

  it('ambos filtros tipan $1 y $2', () => {
    const { text, params } = buildLifecycleEnrollmentsQuery({ phase: 1, status: 'paused' });
    expect(params).toEqual([1, 'paused']);
    expect(text).toMatch(/s\.phase = \$1::int/);
    expect(text).toMatch(/e\.status = \$2::text/);
  });
});
