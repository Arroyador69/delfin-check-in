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

  // El script ya se carga en layout.tsx, solo verificar que esté listo
  useEffect(() => {
    if (isAdSenseConfigured() && typeof window !== 'undefined') {
      const checkAdSense = () => {
        if ((window as any).adsbygoogle) {
          setAdSenseReady(true);
        } else {
          setTimeout(checkAdSense, 100);
        }
      };
      checkAdSense();
    }
  }, []);

  // Inicializar anuncios cuando estén listos (solo una vez)
  useEffect(() => {
    if (adSenseReady && typeof window !== 'undefined' && (window as any).adsbygoogle) {
      const timer = setTimeout(() => {
        try {
          const adElements = document.querySelectorAll('.adsbygoogle');
          adElements.forEach((el) => {
            if (!el.hasAttribute('data-adsbygoogle-status')) {
              ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
            }
          });
        } catch (e) {
          console.warn('Error inicializando AdSense footer:', e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [adSenseReady]);

  // No mostrar si está cargando, no hay tenant, o no tiene anuncios
  if (loading || !tenant || !hasAds(tenant)) {
    return null;
  }

  // Si AdSense no está configurado, mostrar marcador visual
  if (!isAdSenseConfigured() || !ADSENSE_CONFIG.adUnits.footer) {
    return (
      <div className="bg-yellow-50 border-t-2 border-dashed border-yellow-300 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center">
            <div className="text-2xl mb-2">📢</div>
            <p className="text-xs font-semibold text-yellow-800 mb-1">Espacio para Anuncio</p>
            <p className="text-xs text-yellow-700">Footer Responsive</p>
            <p className="text-xs text-yellow-600 mt-2">(Configurar unidad de anuncios en AdSense)</p>
          </div>
        </div>
      </div>
    );
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

