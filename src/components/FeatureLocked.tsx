'use client';

import { Lock, Zap, Crown } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import UpgradeBanner from './UpgradeBanner';

interface FeatureLockedProps {
  feature: string;
  currentPlan: 'free' | 'checkin' | 'standard' | 'pro';
  requiredPlan: 'checkin' | 'pro';
  children?: React.ReactNode;
  showBanner?: boolean;
  className?: string;
}

export default function FeatureLocked({
  feature,
  currentPlan,
  requiredPlan,
  children,
  showBanner = true,
  className = ''
}: FeatureLockedProps) {
  // Si el usuario tiene el plan requerido o superior, mostrar contenido
  const hasAccess = 
    (requiredPlan === 'checkin' && (currentPlan === 'checkin' || currentPlan === 'standard' || currentPlan === 'pro')) ||
    (requiredPlan === 'pro' && currentPlan === 'pro');

  if (hasAccess) {
    return <>{children}</>;
  }

  const planInfo = {
    checkin: {
      name: 'Plan Check-in',
      price: '2€/mes + 2€/unidad extra',
      icon: Zap,
      color: 'green'
    },
    pro: {
      name: 'Plan Pro',
      price: '29,99€/mes',
      icon: Crown,
      color: 'purple'
    }
  };

  const info = planInfo[requiredPlan];
  const Icon = info.icon;

  return (
    <div className={`relative ${className}`}>
      {/* Overlay con blur */}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-${info.color}-100 mb-4`}>
            <Lock className={`text-${info.color}-600`} size={32} />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Función Bloqueada
          </h3>
          
          <p className="text-gray-600 mb-4">
            {feature} está disponible en el {info.name}
          </p>

          <Link
            href="/plans"
            className={`inline-flex items-center gap-2 bg-${info.color}-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-${info.color}-700 transition-colors`}
          >
            <Icon size={18} />
            Actualizar a {info.name}
          </Link>
        </div>
      </div>

      {/* Contenido bloqueado (con opacidad) */}
      <div className="opacity-30 pointer-events-none">
        {children}
      </div>

      {/* Banner opcional debajo */}
      {showBanner && (
        <div className="mt-4">
          <UpgradeBanner
            currentPlan={currentPlan}
            feature={feature}
            suggestedPlan={requiredPlan}
          />
        </div>
      )}
    </div>
  );
}

