'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, CreditCard, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import DynamicPriceCalculator from '@/components/DynamicPriceCalculator';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

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
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !name || !email) {
      onError('Por favor completa todos los campos');
      return;
    }

    if (!termsAccepted) {
      onError('Debes aceptar los términos y condiciones');
      return;
    }

    setProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Tarjeta no encontrada');
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
        throw new Error(data.error || 'Error procesando el pago');
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
            Nombre completo *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Juan Pérez"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="juan@ejemplo.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Información de tarjeta *
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
            ☐ Acepto los Términos y Condiciones y la Política de Privacidad
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || processing || !termsAccepted}
        className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Pagar {totalPrice.toFixed(2)}€ {isYearly ? 'anual' : 'mensual'}
          </>
        )}
      </button>
    </form>
  );
}

function CheckoutRoomsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [roomCount, setRoomCount] = useState(1);
  const [isYearly, setIsYearly] = useState(false);
  const [totalPrice, setTotalPrice] = useState(14.99);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const roomsParam = searchParams.get('rooms');
    const yearlyParam = searchParams.get('yearly');
    
    if (roomsParam) setRoomCount(parseInt(roomsParam));
    if (yearlyParam === 'true') setIsYearly(true);
  }, [searchParams]);

  useEffect(() => {
    // Recalcular precio cuando cambian los parámetros
    const getRoomPrice = (count: number): number => {
      if (count === 1) return 14.99;
      if (count === 2) return 13.49;
      if (count >= 3 && count <= 4) return 12.74;
      if (count >= 5 && count <= 9) return 11.99;
      if (count >= 10) return 11.24;
      return 14.99;
    };

    const pricePerRoom = getRoomPrice(roomCount);
    let total = pricePerRoom * roomCount;

    if (isYearly) {
      const yearlyTotal = total * 12;
      const discount = yearlyTotal * 0.167;
      total = yearlyTotal - discount;
    }

    setTotalPrice(total);
  }, [roomCount, isYearly]);

  const handlePlanChange = (plan: string, rooms: number, price: number) => {
    setIsYearly(plan === 'yearly');
    setRoomCount(rooms);
    setTotalPrice(price);
  };

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      router.push('/settings/billing');
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
              Volver a facturación
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Contratar servicio</h1>
            <p className="text-gray-600 mt-2">Selecciona el número de habitaciones y completa el pago</p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <p className="text-green-800">
                ¡Pago exitoso! Redirigiendo a facturación...
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
                currentProperties={roomCount}
                isYearly={isYearly}
                onPlanChange={handlePlanChange}
                showUpgradeButton={false}
              />
            </div>

            {/* Checkout */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Finalizar pago
              </h2>

              {/* Resumen */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Habitaciones:</span>
                  <span className="font-semibold">{roomCount} {roomCount === 1 ? 'habitación' : 'habitaciones'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frecuencia:</span>
                  <span className="font-semibold">{isYearly ? 'Anual' : 'Mensual'}</span>
                </div>
                <div className="pt-2 border-t border-gray-300 flex justify-between">
                  <span className="font-semibold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-blue-600">{totalPrice.toFixed(2)}€</span>
                </div>
                <div className="text-xs text-gray-500 text-center mt-2">
                  <strong>IVA no incluido</strong>
                </div>
              </div>

              {/* Formulario de pago */}
              <Elements stripe={stripePromise}>
                <CheckoutRoomsForm
                  roomCount={roomCount}
                  isYearly={isYearly}
                  totalPrice={totalPrice}
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
              </Elements>

              <p className="text-xs text-gray-500 text-center mt-4">
                🔒 Pago 100% seguro procesado por Stripe
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
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <CheckoutRoomsContent />
    </Suspense>
  );
}
