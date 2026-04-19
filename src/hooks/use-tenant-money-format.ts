'use client';

import { useCallback, useEffect, useState } from 'react';

export type TenantMoneySpec = {
  business_currency: string;
  money_format_locale: string;
};

let cached: TenantMoneySpec | null = null;
let inflight: Promise<TenantMoneySpec> | null = null;

const DEFAULT_SPEC: TenantMoneySpec = {
  business_currency: 'EUR',
  money_format_locale: 'es-ES',
};

async function fetchTenantMoneySpec(): Promise<TenantMoneySpec> {
  if (cached) return cached;
  if (!inflight) {
    inflight = fetch('/api/tenant', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('tenant');
        return r.json();
      })
      .then((d) => {
        const t = d.tenant || {};
        const spec: TenantMoneySpec = {
          business_currency: typeof t.business_currency === 'string' ? t.business_currency : 'EUR',
          money_format_locale:
            typeof t.money_format_locale === 'string' ? t.money_format_locale : 'es-ES',
        };
        cached = spec;
        return spec;
      })
      .catch(() => {
        cached = DEFAULT_SPEC;
        return DEFAULT_SPEC;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * Moneda del negocio (país del tenant) + locale para Intl; opcionalmente otra ISO 4217 (p. ej. facturas Stripe).
 */
export function useTenantMoneyFormat() {
  const [spec, setSpec] = useState<TenantMoneySpec>(cached || DEFAULT_SPEC);

  useEffect(() => {
    let alive = true;
    fetchTenantMoneySpec().then((s) => {
      if (alive) setSpec(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  const formatCurrency = useCallback(
    (amount: number, currencyOverride?: string) => {
      const currency = (currencyOverride || spec.business_currency).toUpperCase();
      return new Intl.NumberFormat(spec.money_format_locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    },
    [spec.business_currency, spec.money_format_locale]
  );

  return { formatCurrency, ...spec };
}
