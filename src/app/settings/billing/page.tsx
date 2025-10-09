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

const PLANS = [
  {
    id: 'basic',
    name: 'Básico',
    price: 29,
    rooms: 2,
    features: ['2 Habitaciones', 'Dashboard básico', 'Soporte por email'],
    color: 'blue'
  },
  {
    id: 'standard',
    name: 'Estándar',
    price: 49,
    rooms: 4,
    features: ['4 Habitaciones', 'Dashboard completo', 'Soporte prioritario', 'Integraciones básicas'],
    color: 'purple',
    popular: true
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 79,
    rooms: 6,
    features: ['6 Habitaciones', 'Dashboard avanzado', 'Soporte 24/7', 'Todas las integraciones', 'Reportes personalizados'],
    color: 'green'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 149,
    rooms: -1,
    features: ['Habitaciones ilimitadas', 'Dashboard personalizado', 'Soporte dedicado', 'API completa', 'Onboarding personalizado'],
    color: 'orange'
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
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información de facturación...</p>
        </div>
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

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === billingInfo.tenant.plan_id;
            const isUpgrade = plan.price > currentPlan.price;
            const isDowngrade = plan.price < currentPlan.price;

            return (
              <div
                key={plan.id}
                className={`p-4 rounded-lg border-2 ${
                  isCurrent 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 bg-white hover:border-blue-300'
                } transition-colors relative`}
              >
                {plan.popular && !isCurrent && (
                  <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs px-2 py-1 rounded-bl-lg rounded-tr-lg">
                    Popular
                  </div>
                )}
                
                <div className="text-center mb-4">
                  <h3 className="font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(plan.price)}
                  </div>
                  <p className="text-xs text-gray-500">por mes</p>
                </div>

                <ul className="space-y-1 mb-4">
                  <li className="text-sm text-gray-700">
                    • {plan.rooms === -1 ? '∞' : plan.rooms} habitaciones
                  </li>
                  <li className="text-sm text-gray-700">
                    • {plan.features[1]}
                  </li>
                  <li className="text-sm text-gray-700">
                    • {plan.features[2]}
                  </li>
                </ul>

                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium opacity-50 cursor-not-allowed"
                  >
                    Plan actual
                  </button>
                ) : (
                  <Link
                    href={`/upgrade-plan?plan=${plan.id}&action=${isUpgrade ? 'upgrade' : 'downgrade'}`}
                    className={`block w-full py-2 text-center rounded-lg font-medium transition-colors ${
                      isUpgrade
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-600 text-white hover:bg-gray-700'
                    }`}
                  >
                    {isUpgrade ? 'Upgrade' : 'Cambiar'}
                  </Link>
                )}
              </div>
            );
          })}
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
  );
}

