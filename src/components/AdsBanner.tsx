'use client';

import { useTenant, hasAds } from '@/hooks/useTenant';
import AffiliateRecommendationSlot from '@/components/AffiliateRecommendationSlot';

/**
 * Componente de anuncios para planes FREE y CHECKIN
 * Muestra anuncios de Google AdSense si están configurados
 * Solo se muestra si ads_enabled = true
 */
export default function AdsBanner() {
  const { tenant, loading } = useTenant();

  if (loading || !tenant || !hasAds(tenant)) return null;
  return <AffiliateRecommendationSlot placement="banner" />;
}

