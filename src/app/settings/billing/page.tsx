'use client';

import { useState, useEffect } from 'react';
import { CreditCard, TrendingUp, Calendar, AlertCircle, CheckCircle, ArrowUpCircle, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface BillingInfo {
  tenant: {
    id: string;
    name: string;
    email: string;
    plan_id: string;
    plan_name: string;
    plan_price: number;
    status: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    created_at: string;
  };
  subscription?: {
    id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
    cancel_at_period_end: boolean;
  };
  invoices: Array<{
    id: string;
    amount: number;
    status: string;
    date: string;
    invoice_pdf?: string;
  }>;
}

type PlanId = 'basic' | 'basic_yearly' | 'standard' | 'premium' | 'enterprise';

const PLANS = [
  {
    id: 'basic',
    name: 'Plan mensual',
    price: 14.99,
    rooms: 1,
    features: ['Gestión manual de reservas', 'Check-in online', 'Gestión de habitaciones', 'Registro de viajeros', 'Soporte por email'],
    color: 'blue'
  },
  {
    id: 'basic_yearly',
    name: 'Plan anual',
    price: 149.90,
    rooms: 1,
    features: ['Todo lo del mensual', 'Descuento 16,7% por pago anual', 'Soporte prioritario', 'Onboarding asistido', 'Equivale a 12,49€/mes'],
    color: 'blue',
    popular: true
  },
  {
    id: 'standard',
    name: 'Descuentos por volumen',
    price: 26.98,
    rooms: 2,
    features: ['2 propiedades: 13,49€ cada una', '4 propiedades: 12,74€ cada una', '5-9 propiedades: 11,99€ cada una', '10+ propiedades: 11,24€ cada una'],
    color: 'green'
  }
];

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadBillingInfo();
  }, []);

  const loadBillingInfo = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/billing');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error cargando información de facturación');
      }
      
      setBillingInfo(data);
      
    } catch (error: any) {
      console.error('Error cargando facturación:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('¿Estás seguro de que deseas cancelar tu suscripción? Tu acceso continuará hasta el final del período de facturación actual.')) {
      return;
    }

    try {
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error cancelando suscripción');
      }

      setSuccess('Suscripción cancelada. Tu acceso continuará hasta el final del período actual.');
      await loadBillingInfo();

    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleReactivateSubscription = async () => {
    try {
      const response = await fetch('/api/billing/reactivate', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error reactivando suscripción');
      }

      setSuccess('Suscripción reactivada correctamente.');
      await loadBillingInfo();

    } catch (error: any) {
      setError(error.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const getCurrentPlan = () => {
    return PLANS.find(p => p.id === billingInfo?.tenant.plan_id) || PLANS[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="loading mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando información de facturación...</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Main Footer Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
              {/* Delfín Check-in */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Delfín Check-in</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Software de gestión hotelera y auto check-in para hostales y apartamentos.
                </p>
              </div>

              {/* Contacto */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Contacto</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="h-4 w-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    contacto@delfincheckin.com
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="h-4 w-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    Lun-Dom: 9:00-22:00
                  </div>
                </div>
              </div>

              {/* Legal */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Legal</h3>
                <div className="space-y-1">
                  <a href="/legal/privacy" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                    Política de Privacidad
                  </a>
                  <a href="/legal/cookies" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                    Política de Cookies
                  </a>
                  <a href="/legal/terms" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                    Términos de Servicio
                  </a>
                  <a href="/legal/notice" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                    Aviso Legal
                  </a>
                  <a href="/legal/cookies" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                    Gestionar Cookies
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  © 2025 Delfín Check-in ·{' '}
                  <a href="https://delfincheckin.com" className="text-blue-600 hover:text-blue-800 underline">
                    Ver precios
                  </a>
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  if (!billingInfo) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Error cargando información de facturación</p>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
      
          {/* Success/Error Messages */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Current Plan */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Plan Actual</h2>
                <p className="text-sm text-gray-600">Información sobre tu suscripción</p>
              </div>
              <div className={`px-4 py-2 bg-${currentPlan.color}-100 text-${currentPlan.color}-800 rounded-full font-semibold`}>
                {currentPlan.name}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <CreditCard className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Precio mensual</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(currentPlan.price)}</p>
                <p className="text-xs text-gray-500 mt-1">por mes</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Calendar className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Próximo cobro</span>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {billingInfo.subscription?.current_period_end 
                    ? formatDate(billingInfo.subscription.current_period_end)
                    : 'N/A'}
                </p>
                {billingInfo.subscription?.cancel_at_period_end && (
                  <p className="text-xs text-orange-600 mt-1">⚠️ Se cancelará al final del período</p>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-gray-900 mb-3">Características incluidas:</h3>
              <ul className="space-y-2">
                {currentPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 pt-6 border-t flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">
                  Cliente desde: {formatDate(billingInfo.tenant.created_at)}
                </p>
                {billingInfo.tenant.stripe_customer_id && (
                  <p className="text-xs text-gray-500 mt-1">
                    ID: {billingInfo.tenant.stripe_customer_id.slice(0, 20)}...
                  </p>
                )}
              </div>
              
              <div className="flex space-x-3">
                {billingInfo.subscription?.cancel_at_period_end ? (
                  <button
                    onClick={handleReactivateSubscription}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Reactivar suscripción
                  </button>
                ) : (
                  <button
                    onClick={handleCancelSubscription}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Cancelar suscripción
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Upgrade Options */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Cambiar de plan</h2>
                <p className="text-sm text-gray-600">Upgrade o downgrade según tus necesidades</p>
              </div>
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>

            <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Card 1: Plan mensual */}
              <div className={`relative flex flex-col p-6 bg-white rounded-lg shadow-lg transition-all duration-300 ${billingInfo.tenant.plan_id === 'basic' ? 'border-4 border-blue-500' : 'border border-gray-200'} hover:shadow-xl hover:scale-[1.02]`}>
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
                {billingInfo.tenant.plan_id === 'basic' ? (
                  <button disabled className="w-full py-3 rounded-md text-lg font-semibold transition-colors duration-200 bg-gray-300 text-gray-700 cursor-not-allowed">
                    Plan actual
                  </button>
                ) : (
                  <Link href="/upgrade-plan?plan=basic" className="w-full py-3 rounded-md text-lg font-semibold transition-colors duration-200 bg-blue-600 text-white hover:bg-blue-700 text-center block">
                    Contratar
                  </Link>
                )}
                <p className="text-xs text-gray-500 mt-4 text-center">Sin permanencia. Cancela cuando quieras.</p>
              </div>

              {/* Card 2: Plan anual - RECOMENDADO */}
              <div className={`relative flex flex-col p-6 bg-white rounded-lg shadow-lg transition-all duration-300 ${billingInfo.tenant.plan_id === 'basic_yearly' ? 'border-4 border-blue-500' : 'border border-gray-200'} hover:shadow-xl hover:scale-[1.02]`}>
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
                {billingInfo.tenant.plan_id === 'basic_yearly' ? (
                  <button disabled className="w-full py-3 rounded-md text-lg font-semibold transition-colors duration-200 bg-gray-300 text-gray-700 cursor-not-allowed">
                    Plan actual
                  </button>
                ) : (
                  <Link href="/upgrade-plan?plan=basic_yearly" className="w-full py-3 rounded-md text-lg font-semibold transition-colors duration-200 bg-blue-600 text-white hover:bg-blue-700 text-center block">
                    Contratar
                  </Link>
                )}
                <p className="text-xs text-gray-500 mt-4 text-center">Ahorra 29,90€ al año por propiedad.</p>
              </div>

              {/* Card 3: Descuentos por volumen */}
              <div className={`relative flex flex-col p-6 bg-white rounded-lg shadow-lg transition-all duration-300 ${['standard', 'premium', 'enterprise'].includes(billingInfo.tenant.plan_id) ? 'border-4 border-blue-500' : 'border border-gray-200'} hover:shadow-xl hover:scale-[1.02]`}>
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
                {['standard', 'premium', 'enterprise'].includes(billingInfo.tenant.plan_id) ? (
                  <button disabled className="w-full py-3 rounded-md text-lg font-semibold transition-colors duration-200 bg-gray-300 text-gray-700 cursor-not-allowed">
                    Plan actual
                  </button>
                ) : (
                  <Link href="/upgrade-plan?plan=standard" className="w-full py-3 rounded-md text-lg font-semibold transition-colors duration-200 bg-blue-600 text-white hover:bg-blue-700 text-center block">
                    Contratar
                  </Link>
                )}
                <p className="text-xs text-gray-500 mt-4 text-center">Descuentos automáticos según volumen.</p>
              </div>
            </div>
          </div>

          {/* Invoices */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Historial de facturas</h2>
                <p className="text-sm text-gray-600">Descarga tus facturas anteriores</p>
              </div>
              <Download className="w-6 h-6 text-gray-600" />
            </div>

            {billingInfo.invoices && billingInfo.invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billingInfo.invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(invoice.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            invoice.status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {invoice.status === 'paid' ? 'Pagada' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.amount / 100)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {invoice.invoice_pdf && (
                            <a
                              href={invoice.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-700 flex items-center"
                            >
                              Descargar PDF
                              <ExternalLink className="w-4 h-4 ml-1" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay facturas disponibles aún</p>
              </div>
            )}
          </div>

          {/* Help Card */}
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-start">
              <div className="text-2xl mr-4">💡</div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">¿Necesitas ayuda con tu facturación?</h3>
                <p className="text-blue-800 text-sm mb-3">
                  Si tienes preguntas sobre tu plan, facturación o necesitas ayuda para cambiar de plan, 
                  nuestro equipo de soporte está aquí para ayudarte.
                </p>
                <a
                  href="mailto:soporte@delfincheckin.com"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Contactar soporte
                  <ExternalLink className="w-4 h-4 ml-1" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            {/* Delfín Check-in */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delfín Check-in</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Software de gestión hotelera y auto check-in para hostales y apartamentos.
              </p>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Contacto</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  contacto@delfincheckin.com
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Lun-Dom: 9:00-22:00
                </div>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Legal</h3>
              <div className="space-y-1">
                <a href="/legal/privacy" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Política de Privacidad
                </a>
                <a href="/legal/cookies" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Política de Cookies
                </a>
                <a href="/legal/terms" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Términos de Servicio
                </a>
                <a href="/legal/notice" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Aviso Legal
                </a>
                <a href="/legal/cookies" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Gestionar Cookies
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-gray-200 pt-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                © 2025 Delfín Check-in ·{' '}
                <a href="https://delfincheckin.com" className="text-blue-600 hover:text-blue-800 underline">
                  Ver precios
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}