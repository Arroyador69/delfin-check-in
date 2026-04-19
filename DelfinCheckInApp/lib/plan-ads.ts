/**
 * Anuncios solo plan Gratis y Check-in (alineado con web: hasAds).
 * Standard, Pro y Enterprise: sin anuncios.
 * Legacy plan_id: basic ≈ gratis, premium ≈ check-in (tenant-plan-billing).
 */
export function shouldShowMobileAds(planId?: string | null): boolean {
  const p = String(planId || '')
    .trim()
    .toLowerCase();
  if (!p) return false;
  if (p === 'standard' || p === 'pro' || p === 'enterprise') return false;
  if (p === 'free' || p === 'basic') return true;
  if (p === 'checkin' || p === 'premium') return true;
  return false;
}
