'use client';

import { useTenant } from '@/hooks/useTenant';
import { AlertTriangle, ArrowUpCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * Componente que muestra advertencia cuando se está cerca del límite de unidades
 * o cuando se alcanza el límite
 */
export default function UnitLimitWarning() {
  const { tenant, loading } = useTenant();
  const [currentCount, setCurrentCount] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (tenant) {
      // Obtener conteo actual de unidades
      fetch('/api/rooms')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setCurrentCount(data.length);
          }
        })
        .catch(() => {
          // Si falla, usar current_rooms del tenant
          setCurrentCount(tenant.current_rooms);
        });
    }
  }, [tenant]);

  if (loading || !tenant || dismissed) {
    return null;
  }

  const maxUnits = tenant.max_rooms === -1 ? Infinity : tenant.max_rooms;
  const current = currentCount ?? tenant.current_rooms;
  const usagePercent = maxUnits === Infinity ? 0 : (current / maxUnits) * 100;

  // Solo mostrar si está cerca del límite (80%+) o lo alcanzó
  if (maxUnits === Infinity || usagePercent < 80) {
    return null;
  }

  const isAtLimit = current >= maxUnits;

  return (
    <div className={`mb-6 rounded-lg border-2 p-4 ${
      isAtLimit 
        ? 'bg-red-50 border-red-200' 
        : 'bg-yellow-50 border-yellow-200'
    }`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`w-5 h-5 mt-0.5 ${
          isAtLimit ? 'text-red-600' : 'text-yellow-600'
        }`} />
        <div className="flex-1">
          <h3 className={`font-semibold mb-1 ${
            isAtLimit ? 'text-red-900' : 'text-yellow-900'
          }`}>
            {isAtLimit ? '⚠️ Límite de unidades alcanzado' : '⚠️ Cerca del límite de unidades'}
          </h3>
          <p className={`text-sm mb-3 ${
            isAtLimit ? 'text-red-700' : 'text-yellow-700'
          }`}>
            {isAtLimit ? (
              <>
                Has alcanzado el límite de <strong>{maxUnits} unidades</strong> de tu plan actual. 
                No puedes crear más unidades hasta que actualices tu plan.
              </>
            ) : (
              <>
                Estás usando <strong>{current} de {maxUnits} unidades</strong> ({Math.round(usagePercent)}%). 
                Te quedan <strong>{maxUnits - current} unidades</strong> disponibles.
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="/upgrade-plan"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowUpCircle className="w-4 h-4" />
              Actualizar a PRO
            </a>
            {!isAtLimit && (
              <button
                onClick={() => setDismissed(true)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Recordar más tarde
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

