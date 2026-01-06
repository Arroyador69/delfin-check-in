'use client';

import { useTenant, hasAds } from '@/hooks/useTenant';
import { useEffect, useState } from 'react';
import { isAdSenseConfigured, ADSENSE_CONFIG } from '@/lib/ads';

/**
 * Componente de anuncio para footer
 * Solo se muestra si ads_enabled = true
 */
export default function AdFooter() {
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
        console.warn('Error inicializando AdSense footer:', e);
      }
    }
  }, [adSenseReady]);

  // No mostrar si está cargando, no hay tenant, o no tiene anuncios
  if (loading || !tenant || !hasAds(tenant)) {
    return null;
  }

  // Si AdSense no está configurado, no mostrar nada
  if (!isAdSenseConfigured() || !ADSENSE_CONFIG.adUnits.footer) {
    return null;
  }

  return (
    <div className="bg-gray-50 border-t border-gray-200 py-4 mt-8">
      <div className="max-w-7xl mx-auto px-4">
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', height: '90px' }}
          data-ad-client={ADSENSE_CONFIG.publisherId}
          data-ad-slot={ADSENSE_CONFIG.adUnits.footer}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
        <p className="text-xs text-gray-500 text-center mt-2">Publicidad</p>
      </div>
    </div>
  );
}

