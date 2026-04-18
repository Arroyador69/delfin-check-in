/**
 * Anuncios solo en planes gratuitos y Check-in (sin Standard/Pro).
 * Ajusta aquí si cambian los identificadores de plan en el backend.
 */
export function shouldShowMobileAds(planId?: string | null): boolean {
  const p = String(planId || '')
    .trim()
    .toLowerCase();
  if (!p) return false;
  if (p === 'free' || p === 'basic') return true;
  if (p === 'checkin' || p === 'premium') return true;
  return false;
}
