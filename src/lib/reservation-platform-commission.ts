/**
 * Estimación de comisión de plataforma según canal (valores orientativos).
 * Canales personalizados (custom_*) → 0.
 */
export function estimatePlatformCommission(amount: number, channel: string | null | undefined): number {
  const c = String(channel || 'direct').toLowerCase();
  if (c.startsWith('custom_')) return 0;
  switch (c) {
    case 'booking':
    case 'vrbo':
    case 'expedia':
    case 'tripadvisor':
      return Math.round(amount * 0.15 * 100) / 100;
    case 'airbnb':
      return Math.round(amount * 0.14 * 100) / 100;
    case 'manual':
    case 'checkin_form':
    case 'direct':
    default:
      return 0;
  }
}
