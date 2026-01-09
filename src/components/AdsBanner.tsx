'use client';

import { useTenant, hasAds } from '@/hooks/useTenant';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { isAdSenseConfigured, ADSENSE_CONFIG } from '@/lib/ads';

/**
 * Componente de anuncios para planes FREE y CHECKIN
 * Muestra anuncios de Google AdSense si están configurados
 * Solo se muestra si ads_enabled = true
 */
export default function AdsBanner() {
  const { tenant, loading } = useTenant();
  const [dismissed, setDismissed] = useState(false);
  const [adSenseReady, setAdSenseReady] = useState(false);

  // Cargar script de AdSense si está configurado
  useEffect(() => {
    if (isAdSenseConfigured() && typeof window !== 'undefined') {
      // El script ya se carga en layout.tsx, solo verificar que esté listo
      const checkAdSense = () => {
        if ((window as any).adsbygoogle) {
          setAdSenseReady(true);
        } else {
          // Esperar a que el script se cargue
          setTimeout(checkAdSense, 100);
        }
      };
      checkAdSense();
    }
  }, []);

  // Inicializar anuncios cuando estén listos (solo una vez)
  useEffect(() => {
    if (adSenseReady && typeof window !== 'undefined' && (window as any).adsbygoogle) {
      // Esperar un poco para asegurar que el DOM esté listo
      const timer = setTimeout(() => {
        try {
          const adElements = document.querySelectorAll('.adsbygoogle');
          adElements.forEach((el, index) => {
            // Solo inicializar si no tiene ads ya
            if (!el.hasAttribute('data-adsbygoogle-status')) {
              ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
            }
          });
        } catch (e) {
          console.warn('Error inicializando AdSense:', e);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [adSenseReady]);

  // Debug: Log para verificar estado
  useEffect(() => {
    if (!loading && tenant) {
      console.log('📢 [AdsBanner] Estado:', {
        hasAds: hasAds(tenant),
        plan_type: tenant.plan_type,
        ads_enabled: tenant.ads_enabled,
        isAdSenseConfigured: isAdSenseConfigured(),
        adSenseReady
      });
    }
  }, [loading, tenant, adSenseReady]);

  // No mostrar si está cargando, no hay tenant, no tiene anuncios, o fue cerrado
  if (loading || !tenant || !hasAds(tenant) || dismissed) {
    return null;
  }

  // Si AdSense no está configurado, mostrar marcador visual MÁS VISIBLE
  if (!isAdSenseConfigured() || !ADSENSE_CONFIG.adUnits.banner) {
    return (
      <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 border-b-4 border-dashed border-yellow-400 px-4 py-4 relative shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="text-4xl animate-pulse">📢</div>
            <div className="flex-1">
              <p className="text-base font-bold text-yellow-900">
                📢 ESPACIO PARA ANUNCIO (Banner Superior) - Plan {tenant.plan_type?.toUpperCase() || 'FREE'}
              </p>
              <p className="text-sm text-yellow-800 mt-1 font-medium">
                Este espacio mostrará anuncios de Google AdSense cuando esté configurado. 
                <span className="ml-2 text-yellow-700">(Solo visible en planes FREE y CHECKIN)</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-200 rounded-full transition-colors"
            aria-label="Cerrar marcador"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  // Mostrar anuncio de Google AdSense
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <ins
              className="adsbygoogle"
              style={{ display: 'block', width: '100%', height: '90px' }}
              data-ad-client={ADSENSE_CONFIG.publisherId}
              data-ad-slot={ADSENSE_CONFIG.adUnits.banner}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label="Cerrar anuncio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500 text-center mt-1">Publicidad</p>
      </div>
    </div>
  );
}

