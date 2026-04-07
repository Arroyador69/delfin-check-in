'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Crown, Zap, Loader2, Calculator, Info } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useClientTranslations } from '@/hooks/useClientTranslations';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

type PlanId = 'checkin' | 'pro';

interface Plan {
  id: PlanId;
  name: string;
  description: string;
  basePrice: number; // Sin IVA
  maxRooms: number;
  maxRoomsIncluded: number;
  extraRoomPrice?: number;
  adsEnabled: boolean;
  legalModule: boolean;
  features: string[];
  popular?: boolean;
  color: string;
  icon: any;
}

const PLANS: Plan[] = [
  {
    id: 'checkin',
    name: 'Plan Check-in',
    description: 'PMS con check-in digital automático',
    basePrice: 2, // Sin IVA
    maxRooms: -1, // Ilimitado
    maxRoomsIncluded: 1,
    extraRoomPrice: 2,
    color: 'green',
    icon: Zap,
    popular: true,
    adsEnabled: true,
    legalModule: true,
    features: [
      'Incluye 1 unidad',
      'Unidades adicionales: 2€/mes',
      'Check-in digital automático (MIR)',
      'Registro de viajeros ilimitado',
      'PMS completo',
      'Reservas directas (9% fee)',
      'Anuncios discretos',
      'Soporte prioritario'
    ]
  },
  {
    id: 'pro',
    name: 'Plan Pro',
    description: 'PMS completo sin anuncios',
    basePrice: 29.99, // Sin IVA
    maxRooms: -1, // Ilimitado
    maxRoomsIncluded: 1,
    extraRoomPrice: 2,
    color: 'purple',
    icon: Crown,
    adsEnabled: false,
    legalModule: true,
    features: [
      'Incluye 1 unidad',
      'Unidades adicionales: 2€/mes',
      'Check-in digital automático (MIR)',
      'Sin anuncios',
      'PMS completo',
      'Reservas directas (9% fee)',
      'Soporte prioritario',
      'Backup automático'
    ]
  }
];

function CheckoutForm({ 
  planId, 
  roomCount, 
  pricing, 
  onSuccess, 
  onError 
}: { 
  planId: PlanId;
  roomCount: number;
  pricing: {
    base_price: number;
    vat_rate: number;
    vat_amount: number;
    total: number;
  };
  onSuccess: () => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Elemento de tarjeta no encontrado');
      }

      // Crear payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (pmError || !paymentMethod) {
        throw new Error(pmError?.message || 'Error creando método de pago');
      }

      // Crear suscripción
      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          paymentMethodId: paymentMethod.id,
          roomCount,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error creando suscripción');
      }

      onSuccess();
    } catch (err: any) {
      const errorMessage = err.message || 'Error procesando pago';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Precio base:</span>
            <span>{pricing.base_price.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between">
            <span>IVA ({pricing.vat_rate}%):</span>
            <span>{pricing.vat_amount.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total:</span>
            <span>{pricing.total.toFixed(2)}€/mes</span>
          </div>
        </div>
      </div>

      <div className="border rounded-lg p-4">
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
            },
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Procesando...
          </>
        ) : (
          <>
            Suscribirse por {pricing.total.toFixed(2)}€/mes
          </>
        )}
      </button>
    </form>
  );
}

function PlanCalculator({ planId, onPriceChange }: { planId: PlanId; onPriceChange: (pricing: any) => void }) {
  const [roomCount, setRoomCount] = useState(2);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const plan = PLANS.find(p => p.id === planId);
  if (!plan) return null;

  useEffect(() => {
    calculatePrice();
  }, [roomCount, planId]);

  const calculatePrice = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/plans/calculate-price?planId=${planId}&roomCount=${roomCount}`);
      const data = await response.json();
      
      if (data.success) {
        setPricing(data.pricing);
        onPriceChange(data.pricing);
      }
    } catch (error) {
      console.error('Error calculando precio:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 p-6 rounded-lg border-2 border-dashed border-gray-300">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="text-blue-600" size={20} />
        <h3 className="font-semibold text-lg">Calculadora de Precio</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Número de habitaciones:
          </label>
          <input
            type="number"
            min={plan.maxRoomsIncluded}
            value={roomCount}
            onChange={(e) => setRoomCount(parseInt(e.target.value) || plan.maxRoomsIncluded)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {plan.maxRoomsIncluded} habitaciones incluidas en el precio base
            {plan.extraRoomPrice && `, ${plan.extraRoomPrice}€/mes por cada adicional`}
          </p>
        </div>

        {pricing && (
          <div className="bg-white p-4 rounded-lg border">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Precio base:</span>
                <span>{pricing.base_price.toFixed(2)}€</span>
              </div>
              {pricing.extra_rooms_price > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Habitaciones extra ({pricing.extra_rooms || 0}):</span>
                  <span>+{pricing.extra_rooms_price.toFixed(2)}€</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{pricing.subtotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>IVA ({pricing.vat.vat_rate}%):</span>
                <span>+{pricing.vat.vat_amount.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total mensual:</span>
                <span className="text-blue-600">{pricing.total.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function UpgradePlanPage() {
  const t = useClientTranslations('upgradePlan');
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [pricing, setPricing] = useState<any>(null);
  const [roomCount, setRoomCount] = useState(2);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  const loadCurrentPlan = async () => {
    try {
      const response = await fetch('/api/tenant');
      const data = await response.json();
      
      if (data.success && data.tenant) {
        setCurrentPlan(data.tenant.plan_type || 'free');
      }
    } catch (error) {
      console.error('Error cargando plan actual:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId: PlanId) => {
    if (planId === currentPlan) {
      return; // No se puede seleccionar el plan actual
    }
    setSelectedPlan(planId);
    setShowCheckout(true);
    setRoomCount(planId === 'checkin' ? 2 : planId === 'pro' ? 6 : 2);
  };

  const handlePriceChange = (newPricing: any) => {
    setPricing(newPricing);
  };

  const handleSuccess = () => {
    alert('¡Plan actualizado exitosamente!');
    router.push('/');
    router.refresh();
  };

  // Filtrar planes según el plan actual
  // Si tiene CHECKIN, solo mostrar PRO
  // Si tiene FREE, mostrar CHECKIN y PRO
  const availablePlans = currentPlan === 'checkin' 
    ? PLANS.filter(p => p.id === 'pro')
    : PLANS;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      </AdminLayout>
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
                href="/"
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mejorar Plan</h1>
                <p className="text-sm text-gray-600">
                  Plan actual: <span className="font-semibold">
                    {currentPlan === 'free' ? 'Plan Gratis' : 
                     currentPlan === 'checkin' ? 'Plan Check-in' : 
                     currentPlan === 'pro' ? 'Plan Pro' : 'Desconocido'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {showCheckout && selectedPlan ? (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <button
                  onClick={() => {
                    setShowCheckout(false);
                    setSelectedPlan(null);
                  }}
                  className="text-gray-600 hover:text-gray-900 mb-6 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Volver a planes
                </button>

                <h2 className="text-2xl font-bold mb-4">
                  Suscribirse a {PLANS.find(p => p.id === selectedPlan)?.name}
                </h2>

                <PlanCalculator 
                  planId={selectedPlan} 
                  onPriceChange={handlePriceChange}
                />

                {pricing && (
                  <div className="mt-6">
                    <Elements stripe={stripePromise}>
                      <CheckoutForm
                        planId={selectedPlan}
                        roomCount={roomCount}
                        pricing={pricing}
                        onSuccess={handleSuccess}
                        onError={(error) => console.error(error)}
                      />
                    </Elements>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Mejora tu Plan
              </h2>
              <p className="text-xl text-gray-600">
                Elige el plan que mejor se adapte a tus necesidades
              </p>
            </div>
          )}

          {!showCheckout && (
            <div className={`grid gap-8 ${availablePlans.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' : 'md:grid-cols-2'}`}>
              {availablePlans.map((plan) => {
                const Icon = plan.icon;
                const isCurrent = plan.id === currentPlan;

                return (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-lg shadow-lg p-8 relative ${
                      plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
                    } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
                  >
                    {plan.popular && (
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                          Más Popular
                        </span>
                      </div>
                    )}

                    {isCurrent && (
                      <div className="absolute top-4 right-4">
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                          Plan Actual
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-${plan.color}-100 mb-4`}>
                        <Icon className={`text-${plan.color}-600`} size={32} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {plan.name}
                      </h3>
                      <p className="text-gray-600 mb-4">{plan.description}</p>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-gray-900">
                          {plan.basePrice}€
                        </span>
                        <span className="text-gray-600">/mes</span>
                        <p className="text-xs text-gray-500 mt-1">
                          + IVA (21%)
                        </p>
                      </div>
                      {plan.extraRoomPrice && (
                        <p className="text-sm text-gray-500">
                          +{plan.extraRoomPrice}€/mes por habitación adicional
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      disabled={isCurrent}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                        isCurrent
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : plan.popular
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : `bg-${plan.color}-600 text-white hover:bg-${plan.color}-700`
                      }`}
                    >
                      {isCurrent
                        ? 'Plan Actual'
                        : 'Seleccionar Plan'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
