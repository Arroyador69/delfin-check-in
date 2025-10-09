'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Crown, Zap, Shield, TrendingUp } from 'lucide-react';
import Link from 'next/link';

// Tipos de planes
type PlanId = 'basic' | 'standard' | 'premium' | 'enterprise';

interface Plan {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  maxRooms: number;
  features: string[];
  popular?: boolean;
  color: string;
  icon: any;
}

const PLANS: Plan[] = [
  {
    id: 'basic',
    name: 'Plan Básico',
    description: 'Perfecto para pequeños alojamientos',
    price: 29,
    maxRooms: 2,
    color: 'blue',
    icon: Shield,
    features: [
      'Hasta 2 habitaciones',
      'Dashboard completo',
      'Registro MIR automático',
      'Integraciones de calendario',
      'Soporte por email'
    ]
  },
  {
    id: 'standard',
    name: 'Plan Estándar',
    description: 'Ideal para alojamientos medianos',
    price: 49,
    maxRooms: 4,
    color: 'green',
    icon: Zap,
    popular: true,
    features: [
      'Hasta 4 habitaciones',
      'Dashboard completo',
      'Registro MIR automático',
      'Integraciones de calendario',
      'Soporte prioritario',
      'Backup automático'
    ]
  },
  {
    id: 'premium',
    name: 'Plan Premium',
    description: 'Para alojamientos grandes',
    price: 79,
    maxRooms: 6,
    color: 'purple',
    icon: TrendingUp,
    features: [
      'Hasta 6 habitaciones',
      'Dashboard completo',
      'Registro MIR automático',
      'Integraciones de calendario',
      'Soporte prioritario',
      'Backup automático',
      'Análisis avanzados',
      'API personalizada'
    ]
  },
  {
    id: 'enterprise',
    name: 'Plan Empresarial',
    description: 'Para cadenas hoteleras',
    price: 149,
    maxRooms: -1,
    color: 'gold',
    icon: Crown,
    features: [
      'Habitaciones ilimitadas',
      'Todo lo anterior',
      'Soporte 24/7',
      'Gestión multi-propiedad',
      'Soporte telefónico',
      'Consultoría personalizada'
    ]
  }
];

export default function UpgradePlanPage() {
  const router = useRouter();
  const [currentPlan] = useState<PlanId>('basic'); // TODO: Obtener del tenant actual
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async (planId: PlanId) => {
    setIsUpgrading(true);
    setSelectedPlan(planId);

    try {
      // Obtener email del usuario actual (TODO: obtener del contexto de auth)
      const email = prompt('Ingresa tu email para el pago:');
      if (!email) {
        setIsUpgrading(false);
        setSelectedPlan(null);
        return;
      }

      // Crear payment intent con Stripe
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          email,
          name: email.split('@')[0] // Usar parte del email como nombre por defecto
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al procesar el pago');
      }

      const { client_secret } = await response.json();
      
      // TODO: Integrar con Stripe Elements para procesar el pago
      // Por ahora mostramos el client_secret
      console.log('Client Secret:', client_secret);
      alert(`Upgrade a ${PLANS.find(p => p.id === planId)?.name} iniciado. Client Secret: ${client_secret.substring(0, 20)}...`);
      
    } catch (error: any) {
      console.error('Error en upgrade:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsUpgrading(false);
      setSelectedPlan(null);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, any> = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-500',
        text: 'text-blue-600',
        button: 'bg-blue-600 hover:bg-blue-700',
        badge: 'bg-blue-500'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-500',
        text: 'text-green-600',
        button: 'bg-green-600 hover:bg-green-700',
        badge: 'bg-green-500'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-500',
        text: 'text-purple-600',
        button: 'bg-purple-600 hover:bg-purple-700',
        badge: 'bg-purple-500'
      },
      gold: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-500',
        text: 'text-yellow-600',
        button: 'bg-yellow-600 hover:bg-yellow-700',
        badge: 'bg-yellow-500'
      }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Link
                href="/"
                className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Volver al dashboard"
              >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mejorar Plan</h1>
                <p className="text-sm text-gray-600">Elige el plan perfecto para tu negocio</p>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Plan actual: <span className="font-bold text-blue-600">{PLANS.find(p => p.id === currentPlan)?.name}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Título y descripción */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Planes diseñados para crecer contigo
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Cambia de plan en cualquier momento. Sin permanencia. Cancela cuando quieras.
          </p>
        </div>

        {/* Grid de planes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const colors = getColorClasses(plan.color);
            const isCurrentPlan = plan.id === currentPlan;
            const canUpgrade = PLANS.findIndex(p => p.id === currentPlan) < PLANS.findIndex(p => p.id === plan.id);

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:transform hover:-translate-y-2 hover:shadow-2xl ${
                  plan.popular ? 'ring-2 ring-green-500 scale-105' : ''
                } ${isCurrentPlan ? 'ring-2 ring-blue-500' : ''}`}
              >
                {/* Badge de popular */}
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1 text-xs font-bold rounded-bl-lg">
                    MÁS POPULAR
                  </div>
                )}

                {/* Badge de plan actual */}
                {isCurrentPlan && (
                  <div className="absolute top-0 left-0 bg-blue-500 text-white px-4 py-1 text-xs font-bold rounded-br-lg">
                    PLAN ACTUAL
                  </div>
                )}

                <div className="p-8">
                  {/* Icono y nombre */}
                  <div className="text-center mb-6">
                    <div className={`inline-flex p-4 rounded-full ${colors.bg} mb-4`}>
                      <Icon className={`w-8 h-8 ${colors.text}`} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 text-sm">{plan.description}</p>
                  </div>

                  {/* Precio */}
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl font-extrabold text-gray-900">€{plan.price}</span>
                      <span className="text-gray-500 ml-2">/mes</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {plan.maxRooms === -1 ? 'Habitaciones ilimitadas' : `Hasta ${plan.maxRooms} habitaciones`}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className={`w-5 h-5 ${colors.text} flex-shrink-0 mt-0.5`} />
                        <span className="ml-3 text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Botón */}
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full py-3 px-6 rounded-lg font-semibold bg-gray-400 text-white cursor-not-allowed"
                    >
                      Plan Actual
                    </button>
                  ) : canUpgrade ? (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={isUpgrading}
                      className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-colors ${colors.button} disabled:opacity-50`}
                    >
                      {isUpgrading && selectedPlan === plan.id ? 'Procesando...' : 'Mejorar a este plan'}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-3 px-6 rounded-lg font-semibold bg-gray-300 text-gray-600 cursor-not-allowed"
                    >
                      Plan inferior
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Información adicional */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">¿Necesitas ayuda para elegir?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">💬</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Soporte por chat</h4>
                <p className="text-sm text-gray-600">Disponible de lunes a viernes de 9:00 a 18:00</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📧</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Email</h4>
                <p className="text-sm text-gray-600">soporte@delfincheckin.com</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📞</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Teléfono</h4>
                <p className="text-sm text-gray-600">Plan Enterprise: Soporte 24/7</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Preguntas frecuentes</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">¿Puedo cambiar de plan en cualquier momento?</h4>
              <p className="text-sm text-gray-600">Sí, puedes mejorar o cambiar tu plan cuando quieras. Los cambios se aplican inmediatamente.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">¿Qué pasa si supero el límite de habitaciones?</h4>
              <p className="text-sm text-gray-600">Te notificaremos y podrás mejorar tu plan fácilmente. Mientras tanto, no podrás añadir más habitaciones.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">¿Hay permanencia?</h4>
              <p className="text-sm text-gray-600">No, puedes cancelar tu suscripción en cualquier momento sin penalización.</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">¿Qué métodos de pago aceptáis?</h4>
              <p className="text-sm text-gray-600">Aceptamos todas las tarjetas de crédito y débito principales mediante Stripe (procesamiento seguro).</p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
