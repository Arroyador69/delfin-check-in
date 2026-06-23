import { canShowAffiliateMonetizationInApp } from '@/lib/ios-app-store-compliance';

/**
 * Anuncios solo plan Gratis y Check-in (alineado con web: hasAds).
 * Standard, Pro y Enterprise: sin anuncios.
 * iOS App Store: sin afiliado ni bloques de monetización.
 */
export function shouldShowMobileAds(planId?: string | null): boolean {
  if (!canShowAffiliateMonetizationInApp()) return false;
  const p = String(planId || '')
    .trim()
    .toLowerCase();
  if (!p) return false;
  if (p === 'standard' || p === 'pro' || p === 'enterprise') return false;
  if (p === 'free' || p === 'basic') return true;
  if (p === 'checkin' || p === 'premium') return true;
  return false;
}
