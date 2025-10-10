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
type PlanId = 'basic' | 'basic_yearly' | 'standard' | 'premium' | 'enterprise';

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
    price: 14.99,
    maxRooms: 1,
    color: 'blue',
    icon: Shield,
    features: [
      '1 propiedad',
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
    price: 26.98,
    maxRooms: 2,
    color: 'green',
    icon: Zap,
    popular: true,
    features: [
      '2 propiedades (13,49€ cada una)',
      '10% descuento por volumen',
      'Dashboard completo',
      'Registro MIR automático',
      'Integraciones de calendario',
      'Soporte prioritario'
    ]
  },
  {
    id: 'premium',
    name: 'Plan Premium',
    description: 'Para alojamientos grandes',
    price: 50.96,
    maxRooms: 4,
    color: 'purple',
    icon: TrendingUp,
    features: [
      '4 propiedades (12,74€ cada una)',
      '15% descuento por volumen',
      'Dashboard completo',
      'Registro MIR automático',
      'Integraciones de calendario',
      'Soporte prioritario',
      'Backup automático'
    ]
  },
  {
    id: 'enterprise',
    name: 'Plan Empresarial',
    description: 'Para cadenas hoteleras',
    price: 112.40,
    maxRooms: 10,
    color: 'gold',
    icon: Crown,
    features: [
      '10+ propiedades (11,24€ cada una)',
      '25% descuento por volumen',
      'Todo lo anterior',
      'Soporte 24/7',
      'Gestión multi-propiedad',
      'Soporte telefónico'
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
            <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card 1: Plan mensual */}
              <div className={`relative flex flex-col p-6 bg-white rounded-lg shadow-lg transition-all duration-300 ${currentPlanId === 'basic' ? 'border-4 border-blue-500' : 'border border-gray-200'} hover:shadow-xl hover:scale-[1.02]`}>
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Plan mensual</h2>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-gray-900 mb-1">14,99€</div>
                  <p className="text-sm text-gray-500">/ propiedad / mes</p>
                </div>
                <ul className="flex-grow space-y-3 mb-8">
                  <li className="flex items-center text-gray-700"><CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /><span>Gestión manual de reservas</span></li>
                  <li className="flex items-center text-gray-700"><CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /><span>Check-in online</span></li>
                  <li className="flex items-center text-gray-700"><CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /><span>Gestión de habitaciones</span></li>
                  <li className="flex items-center text-gray-700"><CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /><span>Registro de viajeros</span></li>
                  <li className="flex items-center text-gray-700"><CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /><span>Soporte por email</span></li>
                </ul>
                <button
                  onClick={() => handleSelectPlan('basic')}
                  disabled={currentPlanId === 'basic'}
                  className={`w-full py-3 rounded-md text-lg font-semibold transition-colors duration-200 ${currentPlanId === 'basic' ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {currentPlanId === 'basic' ? 'Plan actual' : 'Contratar'}
                </button>
                <p className="text-xs text-gray-500 mt-4 text-center">Sin permanencia. Cancela cuando quieras.</p>
              </div>

              {/* Card 2: Plan anual - RECOMENDADO */}
              <div className={`relative flex flex-col p-6 bg-white rounded-lg shadow-lg transition-all duration-300 ${currentPlanId === 'basic_yearly' ? 'border-4 border-blue-500' : 'border border-gray-200'} hover:shadow-xl hover:scale-[1.02]`}>
                <span className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">Recomendado</span>
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Plan anual</h2>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-gray-900 mb-1">149,90€</div>
                  <p className="text-sm text-gray-500">/ propiedad / año</p>
                </div>
                <ul className="flex-grow space-y-3 mb-8">
                  <li className="flex items-center text-gray-700"><CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /><span>Todo lo del mensual</span></li>
                  <li className="flex items-center text-gray-700"><CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /><span>Descuento 16,7% por pago anual</span></li>
                  <li className="flex items-center text-gray-700"><CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /><span>Soporte prioritario</span></li>
                  <li className="flex items-center text-gray-700"><CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /><span>Onboarding asistido</span></li>
                  <li className="flex items-center text-gray-700"><CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /><span>Equivale a 12,49€/mes</span></li>
                </ul>
                <button
                  onClick={() => handleSelectPlan('basic_yearly')}
                  disabled={currentPlanId === 'basic_yearly'}
                  className={`w-full py-3 rounded-md text-lg font-semibold transition-colors duration-200 ${currentPlanId === 'basic_yearly' ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {currentPlanId === 'basic_yearly' ? 'Plan actual' : 'Contratar'}
                </button>
                <p className="text-xs text-gray-500 mt-4 text-center">Ahorra 29,90€ al año por propiedad.</p>
              </div>

              {/* Card 3: Descuentos por volumen */}
              <div className={`relative flex flex-col p-6 bg-white rounded-lg shadow-lg transition-all duration-300 ${['standard', 'premium', 'enterprise'].includes(currentPlanId) ? 'border-4 border-blue-500' : 'border border-gray-200'} hover:shadow-xl hover:scale-[1.02]`}>
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">Descuentos por volumen</h2>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-gray-900 mb-1">Hasta 25%</div>
                  <p className="text-sm text-gray-500">descuento</p>
                  <p className="text-lg font-semibold text-gray-700 mt-2">Desde 2 propiedades <span className="text-xs text-gray-500">(mejor precio)</span></p>
                </div>
                <ul className="flex-grow space-y-3 mb-8">
                  <li className="flex items-center text-gray-700"><CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /><span>2 propiedades: 13,49€ cada una</span></li>
                  <li className="flex items-center text-gray-700"><CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /><span>4 propiedades: 12,74€ cada una</span></li>
                  <li className="flex items-center text-gray-700"><CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /><span>5-9 propiedades: 11,99€ cada una</span></li>
                  <li className="flex items-center text-gray-700"><CheckCircle className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" /><span>10+ propiedades: 11,24€ cada una</span></li>
                </ul>
                <button
                  onClick={() => handleSelectPlan('standard')}
                  disabled={['standard', 'premium', 'enterprise'].includes(currentPlanId)}
                  className={`w-full py-3 rounded-md text-lg font-semibold transition-colors duration-200 ${['standard', 'premium', 'enterprise'].includes(currentPlanId) ? 'bg-gray-300 text-gray-700 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  {['standard', 'premium', 'enterprise'].includes(currentPlanId) ? 'Plan actual' : 'Contratar'}
                </button>
                <p className="text-xs text-gray-500 mt-4 text-center">Descuentos automáticos según volumen.</p>
              </div>
              </div>
            </>
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
