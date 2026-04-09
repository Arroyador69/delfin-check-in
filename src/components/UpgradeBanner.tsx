'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { X, Zap, Crown, ArrowRight } from 'lucide-react';

interface UpgradeBannerProps {
  currentPlan: 'free' | 'checkin' | 'standard' | 'pro';
  feature?: string;
  suggestedPlan?: 'checkin' | 'pro';
  dismissible?: boolean;
  className?: string;
}

export default function UpgradeBanner({
  currentPlan,
  feature,
  suggestedPlan,
  dismissible = true,
  className = ''
}: UpgradeBannerProps) {
  const locale = useLocale();
  const [dismissed, setDismissed] = useState(false);

  // No mostrar si ya está en el plan más alto
  if (currentPlan === 'pro') {
    return null;
  }

  // Determinar plan sugerido si no se especifica (free -> checkin, checkin/standard -> pro)
  const targetPlan = suggestedPlan || (currentPlan === 'free' ? 'checkin' : 'pro');
  
  const planInfo = {
    checkin: {
      name: 'Plan Check-in',
      price: '2€/mes + 2€/unidad extra',
      icon: Zap,
      color: 'green',
      description: 'Desbloquea el check-in digital automático'
    },
    pro: {
      name: 'Plan Pro',
      price: '29,99€/mes',
      icon: Crown,
      color: 'purple',
      description: 'Sin anuncios y todas las funciones'
    }
  };

  const info = planInfo[targetPlan];
  const Icon = info.icon;

  if (dismissed) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-${info.color}-50 to-${info.color}-100 border border-${info.color}-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-${info.color}-500 flex items-center justify-center`}>
          <Icon className="text-white" size={20} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className={`font-semibold text-${info.color}-900 mb-1`}>
                {feature ? `Desbloquea: ${feature}` : `Actualiza a ${info.name}`}
              </h4>
              <p className="text-sm text-gray-700 mb-2">
                {info.description} desde {info.price}
              </p>
              <Link
                href={`/${locale}/plans`}
                className={`inline-flex items-center gap-1 text-sm font-medium text-${info.color}-700 hover:text-${info.color}-900 transition-colors`}
              >
                Ver planes
                <ArrowRight size={14} />
              </Link>
            </div>
            
            {dismissible && (
              <button
                onClick={() => setDismissed(true)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

