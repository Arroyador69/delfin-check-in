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
      // Verificar si el script ya está cargado
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
        console.warn('Error inicializando AdSense:', e);
      }
    }
  }, [adSenseReady]);

  // No mostrar si está cargando, no hay tenant, no tiene anuncios, o fue cerrado
  if (loading || !tenant || !hasAds(tenant) || dismissed) {
    return null;
  }

  // Si AdSense no está configurado, mostrar banner de upgrade
  if (!isAdSenseConfigured() || !ADSENSE_CONFIG.adUnits.banner) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 py-3 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="text-2xl">📢</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                ¿Quieres eliminar los anuncios y acceder a todas las funciones?
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Actualiza a <strong>PRO</strong> para disfrutar de un PMS sin anuncios y con todos los módulos legales incluidos.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/upgrade-plan"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              Actualizar a PRO
            </a>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Cerrar anuncio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
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

