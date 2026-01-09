'use client';

import { useTenant, hasAds } from '@/hooks/useTenant';
import { useEffect, useState } from 'react';
import { isAdSenseConfigured, ADSENSE_CONFIG } from '@/lib/ads';

/**
 * Componente de anuncio para menú/navegación (728x90 o responsive)
 * Solo se muestra si ads_enabled = true
 */
export default function AdMenu() {
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
          const adElements = document.querySelectorAll('.adsbygoogle-menu');
          adElements.forEach((el) => {
            if (!el.hasAttribute('data-adsbygoogle-status')) {
              ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
            }
          });
        } catch (e) {
          console.warn('Error inicializando AdSense menú:', e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [adSenseReady]);

  // Debug: Log para verificar estado
  useEffect(() => {
    if (!loading && tenant) {
      console.log('📢 [AdMenu] Estado:', {
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
  if (!isAdSenseConfigured() || !ADSENSE_CONFIG.adUnits.banner) {
    return (
      <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-dashed border-yellow-400 px-3 py-2 mx-2 my-2 rounded-lg shadow-md">
        <div className="text-center">
          <div className="text-2xl mb-1 animate-pulse">📢</div>
          <p className="text-xs font-bold text-yellow-900 mb-1">
            ANUNCIO (Menú)
          </p>
          <p className="text-xs text-yellow-800">
            Plan {tenant.plan_type?.toUpperCase() || 'FREE'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 py-2 mx-2 my-2 bg-white border border-gray-200 rounded-lg">
      <ins
        className="adsbygoogle-menu"
        style={{ display: 'block', width: '100%', minHeight: '90px' }}
        data-ad-client={ADSENSE_CONFIG.publisherId}
        data-ad-slot={ADSENSE_CONFIG.adUnits.banner}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
      <p className="text-xs text-gray-500 text-center mt-1">Publicidad</p>
    </div>
  );
}
