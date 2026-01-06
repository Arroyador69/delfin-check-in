'use client';

import { useTenant, hasAds } from '@/hooks/useTenant';
import { useEffect, useState } from 'react';
import { isAdSenseConfigured, ADSENSE_CONFIG } from '@/lib/ads';

/**
 * Componente de anuncio para sidebar (300x250)
 * Solo se muestra si ads_enabled = true
 */
export default function AdSidebar() {
  const { tenant, loading } = useTenant();
  const [adSenseReady, setAdSenseReady] = useState(false);

  // Cargar script de AdSense si está configurado
  useEffect(() => {
    if (isAdSenseConfigured() && typeof window !== 'undefined') {
      if (!document.querySelector('script[src*="adsbygoogle"]')) {
        const script = document.createElement('script');
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CONFIG.publisherId}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
      }
      setAdSenseReady(true);
    }
  }, []);

  // Inicializar anuncios cuando estén listos
  useEffect(() => {
    if (adSenseReady && typeof window !== 'undefined' && (window as any).adsbygoogle) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) {
        console.warn('Error inicializando AdSense sidebar:', e);
      }
    }
  }, [adSenseReady]);

  // No mostrar si está cargando, no hay tenant, o no tiene anuncios
  if (loading || !tenant || !hasAds(tenant)) {
    return null;
  }

  // Si AdSense no está configurado, no mostrar nada
  if (!isAdSenseConfigured() || !ADSENSE_CONFIG.adUnits.sidebar) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minHeight: '250px' }}
        data-ad-client={ADSENSE_CONFIG.publisherId}
        data-ad-slot={ADSENSE_CONFIG.adUnits.sidebar}
        data-ad-format="rectangle"
      />
      <p className="text-xs text-gray-500 text-center mt-2">Publicidad</p>
    </div>
  );
}

