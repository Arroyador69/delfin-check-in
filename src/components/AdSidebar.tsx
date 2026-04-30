'use client';

import { useTenant, hasAds } from '@/hooks/useTenant';
import AffiliateRecommendationSlot from '@/components/AffiliateRecommendationSlot';

/**
 * Componente de anuncio para sidebar (300x250)
 * Solo se muestra si ads_enabled = true
 */
export default function AdSidebar() {
  const { tenant, loading } = useTenant();

  // No mostrar si está cargando, no hay tenant, o no tiene anuncios
  if (loading || !tenant || !hasAds(tenant)) {
    return null;
  }

  return <AffiliateRecommendationSlot placement="sidebar" />;
}

