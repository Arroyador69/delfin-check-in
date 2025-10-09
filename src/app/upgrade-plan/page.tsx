'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, Crown, Zap, Shield, TrendingUp, Loader2, CreditCard } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Inicializar Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

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

function CheckoutForm({ planId, onSuccess, onError }: { planId: PlanId; onSuccess: () => void; onError: (error: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      // Crear payment method con el CardElement
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('CardElement no encontrado');
      }

      const { error: methodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (methodError) {
        throw new Error(methodError.message);
      }

      // Procesar el upgrade en el backend
      const response = await fetch('/api/upgrade-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          paymentMethodId: paymentMethod.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error procesando el upgrade');
      }

      // Si hay client_secret, confirmar el pago
      if (data.client_secret) {
        const { error: confirmError } = await stripe.confirmCardPayment(data.client_secret);
        
        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }

      onSuccess();

    } catch (error: any) {
      onError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Información de tarjeta
        </label>
        <div className="p-4 border border-gray-300 rounded-lg">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Confirmar cambio de plan
          </>
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Tus datos de pago están protegidos con encriptación SSL
      </p>
    </form>
  );
}

function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPlanId, setCurrentPlanId] = useState<PlanId>('basic');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    loadCurrentPlan();
    
    // Obtener plan de la URL si está presente
    const urlPlan = searchParams.get('plan') as PlanId;
    if (urlPlan && PLANS.find(p => p.id === urlPlan)) {
      setSelectedPlanId(urlPlan);
    }
  }, [searchParams]);

  const loadCurrentPlan = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tenant');
      const data = await response.json();
      
      if (response.ok && data.tenant) {
        setCurrentPlanId(data.tenant.plan_id as PlanId);
      }
    } catch (error) {
      console.error('Error cargando plan actual:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId: PlanId) => {
    if (planId === currentPlanId) {
      return;
    }
    setSelectedPlanId(planId);
    setShowCheckout(true);
  };

  const handleUpgradeSuccess = () => {
    setSuccess(true);
    setShowCheckout(false);
    
    setTimeout(() => {
      router.push('/settings/billing');
    }, 2000);
  };

  const handleUpgradeError = (errorMessage: string) => {
    setError(errorMessage);
    setTimeout(() => setError(''), 5000);
  };

  const currentPlan = PLANS.find(p => p.id === currentPlanId);
  const selectedPlan = selectedPlanId ? PLANS.find(p => p.id === selectedPlanId) : null;
  const isUpgrade = selectedPlan && selectedPlan.price > (currentPlan?.price || 0);
  const isDowngrade = selectedPlan && selectedPlan.price < (currentPlan?.price || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando planes...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-6">
              <Link 
                href="/settings/billing"
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Cambiar de plan</h1>
                <p className="text-sm text-gray-600">
                  Plan actual: <span className="font-semibold">{currentPlan?.name}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <Check className="w-5 h-5 text-green-600 mr-3" />
              <p className="text-green-800">
                ¡Plan actualizado correctamente! Redirigiendo...
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {!showCheckout ? (
            /* Plans Grid */
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                const isCurrent = plan.id === currentPlanId;
                const isSelected = plan.id === selectedPlanId;

                return (
                  <div
                    key={plan.id}
                    className={`relative bg-white rounded-lg shadow-lg p-6 border-2 transition-all ${
                      isCurrent
                        ? 'border-blue-500'
                        : isSelected
                        ? 'border-green-500'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {plan.popular && !isCurrent && (
                      <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs px-3 py-1 rounded-bl-lg rounded-tr-lg font-semibold">
                        Popular
                      </div>
                    )}

                    {isCurrent && (
                      <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-bl-lg rounded-tr-lg font-semibold">
                        Plan actual
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <Icon className={`w-12 h-12 mx-auto mb-4 text-${plan.color}-600`} />
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                      <p className="text-sm text-gray-600 mb-4">{plan.description}</p>
                      
                      <div className="text-4xl font-bold text-gray-900 mb-1">
                        €{plan.price}
                      </div>
                      <p className="text-sm text-gray-500">por mes</p>
                    </div>

                    <ul className="space-y-3 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start text-sm text-gray-700">
                          <Check className="w-5 h-5 text-green-600 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isCurrent}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                        isCurrent
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : `bg-${plan.color}-600 text-white hover:bg-${plan.color}-700`
                      }`}
                    >
                      {isCurrent ? 'Plan actual' : 'Seleccionar'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Checkout Form */
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {isUpgrade ? 'Upgrade a' : 'Cambiar a'} {selectedPlan?.name}
                </h2>

                <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Plan actual:</span>
                    <span className="font-semibold">{currentPlan?.name} - €{currentPlan?.price}/mes</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Nuevo plan:</span>
                    <span className="font-semibold text-green-600">{selectedPlan?.name} - €{selectedPlan?.price}/mes</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">
                        {isUpgrade ? 'Costo adicional:' : 'Nuevo costo:'}
                      </span>
                      <span className="text-xl font-bold text-gray-900">
                        €{selectedPlan?.price}/mes
                      </span>
                    </div>
                  </div>
                </div>

                <Elements stripe={stripePromise}>
                  <CheckoutForm
                    planId={selectedPlanId!}
                    onSuccess={handleUpgradeSuccess}
                    onError={handleUpgradeError}
                  />
                </Elements>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowCheckout(false)}
                    className="text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Volver a planes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">💡 Información importante</h3>
            <ul className="text-blue-800 text-sm space-y-2">
              <li>• Los upgrades son efectivos inmediatamente</li>
              <li>• Los downgrades se aplican al final del período de facturación actual</li>
              <li>• Puedes cancelar en cualquier momento desde la configuración de facturación</li>
              <li>• Todos los planes incluyen soporte técnico</li>
            </ul>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function UpgradePlanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <UpgradeContent />
    </Suspense>
  );
}
