'use client';

import { useTenant, hasAds } from '@/hooks/useTenant';
import { usePathname } from 'next/navigation';
import AffiliateRecommendationSlot from '@/components/AffiliateRecommendationSlot';
import { isOnboardingPath } from '@/lib/onboarding-route';

/**
 * Componente de anuncios para planes FREE y CHECKIN
 * Muestra anuncios de Google AdSense si están configurados
 * Solo se muestra si ads_enabled = true
 */
export default function AdsBanner() {
  const { tenant, loading } = useTenant();
  const pathname = usePathname();

  if (loading || !tenant || !hasAds(tenant) || isOnboardingPath(pathname)) return null;
  return <AffiliateRecommendationSlot placement="banner" />;
}

