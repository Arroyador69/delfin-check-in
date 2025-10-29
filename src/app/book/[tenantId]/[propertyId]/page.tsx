'use client';

import { useState, useEffect, use } from 'react';
import { Calendar, Users, Euro, CreditCard, CheckCircle } from 'lucide-react';
import { TenantProperty } from '@/lib/direct-reservations-types';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface BookingPageProps {
  params: Promise<{
    tenantId: string;
    propertyId: string;
  }>;
}

function PaymentForm({ 
  tenantId, 
  propertyId, 
  formData, 
  pricing, 
  property, 
  onBack, 
  onSuccess 
}: {
  tenantId: string;
  propertyId: string;
  formData: any;
  pricing: any;
  property: TenantProperty;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Tarjeta no encontrada');
      }

      // Crear Payment Intent
      const response = await fetch('/api/direct-reservations/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: parseInt(propertyId),
          ...formData
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error creando el pago');
      }

      // Confirmar el pago con Stripe
      const { error: confirmError } = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: formData.guest_name,
            email: formData.guest_email,
          },
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Error procesando el pago');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Confirmar y pagar</h2>
      
      {pricing && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Resumen de la reserva</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Propiedad:</span>
              <span>{property.property_name}</span>
            </div>
            <div className="flex justify-between">
              <span>Fechas:</span>
              <span>{formData.check_in_date} - {formData.check_out_date}</span>
            </div>
            <div className="flex justify-between">
              <span>Huéspedes:</span>
              <span>{formData.guests}</span>
            </div>
            <div className="flex justify-between">
              <span>Noches:</span>
              <span>{pricing.nights}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total:</span>
              <span>{pricing.total_amount}€</span>
            </div>
          </div>
        </div>
      )}

      <div className="border border-gray-300 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Datos de la tarjeta *
        </label>
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
        >
          Atrás
        </button>
        <button
          type="submit"
          disabled={processing || !stripe}
          className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Procesando...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Pagar {pricing?.total_amount}€
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default function PublicBookingPage({ params }: BookingPageProps) {
  const resolvedParams = use(params);
  const { tenantId, propertyId } = resolvedParams;
  const [property, setProperty] = useState<TenantProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1: Fechas, 2: Huéspedes, 3: Datos, 4: Pago
  const [formData, setFormData] = useState({
    check_in_date: '',
    check_out_date: '',
    guests: 1,
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guest_document_type: 'NIF',
    guest_document_number: '',
    guest_nationality: 'España',
    special_requests: ''
  });
  const [pricing, setPricing] = useState<any>(null);

  useEffect(() => {
    if (propertyId && tenantId) {
      loadProperty();
    }
  }, [propertyId, tenantId]);

  const loadProperty = async () => {
    try {
      // Cargar propiedad desde API pública
      const response = await fetch(`/api/public/properties/${propertyId}?tenant_id=${tenantId}`);
      const data = await response.json();
      
      if (data.success) {
        setProperty(data.property);
      } else {
        console.error('Error cargando propiedad:', data.error);
      }
    } catch (error) {
      console.error('Error cargando propiedad:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePricing = async () => {
    if (!formData.check_in_date || !formData.check_out_date) return;

    try {
      const response = await fetch('/api/public/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: parseInt(propertyId),
          check_in_date: formData.check_in_date,
          check_out_date: formData.check_out_date,
          guests: formData.guests
        })
      });

      const data = await response.json();
      if (data.success) {
        setPricing(data.pricing);
      }
    } catch (error) {
      console.error('Error calculando precios:', error);
    }
  };

  useEffect(() => {
    if (formData.check_in_date && formData.check_out_date) {
      calculatePricing();
    }
  }, [formData.check_in_date, formData.check_out_date, formData.guests]);

  const handlePaymentSuccess = () => {
    setStep(5);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Propiedad no encontrada</h1>
          <p className="text-gray-600">La propiedad que buscas no está disponible.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.property_name}</h1>
          {property.description && (
            <p className="text-gray-600 mb-4">{property.description}</p>
          )}
          
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {property.max_guests} huéspedes máx.
            </div>
            <div className="flex items-center gap-1">
              <Euro className="w-4 h-4" />
              {property.base_price}/noche
            </div>
          </div>
        </div>

        {/* Formulario de reserva */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <span className="font-medium">Fechas</span>
            
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ml-4 ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
            <span className="font-medium">Huéspedes</span>
            
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ml-4 ${
              step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              3
            </div>
            <span className="font-medium">Datos</span>
            
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ml-4 ${
              step >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              4
            </div>
            <span className="font-medium">Pago</span>
          </div>

          {/* Paso 1: Fechas */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Selecciona tus fechas</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de entrada
                  </label>
                  <input
                    type="date"
                    value={formData.check_in_date}
                    onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de salida
                  </label>
                  <input
                    type="date"
                    value={formData.check_out_date}
                    onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                    min={formData.check_in_date || new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              {pricing && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Resumen de precios</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>{pricing.nights} noches × {property.base_price}€</span>
                      <span>{(pricing.nights * property.base_price).toFixed(2)}€</span>
                    </div>
                    {property.cleaning_fee > 0 && (
                      <div className="flex justify-between">
                        <span>Tarifa de limpieza</span>
                        <span>{property.cleaning_fee}€</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total</span>
                      <span>{pricing.total_amount}€</span>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={() => setStep(2)}
                disabled={!formData.check_in_date || !formData.check_out_date}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                Continuar
              </button>
            </div>
          )}

          {/* Paso 2: Huéspedes */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Número de huéspedes</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Huéspedes
                </label>
                <select
                  value={formData.guests}
                  onChange={(e) => setFormData({ ...formData, guests: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: property.max_guests }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} huésped{i + 1 > 1 ? 'es' : ''}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
                >
                  Atrás
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Paso 3: Datos del huésped */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Datos del huésped</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.guest_name}
                    onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.guest_email}
                    onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.guest_phone}
                    onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nacionalidad
                  </label>
                  <input
                    type="text"
                    value={formData.guest_nationality}
                    onChange={(e) => setFormData({ ...formData, guest_nationality: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solicitudes especiales
                </label>
                <textarea
                  value={formData.special_requests}
                  onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Alguna solicitud especial..."
                />
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
                >
                  Atrás
                </button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!formData.guest_name || !formData.guest_email}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Continuar al pago
                </button>
              </div>
            </div>
          )}

          {/* Paso 4: Pago */}
          {step === 4 && (
            <Elements stripe={stripePromise}>
              <PaymentForm
                tenantId={tenantId}
                propertyId={propertyId}
                formData={formData}
                pricing={pricing}
                property={property}
                onBack={() => setStep(3)}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          )}

          {/* Paso 5: Confirmación */}
          {step === 5 && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
              <h2 className="text-2xl font-semibold text-gray-900">¡Reserva confirmada!</h2>
              <p className="text-gray-600">
                Tu reserva ha sido procesada correctamente. Recibirás un email de confirmación.
              </p>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Código de reserva:</strong> {pricing?.reservation_code}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
