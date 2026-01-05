'use client';

import { useTenant, hasAds } from '@/hooks/useTenant';
import { X } from 'lucide-react';
import { useState } from 'react';

/**
 * Componente de anuncios para planes FREE y FREE+LEGAL
 * Solo se muestra si ads_enabled = true
 */
export default function AdsBanner() {
  const { tenant, loading } = useTenant();
  const [dismissed, setDismissed] = useState(false);

  // No mostrar si está cargando, no hay tenant, no tiene anuncios, o fue cerrado
  if (loading || !tenant || !hasAds(tenant) || dismissed) {
    return null;
  }

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

