'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, Loader2, CreditCard, CheckCircle } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import DynamicPriceCalculator from '@/components/DynamicPriceCalculator';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function CheckoutLoadingFallback() {
  const t = useTranslations('checkoutRooms');
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="loading mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('loading')}</p>
      </div>
    </div>
  );
}

function CheckoutRoomsForm({ 
  roomCount, 
  isYearly, 
  totalPrice, 
  onSuccess, 
  onError 
}: { 
  roomCount: number; 
  isYearly: boolean; 
  totalPrice: number;
  onSuccess: () => void;
  onError: (error: string) => void;
}) {
  const t = useTranslations('checkoutRooms');
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !name || !email) {
      onError(t('errorCompleteFields'));
      return;
    }

    if (!termsAccepted) {
      onError(t('errorAcceptTerms'));
      return;
    }

    setProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error(t('errorCardNotFound'));
      }

      // Crear payment method
      const { error: methodError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (methodError) {
        throw new Error(methodError.message);
      }

      // Llamar a la API para crear la suscripción
      const response = await fetch('/api/create-room-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCount,
          isYearly,
          email,
          name,
          paymentMethodId: paymentMethod.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('errorProcessingPayment'));
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
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('fullNameLabel')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t('fullNamePlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('emailLabel')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t('emailPlaceholder')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('cardInfoLabel')}
          </label>
          <div className="p-4 border border-gray-300 rounded-lg bg-white">
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
        </div>
      </div>

      <div>
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="terms"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
            ☐ {t('termsLabel')}
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || processing || !termsAccepted || totalPrice <= 0}
        className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            {t('processing')}
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            {t('payButton', { amount: totalPrice.toFixed(2), period: isYearly ? t('periodAnnual') : t('periodMonthly') })}
          </>
        )}
      </button>
    </form>
  );
}

function CheckoutRoomsContent() {
  const t = useTranslations('checkoutRooms');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCount, setRoomCount] = useState(1);
  const [isYearly, setIsYearly] = useState(false);
  const [subtotalExVat, setSubtotalExVat] = useState(0);
  const [totalWithVat, setTotalWithVat] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const roomsParam = searchParams.get('rooms');
    const yearlyParam = searchParams.get('yearly');
    
    if (roomsParam) setRoomCount(parseInt(roomsParam));
    if (yearlyParam === 'true') setIsYearly(true);
  }, [searchParams]);

  const handleQuoteChange = useCallback(
    (quote: {
      roomCount: number;
      isYearly: boolean;
      subtotalExVat: number;
      totalWithVat: number;
    }) => {
      setRoomCount(quote.roomCount);
      setIsYearly(quote.isYearly);
      setSubtotalExVat(quote.subtotalExVat);
      setTotalWithVat(quote.totalWithVat);
    },
    []
  );

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      router.push(`/${locale}/settings/billing`);
    }, 2000);
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
    setTimeout(() => setError(''), 5000);
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/settings/billing"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToBilling')}
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-600 mt-2">{t('subtitle')}</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <p className="text-green-800">
                {t('successMessage')}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Calculadora */}
            <div>
              <DynamicPriceCalculator
                currentRoomCount={roomCount}
                defaultPlanId="standard"
                showGoToUpgrade={false}
                onQuoteChange={handleQuoteChange}
              />
            </div>

            {/* Checkout */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {t('finalizePayment')}
              </h2>

              {/* Resumen */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('rooms')}</span>
                  <span className="font-semibold">{roomCount} {roomCount === 1 ? t('room') : t('roomsCount')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('frequency')}</span>
                  <span className="font-semibold">{isYearly ? t('annual') : t('monthly')}</span>
                </div>
                <div className="pt-2 border-t border-gray-300 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('baseAmount')}</span>
                    <span className="font-semibold text-gray-900">{subtotalExVat.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('vat21')}</span>
                    <span className="font-semibold text-gray-900">
                      {Math.max(0, totalWithVat - subtotalExVat).toFixed(2)}€
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-300 flex justify-between">
                    <span className="font-semibold text-gray-900">{t('total')}</span>
                    <span className="text-2xl font-bold text-blue-600">{totalWithVat.toFixed(2)}€</span>
                  </div>
                </div>
              </div>

              {/* Formulario de pago */}
              <Elements stripe={stripePromise}>
                <CheckoutRoomsForm
                  roomCount={roomCount}
                  isYearly={isYearly}
                  totalPrice={totalWithVat}
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
              </Elements>

              <p className="text-xs text-gray-500 text-center mt-4">
                🔒 {t('securePayment')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function CheckoutRoomsPage() {
  return (
    <Suspense fallback={<CheckoutLoadingFallback />}>
      <CheckoutRoomsContent />
    </Suspense>
  );
}
