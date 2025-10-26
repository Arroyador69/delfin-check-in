'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Check, CheckCircle, Crown, Zap, Shield, TrendingUp, Loader2, CreditCard } from 'lucide-react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import DynamicPriceCalculator from '@/components/DynamicPriceCalculator';

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

function CheckoutForm({ planId, propertiesCount, onSuccess, onError }: { planId: PlanId; propertiesCount: number; onSuccess: () => void; onError: (error: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!termsAccepted) {
      onError('Debes aceptar los términos y condiciones para continuar');
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
          propertiesCount,
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

      {/* Términos y Condiciones */}
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            id="terms-acceptance"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="terms-acceptance" className="text-sm text-gray-700 cursor-pointer">
            ☐ Declaro haber leído y aceptado los Términos y Condiciones, la Política de Privacidad y los Supuestos de Uso del servicio Delfín Check-in, y consiento el tratamiento de mis datos conforme a lo dispuesto en la normativa vigente de protección de datos.
          </label>
        </div>

        {/* Botón para mostrar/ocultar términos detallados */}
        <button
          type="button"
          onClick={() => setShowTerms(!showTerms)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {showTerms ? 'Ocultar términos detallados' : 'Ver términos detallados'}
        </button>

        {/* Términos detallados desplegables */}
        {showTerms && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4 text-sm text-gray-700">
            <p className="font-semibold">Al aceptar, confirmo que:</p>
            
            <div className="space-y-3">
              <p>• Comprendo que Delfín Check-in es una herramienta de gestión que facilita la creación, almacenamiento y exportación de ficheros de registro de viajeros conforme al Real Decreto 933/2021, pero que no realiza el envío automático al MIR ni sustituye las obligaciones legales del titular del alojamiento.</p>
              
              <p>• Soy responsable de la veracidad, exactitud y conservación de los datos introducidos en los formularios de registro.</p>
              
              <p>• Entiendo que la IA y las funciones disponibles (por ejemplo, chatbot en Telegram o WhatsApp) actúan como asistencia complementaria y no como servicio oficial de verificación, firma o presentación telemática ante las autoridades.</p>
              
              <p>• Acepto que los datos procesados se almacenarán de forma segura durante el tiempo necesario para cumplir con las finalidades del servicio y la normativa aplicable.</p>
              
              <p>• Reconozco que el servicio requiere una suscripción activa (mensual o anual), cuyo pago otorga acceso al software y sus funcionalidades, sin implicar custodia ni certificación oficial de registros.</p>
              
              <p>• Comprendo que pueden producirse interrupciones temporales por mantenimiento, actualizaciones o causas técnicas ajenas a la plataforma, y que estas no darán lugar a compensaciones salvo en casos de incidencia prolongada.</p>
              
              <p>• Acepto que los precios, condiciones y funcionalidades del servicio podrán actualizarse, comunicándose siempre por medios electrónicos con antelación razonable.</p>
              
              <p>• He revisado las políticas aplicables en <a href="https://delfincheckin.com/terminos-servicio.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Términos de Servicio</a> y <a href="https://delfincheckin.com/politica-privacidad.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">Política de Privacidad</a> y las acepto expresamente antes de realizar el pago.</p>
            </div>

            <p className="font-semibold mt-4">Al continuar, confirmo mi conformidad y doy consentimiento informado para la prestación del servicio.</p>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={!stripe || processing || !termsAccepted}
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
  const [properties, setProperties] = useState<Array<{id: number, name: string}>>([]);
  const [selectedProperties, setSelectedProperties] = useState<number>(1);
  const [newPropertyName, setNewPropertyName] = useState('');
  const [currentMaxRooms, setCurrentMaxRooms] = useState<number>(1);

  useEffect(() => {
    loadCurrentPlan();
    loadProperties();
    
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
        setCurrentMaxRooms(data.tenant.max_rooms || 1);
      }
    } catch (error) {
      console.error('Error cargando plan actual:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProperties = async () => {
    try {
      // Cargar propiedades desde localStorage o API
      const savedProperties = localStorage.getItem('rooms_config');
      if (savedProperties) {
        const parsedProperties = JSON.parse(savedProperties);
        setProperties(parsedProperties);
        setSelectedProperties(parsedProperties.length);
      } else {
        // Propiedades por defecto
        const defaultProperties = [
          { id: 1, name: 'Habitación 1' },
          { id: 2, name: 'Habitación 2' },
          { id: 3, name: 'Habitación 3' },
          { id: 4, name: 'Habitación 4' },
          { id: 5, name: 'Habitación 5' },
          { id: 6, name: 'Habitación 6' }
        ];
        setProperties(defaultProperties);
        setSelectedProperties(1);
      }
    } catch (error) {
      console.error('Error cargando propiedades:', error);
    }
  };

  const handleSelectPlan = (planId: PlanId) => {
    if (planId === currentPlanId) {
      return;
    }
    setSelectedPlanId(planId);
    
    // Si es un upgrade, permitir más propiedades
    const selectedPlan = PLANS.find(p => p.id === planId);
    if (selectedPlan && selectedPlan.maxRooms > currentMaxRooms) {
      setSelectedProperties(Math.min(properties.length + 1, selectedPlan.maxRooms));
    } else {
      setSelectedProperties(Math.min(selectedProperties, selectedPlan?.maxRooms || 1));
    }
    
    setShowCheckout(true);
  };

  const addProperty = () => {
    if (newPropertyName.trim() && properties.length < currentMaxRooms) {
      const newId = Math.max(...properties.map(p => p.id), 0) + 1;
      const newProperty = { id: newId, name: newPropertyName.trim() };
      const updatedProperties = [...properties, newProperty];
      setProperties(updatedProperties);
      setSelectedProperties(updatedProperties.length);
      setNewPropertyName('');
      localStorage.setItem('rooms_config', JSON.stringify(updatedProperties));
    }
  };

  const removeProperty = (propertyId: number) => {
    const updatedProperties = properties.filter(p => p.id !== propertyId);
    setProperties(updatedProperties);
    setSelectedProperties(Math.min(selectedProperties, updatedProperties.length));
    localStorage.setItem('rooms_config', JSON.stringify(updatedProperties));
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
          ) : null}

          {showCheckout ? (
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {isUpgrade ? 'Upgrade a' : 'Cambiar a'} {selectedPlan?.name}
                </h2>

                {/* Selección de Propiedades */}
                <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="text-2xl mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🏠</span>
                    Seleccionar Propiedades
                  </h3>
                  
                  {/* Propiedades existentes */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Propiedades disponibles:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                      {properties.map((property) => (
                        <div key={property.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                          <div className="flex items-center">
                            <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm mr-3">
                              {property.id}
                            </span>
                            <span className="text-gray-900 font-medium">{property.name}</span>
                          </div>
                          <button
                            onClick={() => removeProperty(property.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Eliminar
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Añadir nueva propiedad */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Añadir nueva propiedad:</h4>
                    <div className="flex space-x-3">
                      <input
                        type="text"
                        value={newPropertyName}
                        onChange={(e) => setNewPropertyName(e.target.value)}
                        placeholder="Nombre de la propiedad"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        onKeyPress={(e) => e.key === 'Enter' && addProperty()}
                        disabled={properties.length >= currentMaxRooms}
                      />
                      <button
                        onClick={addProperty}
                        disabled={properties.length >= currentMaxRooms || !newPropertyName.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Añadir
                      </button>
                    </div>
                    {properties.length >= currentMaxRooms && (
                      <p className="text-xs text-orange-600 mt-2">
                        ⚠️ Has alcanzado el límite de {currentMaxRooms} {currentMaxRooms === 1 ? 'propiedad' : 'propiedades'} de tu plan actual. 
                        Necesitas hacer upgrade para añadir más propiedades.
                      </p>
                    )}
                  </div>

                  {/* Selector de número de propiedades */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Número de propiedades a contratar:</h4>
                    <select
                      value={selectedProperties}
                      onChange={(e) => setSelectedProperties(parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                      {selectedPlan && Array.from({ length: selectedPlan.maxRooms }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} {num === 1 ? 'propiedad' : 'propiedades'}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      Tu plan actual permite hasta {currentMaxRooms} {currentMaxRooms === 1 ? 'propiedad' : 'propiedades'}. 
                      {selectedPlan && ` El plan ${selectedPlan.name} permite hasta ${selectedPlan.maxRooms} ${selectedPlan.maxRooms === 1 ? 'propiedad' : 'propiedades'}.`}
                    </p>
                  </div>
                </div>

                <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Plan actual:</span>
                    <span className="font-semibold">{currentPlan?.name} - €{currentPlan?.price}/mes</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Nuevo plan:</span>
                    <span className="font-semibold text-green-600">{selectedPlan?.name}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Propiedades:</span>
                    <span className="font-semibold">{selectedProperties} {selectedProperties === 1 ? 'propiedad' : 'propiedades'}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">
                        {isUpgrade ? 'Costo adicional:' : 'Nuevo costo:'}
                      </span>
                      <span className="text-xl font-bold text-gray-900">
                        €{selectedProperties * (selectedPlan?.price || 0)}/mes
                      </span>
                    </div>
                  </div>
                </div>

                <Elements stripe={stripePromise}>
                  <CheckoutForm
                    planId={selectedPlanId!}
                    propertiesCount={selectedProperties}
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
          ) : null}

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
