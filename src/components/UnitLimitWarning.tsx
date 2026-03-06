'use client';

import { useTenant } from '@/hooks/useTenant';
import { AlertTriangle, ArrowUpCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';

/**
 * Componente que muestra advertencia cuando se está cerca del límite de unidades
 * o cuando se alcanza el límite. Usa traducciones según el idioma seleccionado.
 */
export default function UnitLimitWarning() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
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
            {isAtLimit ? t('unitLimitBannerTitleAtLimit') : t('unitLimitBannerTitleNear')}
          </h3>
          <p className={`text-sm mb-3 ${
            isAtLimit ? 'text-red-700' : 'text-yellow-700'
          }`}>
            {isAtLimit
              ? t('unitLimitBannerAtLimit', { max: maxUnits })
              : t('unitLimitBannerNear', {
                  current,
                  max: maxUnits,
                  percent: Math.round(usagePercent),
                  remaining: maxUnits - current,
                })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}/upgrade-plan`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowUpCircle className="w-4 h-4" />
              {t('unitLimitUpgradeToPro')}
            </Link>
            {!isAtLimit && (
              <button
                onClick={() => setDismissed(true)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                {t('unitLimitDismiss')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

