'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { useTenant, hasAds } from '@/hooks/useTenant';
import { X } from 'lucide-react';

/**
 * Componente para detectar AdBlock y bloquear la página si está activo
 * Solo se muestra para planes FREE y CHECKIN (que tienen anuncios)
 */
export default function AdBlockDetector() {
  const locale = useLocale();
  const { tenant, loading } = useTenant();
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Solo verificar si el tenant tiene anuncios habilitados
    if (loading || !tenant || !hasAds(tenant)) {
      setChecking(false);
      return;
    }

    // Técnica de detección de AdBlock
    const detectAdBlock = () => {
      // Crear un elemento que los bloqueadores de anuncios suelen bloquear
      const testAd = document.createElement('div');
      testAd.innerHTML = '&nbsp;';
      testAd.className = 'adsbox';
      testAd.style.position = 'absolute';
      testAd.style.left = '-9999px';
      testAd.style.height = '1px';
      testAd.style.width = '1px';
      
      document.body.appendChild(testAd);
      
      // Esperar un momento para que AdBlock procese
      setTimeout(() => {
        const isBlocked = testAd.offsetHeight === 0 || 
                         testAd.offsetWidth === 0 || 
                         testAd.style.display === 'none' ||
                         testAd.style.visibility === 'hidden';
        
        document.body.removeChild(testAd);
        
        // Verificar también si el script de AdSense fue bloqueado
        const adSenseBlocked = !(window as any).adsbygoogle || 
                              ((window as any).adsbygoogle && (window as any).adsbygoogle.loaded === false);
        
        if (isBlocked || adSenseBlocked) {
          setAdBlockDetected(true);
        }
        
        setChecking(false);
      }, 100);
    };

    // También verificar si el script de AdSense se cargó correctamente
    const checkAdSense = () => {
      if (typeof window !== 'undefined') {
        // Esperar a que el script se intente cargar
        setTimeout(() => {
          if (!(window as any).adsbygoogle) {
            setAdBlockDetected(true);
            setChecking(false);
          } else {
            detectAdBlock();
          }
        }, 2000); // Dar tiempo a que AdSense intente cargar
      }
    };

    checkAdSense();
  }, [loading, tenant]);

  // No mostrar nada si está cargando, no hay tenant, o no tiene anuncios
  if (loading || checking || !tenant || !hasAds(tenant) || !adBlockDetected) {
    return null;
  }

  // Bloquear toda la página si AdBlock está detectado
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gradient-to-br from-red-50 to-orange-50 border-4 border-red-400 rounded-2xl shadow-2xl p-8 text-center">
        <div className="mb-6">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-3xl font-bold text-red-900 mb-2">
            Bloqueador de Anuncios Detectado
          </h1>
          <p className="text-lg text-red-800 mb-4">
            Has activado un bloqueador de anuncios en tu navegador
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 mb-6 text-left">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            ¿Por qué necesitamos los anuncios?
          </h2>
          <p className="text-gray-700 mb-4">
            Estás usando el <strong>Plan {tenant.plan_type?.toUpperCase() || 'FREE'}</strong> de Delfín Check-in, 
            que es completamente gratuito gracias a los anuncios publicitarios.
          </p>
          <p className="text-gray-700 mb-4">
            Los anuncios nos permiten ofrecerte el PMS sin coste. Si bloqueas los anuncios, 
            no podemos mantener el servicio gratuito.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Alternativa:</strong> Si prefieres no ver anuncios, puedes actualizar a 
              <strong> Plan PRO (29,99€/mes)</strong> que no incluye anuncios.
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-yellow-900 mb-3">
            📋 Cómo desactivar el bloqueador de anuncios:
          </h3>
          <ol className="text-left text-yellow-800 space-y-2 list-decimal list-inside">
            <li>Busca el icono del bloqueador de anuncios en la barra de herramientas de tu navegador (generalmente en la esquina superior derecha)</li>
            <li>Haz clic en el icono y selecciona "Desactivar en este sitio" o "Pausar en esta página"</li>
            <li>Recarga la página (F5 o Ctrl+R / Cmd+R)</li>
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            🔄 Recargar Página
          </button>
          <a
            href={`/${locale}/upgrade-plan`}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg transition-all duration-200 transform hover:scale-105 text-center"
          >
            💎 Actualizar a Plan PRO
          </a>
        </div>

        <p className="text-sm text-gray-600 mt-6">
          Una vez que desactives el bloqueador de anuncios, podrás usar el PMS normalmente.
        </p>
      </div>
    </div>
  );
}
