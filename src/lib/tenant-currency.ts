/**
 * Moneda del negocio según el país donde operan los alojamientos (no según el idioma de la UI).
 * Prioridad: country_code del tenant → ISO 4217; si no hay país, config.currency; por defecto EUR.
 */

import type { Tenant } from '@/lib/tenant';

/** ISO 3166-1 alpha-2 (mayúsculas) → ISO 4217. Ampliar según mercados Delfín. */
export const CURRENCY_BY_COUNTRY_CODE: Record<string, string> = {
  // Eurozona
  AD: 'EUR',
  AT: 'EUR',
  BE: 'EUR',
  CY: 'EUR',
  DE: 'EUR',
  EE: 'EUR',
  ES: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  GR: 'EUR',
  IE: 'EUR',
  IT: 'EUR',
  LT: 'EUR',
  LU: 'EUR',
  LV: 'EUR',
  MC: 'EUR',
  MT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  SI: 'EUR',
  SK: 'EUR',
  SM: 'EUR',
  VA: 'EUR',
  // Otros Europa (no EUR)
  GB: 'GBP',
  UK: 'GBP',
  CH: 'CHF',
  NO: 'NOK',
  SE: 'SEK',
  DK: 'DKK',
  PL: 'PLN',
  CZ: 'CZK',
  HU: 'HUF',
  RO: 'RON',
  BG: 'BGN',
  HR: 'EUR',
  IS: 'ISK',
  TR: 'TRY',
  RU: 'RUB',
  UA: 'UAH',
  // Américas
  US: 'USD',
  CA: 'CAD',
  MX: 'MXN',
  BR: 'BRL',
  AR: 'ARS',
  CL: 'CLP',
  CO: 'COP',
  PE: 'PEN',
  UY: 'UYU',
  CR: 'CRC',
  PA: 'PAB',
  DO: 'DOP',
  // Asia / Pacífico / Oriente Medio
  JP: 'JPY',
  CN: 'CNY',
  HK: 'HKD',
  SG: 'SGD',
  KR: 'KRW',
  TH: 'THB',
  MY: 'MYR',
  ID: 'IDR',
  PH: 'PHP',
  IN: 'INR',
  AU: 'AUD',
  NZ: 'NZD',
  AE: 'AED',
  SA: 'SAR',
  IL: 'ILS',
  // África
  ZA: 'ZAR',
  MA: 'MAD',
  EG: 'EGP',
  TN: 'TND',
};

const ISO4217 = /^[A-Z]{3}$/;

function normalizeCountryCode(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const u = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(u)) return null;
  return u === 'UK' ? 'GB' : u;
}

export function currencyForCountryCode(countryCode: string | null | undefined): string | null {
  const cc = normalizeCountryCode(countryCode);
  if (!cc) return null;
  return CURRENCY_BY_COUNTRY_CODE[cc] ?? null;
}

/**
 * Moneda para mostrar precios operativos (reservas, micrositio, etc.).
 */
export function getTenantBusinessCurrency(
  tenant: Pick<Tenant, 'country_code' | 'config'> | null | undefined
): string {
  if (!tenant) return 'EUR';
  const fromCountry = currencyForCountryCode(tenant.country_code);
  if (fromCountry) return fromCountry;
  const cfg = tenant.config?.currency;
  if (typeof cfg === 'string' && ISO4217.test(cfg.trim().toUpperCase())) {
    return cfg.trim().toUpperCase();
  }
  return 'EUR';
}

/**
 * Locale BCP 47 para Intl: idioma de la cuenta (config.language) + región del país del negocio.
 * Ej.: inglés en UI + apartamentos en España → en-ES (símbolo € y convenciones de ES).
 */
export function getTenantMoneyFormatLocale(
  tenant: Pick<Tenant, 'country_code' | 'config'> | null | undefined
): string {
  const rawLang =
    (tenant?.config?.language && String(tenant.config.language)) || 'es';
  const lang = rawLang.split(/[-_]/)[0]!.toLowerCase();
  const region =
    normalizeCountryCode(tenant?.country_code ?? undefined) ||
    (lang === 'en' ? 'GB' : 'ES');
  return `${lang}-${region}`;
}

export function formatTenantMoneyAmount(
  amount: number,
  tenant: Pick<Tenant, 'country_code' | 'config'> | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  const currency = getTenantBusinessCurrency(tenant);
  const locale = getTenantMoneyFormatLocale(tenant);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}
