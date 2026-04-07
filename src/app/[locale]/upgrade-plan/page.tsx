'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Check, Crown, Zap, Loader2, Calculator, Star } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

type PlanId = 'checkin' | 'standard' | 'pro';

interface Plan {
  id: PlanId;
  name: string;
  description: string;
  basePrice: number;
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

const UPGRADE_PLANS_CONFIG: (Omit<Plan, 'name' | 'description' | 'features'> & { featuresKeys: string[] })[] = [
  {
    id: 'checkin',
    basePrice: 2,
    maxRooms: -1,
    maxRoomsIncluded: 1,
    extraRoomPrice: 2,
    color: 'green',
    icon: Zap,
    popular: true,
    adsEnabled: true,
    legalModule: true,
    featuresKeys: ['checkinF0', 'checkinF1', 'checkinF2', 'checkinF3', 'checkinF4', 'checkinF5', 'checkinF6']
  },
  {
    id: 'standard',
    basePrice: 9.99,
    maxRooms: -1,
    maxRoomsIncluded: 1,
    extraRoomPrice: 2,
    color: 'amber',
    icon: Star,
    adsEnabled: false,
    legalModule: true,
    featuresKeys: ['standardF0', 'standardF1', 'standardF2', 'standardF3', 'standardF4', 'standardF5']
  },
  {
    id: 'pro',
    basePrice: 29.99,
    maxRooms: -1,
    maxRoomsIncluded: 1,
    extraRoomPrice: 2,
    color: 'purple',
    icon: Crown,
    adsEnabled: false,
    legalModule: true,
    featuresKeys: ['proF0', 'proF1', 'proF2', 'proF3', 'proF4', 'proF5', 'proF6', 'proF7']
  }
];

function getPlanName(t: (k: string) => string, planId: string | null): string {
  if (!planId || planId === 'free') return t('freePlanName');
  if (planId === 'checkin') return t('checkinPlanName');
  if (planId === 'standard') return t('standardPlanName');
  if (planId === 'pro') return t('proPlanName');
  return '';
}

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
  const t = useTranslations('plans');
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
        throw new Error(t('errorCardNotFound'));
      }

      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (pmError || !paymentMethod) {
        throw new Error(pmError?.message || t('errorPaymentMethod'));
      }

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
        throw new Error(data.error || t('errorSubscription'));
      }

      onSuccess();
    } catch (err: any) {
      const errorMessage = err.message || t('errorProcessingPayment');
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
            <span>{t('basePrice')}</span>
            <span>{pricing.base_price.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between">
            <span>{t('vat', { rate: pricing.vat_rate })}</span>
            <span>{pricing.vat_amount.toFixed(2)}€</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>{t('totalPerMonth')}</span>
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
            {t('processing')}
          </>
        ) : (
          <>
            {t('subscribePerMonth', { total: pricing.total.toFixed(2) })}
          </>
        )}
      </button>
    </form>
  );
}

function PlanCalculator({ planId, onPriceChange }: { planId: PlanId; onPriceChange: (pricing: any) => void }) {
  const t = useTranslations('plans');
  const [roomCount, setRoomCount] = useState(2);
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const plan = UPGRADE_PLANS_CONFIG.find(p => p.id === planId);
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
        <h3 className="font-semibold text-lg">{t('priceCalculator')}</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('numberOfRooms')}
          </label>
          <input
            type="number"
            min={plan.maxRoomsIncluded}
            value={roomCount}
            onChange={(e) => setRoomCount(parseInt(e.target.value) || plan.maxRoomsIncluded)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('roomsIncludedHint', { count: plan.maxRoomsIncluded })}
            {plan.extraRoomPrice != null && t('extraPerRoom', { price: plan.extraRoomPrice })}
          </p>
        </div>

        {pricing && (
          <div className="bg-white p-4 rounded-lg border">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('basePrice')}</span>
                <span>{pricing.base_price.toFixed(2)}€</span>
              </div>
              {pricing.extra_rooms_price > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{t('extraRooms', { count: pricing.extra_rooms || 0 })}</span>
                  <span>+{pricing.extra_rooms_price.toFixed(2)}€</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span>{t('subtotal')}</span>
                <span>{pricing.subtotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('vat', { rate: pricing.vat.vat_rate })}</span>
                <span>+{pricing.vat.vat_amount.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>{t('totalMonthly')}</span>
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
  const tPlans = useTranslations('plans');
  const tUpgrade = useTranslations('upgradePlan');
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
    setRoomCount(planId === 'checkin' ? 2 : planId === 'standard' ? 4 : planId === 'pro' ? 6 : 2);
  };

  const handlePriceChange = (newPricing: any) => {
    setPricing(newPricing);
  };

  const handleSuccess = () => {
    alert(tUpgrade('successUpgrade'));
    router.push('/');
    router.refresh();
  };

  const availablePlans = currentPlan === 'checkin' 
    ? UPGRADE_PLANS_CONFIG.filter(p => p.id === 'pro')
    : UPGRADE_PLANS_CONFIG;

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
                <h1 className="text-2xl font-bold text-gray-900">{tUpgrade('title')}</h1>
                <p className="text-sm text-gray-600">
                  {tUpgrade('currentPlan')}: <span className="font-semibold">
                    {currentPlan ? getPlanName(tPlans, currentPlan) || tUpgrade('unknownPlan') : tUpgrade('unknownPlan')}
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
                  {tUpgrade('backToPlans')}
                </button>

                <h2 className="text-2xl font-bold mb-4">
                  {tPlans('subscribeTo')} {selectedPlan ? getPlanName(tPlans, selectedPlan) : ''}
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
                {tUpgrade('title')}
              </h2>
              <p className="text-xl text-gray-600">
                {tUpgrade('subtitleChoose')}
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
                          {tPlans('mostPopular')}
                        </span>
                      </div>
                    )}

                    {isCurrent && (
                      <div className="absolute top-4 right-4">
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                          {tPlans('currentPlanBadge')}
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-${plan.color}-100 mb-4`}>
                        <Icon className={`text-${plan.color}-600`} size={32} />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {getPlanName(tPlans, plan.id)}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {plan.id === 'checkin' ? tPlans('checkinPlanDesc') : tPlans('proPlanDesc')}
                      </p>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-gray-900">
                          {plan.basePrice}€
                        </span>
                        <span className="text-gray-600">{tPlans('perMonth')}</span>
                        <p className="text-xs text-gray-500 mt-1">
                          {tUpgrade('vatLabel')}
                        </p>
                      </div>
                      {plan.extraRoomPrice != null && (
                        <p className="text-sm text-gray-500">
                          {tPlans('extraRoomPerMonth', { price: plan.extraRoomPrice })}
                        </p>
                      )}
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.featuresKeys.map((key, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
                          <span className="text-gray-700">{tPlans(key)}</span>
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
                        ? tPlans('currentPlanBadge')
                        : tPlans('selectPlan')}
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
