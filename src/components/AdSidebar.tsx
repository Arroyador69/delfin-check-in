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
          console.warn('Error inicializando AdSense sidebar:', e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [adSenseReady]);

  // Debug: Log para verificar estado
  useEffect(() => {
    if (!loading && tenant) {
      console.log('📢 [AdSidebar] Estado:', {
        hasAds: hasAds(tenant),
        plan_type: tenant.plan_type,
        ads_enabled: tenant.ads_enabled
      });
    }
  }, [loading, tenant]);

  // No mostrar si está cargando, no hay tenant, o no tiene anuncios
  if (loading || !tenant || !hasAds(tenant)) {
    return null;
  }

  // Si AdSense no está configurado, mostrar marcador visual MÁS VISIBLE
  if (!isAdSenseConfigured() || !ADSENSE_CONFIG.adUnits.sidebar) {
    return (
      <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 border-4 border-dashed border-yellow-400 rounded-lg p-6 mb-6 shadow-lg">
        <div className="text-center">
          <div className="text-5xl mb-3 animate-pulse">📢</div>
          <p className="text-sm font-bold text-yellow-900 mb-2">
            ESPACIO PARA ANUNCIO
          </p>
          <p className="text-xs font-semibold text-yellow-800 mb-1">
            Sidebar 300x250 - Plan {tenant.plan_type?.toUpperCase() || 'FREE'}
          </p>
          <p className="text-xs text-yellow-700 mt-2">
            (Configurar unidad de anuncios en AdSense)
          </p>
        </div>
      </div>
    );
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

