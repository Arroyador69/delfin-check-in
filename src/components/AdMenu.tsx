'use client';

import { useTenant, hasAds } from '@/hooks/useTenant';
import AffiliateRecommendationSlot from '@/components/AffiliateRecommendationSlot';

/**
 * Componente de anuncio para menú/navegación (728x90 o responsive)
 * Solo se muestra si ads_enabled = true
 */
export default function AdMenu() {
  const { tenant, loading } = useTenant();

  // No mostrar si está cargando, no hay tenant, o no tiene anuncios
  if (loading || !tenant || !hasAds(tenant)) {
    return null;
  }

  return <AffiliateRecommendationSlot placement="menu" />;
}
