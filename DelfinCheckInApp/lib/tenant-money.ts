/**
 * Formato de importes alineado con el país del negocio (API /api/tenant → business_currency, money_format_locale).
 */

export function formatTenantMoney(
  amount: number,
  opts: { currency: string; locale: string }
): string {
  return new Intl.NumberFormat(opts.locale, {
    style: 'currency',
    currency: opts.currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
