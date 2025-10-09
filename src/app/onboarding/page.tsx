'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowRight, Building, Users, Settings, Mail } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Datos del formulario
  const [formData, setFormData] = useState({
    propertyName: '',
    timezone: 'Europe/Madrid',
    language: 'es',
    currency: 'EUR',
    contactEmail: '',
    contactPhone: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'España'
  });

  // Obtener token del URL
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (!token || !email) {
      setError('Enlace de onboarding inválido. Contacta con soporte.');
      return;
    }
    
    // Verificar que el token es válido
    verifyToken();
  }, [token, email]);

  const verifyToken = async () => {
    try {
      const response = await fetch(`/api/onboarding/verify?token=${token}&email=${email}`);
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Token inválido o expirado');
        return;
      }
      
      // Pre-llenar datos si están disponibles
      if (data.tenant) {
        setFormData(prev => ({
          ...prev,
          propertyName: data.tenant.config?.propertyName || '',
          contactEmail: data.tenant.email || email || '',
          timezone: data.tenant.config?.timezone || 'Europe/Madrid',
          language: data.tenant.config?.language || 'es',
          currency: data.tenant.config?.currency || 'EUR'
        }));
      }
      
    } catch (error) {
      console.error('Error verificando token:', error);
      setError('Error verificando el enlace. Intenta de nuevo.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          ...formData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error completando el onboarding');
      }

      setSuccess(true);
      setStep(4);
      
      // Redirigir al dashboard después de 3 segundos
      setTimeout(() => {
        router.push('/');
      }, 3000);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: '¡Bienvenido a Delfín Check-in!',
      subtitle: 'Vamos a configurar tu cuenta paso a paso',
      icon: <Building className="w-8 h-8" />
    },
    {
      title: 'Información de tu propiedad',
      subtitle: 'Cuéntanos sobre tu negocio',
      icon: <Users className="w-8 h-8" />
    },
    {
      title: 'Configuración inicial',
      subtitle: 'Personaliza tu experiencia',
      icon: <Settings className="w-8 h-8" />
    },
    {
      title: '¡Todo listo!',
      subtitle: 'Tu cuenta está configurada correctamente',
      icon: <CheckCircle className="w-8 h-8" />
    }
  ];

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error en el onboarding</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.href = '/admin-login'}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Ir al login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-3xl mr-3">🐬</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Delfín Check-in</h1>
                <p className="text-sm text-gray-600">Configuración inicial</p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Paso {step} de 4
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          
          {/* Step Header */}
          <div className="text-center mb-8">
            <div className="text-blue-600 mb-4">
              {steps[step - 1].icon}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {steps[step - 1].title}
            </h2>
            <p className="text-gray-600">
              {steps[step - 1].subtitle}
            </p>
          </div>

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center">
              <div className="mb-8">
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-lg text-gray-600 mb-6">
                  ¡Gracias por elegir Delfín Check-in! Tu pago ha sido procesado correctamente.
                </p>
                <p className="text-gray-600 mb-8">
                  Ahora vamos a configurar tu cuenta para que puedas empezar a gestionar tus habitaciones
                  de manera eficiente.
                </p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 bg-blue-50 rounded-lg">
                  <div className="text-3xl mb-3">🏠</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Gestiona habitaciones</h3>
                  <p className="text-sm text-gray-600">Añade y configura tus habitaciones</p>
                </div>
                <div className="p-6 bg-green-50 rounded-lg">
                  <div className="text-3xl mb-3">📅</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Controla reservas</h3>
                  <p className="text-sm text-gray-600">Organiza todas tus reservas en un lugar</p>
                </div>
                <div className="p-6 bg-purple-50 rounded-lg">
                  <div className="text-3xl mb-3">📊</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Analiza datos</h3>
                  <p className="text-sm text-gray-600">Obtén insights sobre tu negocio</p>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
              >
                Empezar configuración
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </div>
          )}

          {/* Step 2: Property Information */}
          {step === 2 && (
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de tu propiedad *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.propertyName}
                    onChange={(e) => setFormData(prev => ({ ...prev, propertyName: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej: Hotel Delfín, Apartamentos Playa..."
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email de contacto *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.contactEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Teléfono de contacto
                    </label>
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código postal
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      País
                    </label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  Siguiente
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Configuration */}
          {step === 3 && (
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zona horaria
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Europe/Madrid">Madrid (GMT+1)</option>
                      <option value="Europe/Barcelona">Barcelona (GMT+1)</option>
                      <option value="Europe/London">Londres (GMT+0)</option>
                      <option value="America/New_York">Nueva York (GMT-5)</option>
                      <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Idioma
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="es">Español</option>
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Moneda
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="EUR">Euro (€)</option>
                    <option value="USD">Dólar ($)</option>
                    <option value="GBP">Libra (£)</option>
                  </select>
                </div>

                <div className="bg-blue-50 p-6 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-3">📧 Configuración de notificaciones</h3>
                  <p className="text-blue-800 text-sm mb-4">
                    Te enviaremos notificaciones sobre reservas, pagos y actualizaciones importantes a:
                  </p>
                  <div className="flex items-center text-blue-700">
                    <Mail className="w-5 h-5 mr-2" />
                    <span className="font-medium">{email}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Anterior
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
                >
                  {loading ? 'Completando...' : 'Finalizar configuración'}
                  {!loading && <CheckCircle className="w-5 h-5 ml-2" />}
                </button>
              </div>
            </form>
          )}

          {/* Step 4: Success */}
          {step === 4 && success && (
            <div className="text-center">
              <div className="text-green-500 text-6xl mb-4">✅</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">¡Configuración completada!</h2>
              <p className="text-gray-600 mb-6">
                Tu cuenta está lista. Te redirigiremos al dashboard en unos segundos...
              </p>
              <div className="bg-green-50 p-6 rounded-lg mb-6">
                <h3 className="font-semibold text-green-900 mb-3">🎉 ¡Bienvenido a Delfín Check-in!</h3>
                <ul className="text-green-800 text-sm space-y-2">
                  <li>✅ Cuenta configurada correctamente</li>
                  <li>✅ Plan Premium activado</li>
                  <li>✅ Configuración personalizada aplicada</li>
                  <li>✅ Listo para gestionar tus habitaciones</li>
                </ul>
              </div>
              <button
                onClick={() => router.push('/')}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ir al Dashboard
              </button>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
