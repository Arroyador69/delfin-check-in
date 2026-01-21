'use client';

import { useState, useEffect } from 'react';
import { CreditCard, TrendingUp, Calendar, AlertCircle, CheckCircle, ArrowUpCircle, Download, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import DynamicPriceCalculator from '@/components/DynamicPriceCalculator';

interface BillingInfo {
  tenant: {
    id: string;
    name: string;
    email: string;
    plan_id: string;
    plan_name: string;
    plan_price: number;
    status: string;
    subscription_status?: string;
    payment_retry_count?: number;
    last_payment_failed_at?: string;
    subscription_suspended_at?: string;
    next_payment_attempt_at?: string;
    is_suspended?: boolean;
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
  pending_invoices?: Array<{
    id: string;
    invoice_number?: string;
    amount_due: number;
    amount_paid: number;
    currency: string;
    status: string;
    due_date?: string;
    period_start?: string;
    period_end?: string;
    invoice_pdf_url?: string;
    hosted_invoice_url?: string;
    attempt_count: number;
    next_payment_attempt_at?: string;
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
  const [currentRooms, setCurrentRooms] = useState(1);
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{rooms: number; yearly: boolean; price: number} | null>(null);

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

      // Cargar número de habitaciones actual
      try {
        const roomsResponse = await fetch('/api/tenant/limits');
        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json();
          if (roomsData.currentRooms && roomsData.currentRooms.length > 0) {
            setCurrentRooms(roomsData.currentRooms.length);
          }
        }
      } catch (err) {
        console.error('Error cargando habitaciones:', err);
      }
      
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

  const handleCheckout = async (rooms: number, isYearly: boolean, totalPrice: number) => {
    console.log('💰 Iniciando checkout:', { rooms, isYearly, totalPrice });
    setCheckoutData({ rooms, yearly: isYearly, price: totalPrice });
    setShowCheckout(true);
    // Redirigir a la página de checkout de habitaciones
    window.location.href = `/checkout-rooms?rooms=${rooms}&yearly=${isYearly}`;
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

          {/* Alerta de Suspensión */}
          {billingInfo.tenant.is_suspended && (
            <div className="p-6 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-6 h-6 text-red-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-red-900 mb-2">🚫 Servicios Suspendidos</h3>
                  <p className="text-red-800 mb-3">
                    Tus servicios han sido suspendidos por falta de pago después de {billingInfo.tenant.payment_retry_count || 0} intentos fallidos.
                  </p>
                  <p className="text-red-700 text-sm mb-4">
                    Puedes ver tus datos, pero no podrás crear nuevos registros, enviar mensajes o procesar reservas hasta que actualices tu método de pago.
                  </p>
                  {billingInfo.pending_invoices && billingInfo.pending_invoices.length > 0 && (
                    <div className="mt-4">
                      <p className="text-red-700 font-semibold mb-2">Facturas pendientes:</p>
                      <ul className="space-y-2">
                        {billingInfo.pending_invoices.map((inv) => (
                          <li key={inv.id} className="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                            <div>
                              <p className="font-medium text-red-900">
                                {formatCurrency(inv.amount_due)} {inv.currency.toUpperCase()}
                              </p>
                              {inv.due_date && (
                                <p className="text-sm text-red-600">
                                  Vencimiento: {formatDate(inv.due_date)}
                                </p>
                              )}
                            </div>
                            {inv.hosted_invoice_url && (
                              <a
                                href={inv.hosted_invoice_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                              >
                                Pagar ahora
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Alerta de Pagos Fallidos (antes de suspensión) */}
          {!billingInfo.tenant.is_suspended && billingInfo.tenant.payment_retry_count && billingInfo.tenant.payment_retry_count > 0 && (
            <div className="p-6 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-6 h-6 text-yellow-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-yellow-900 mb-2">⚠️ Pago Fallido</h3>
                  <p className="text-yellow-800 mb-3">
                    No se ha podido procesar el pago de tu suscripción. Intento {billingInfo.tenant.payment_retry_count}/3.
                  </p>
                  <p className="text-yellow-700 text-sm mb-4">
                    Si no actualizas tu método de pago, se intentará cobrar automáticamente {3 - (billingInfo.tenant.payment_retry_count || 0)} {3 - (billingInfo.tenant.payment_retry_count || 0) === 1 ? 'vez más' : 'veces más'}. 
                    Después de 3 intentos fallidos, los servicios serán suspendidos.
                  </p>
                  {billingInfo.pending_invoices && billingInfo.pending_invoices.length > 0 && (
                    <div className="mt-4">
                      <p className="text-yellow-700 font-semibold mb-2">Facturas pendientes:</p>
                      <ul className="space-y-2">
                        {billingInfo.pending_invoices.map((inv) => (
                          <li key={inv.id} className="flex items-center justify-between bg-white p-3 rounded border border-yellow-200">
                            <div>
                              <p className="font-medium text-yellow-900">
                                {formatCurrency(inv.amount_due)} {inv.currency.toUpperCase()}
                              </p>
                              {inv.due_date && (
                                <p className="text-sm text-yellow-600">
                                  Vencimiento: {formatDate(inv.due_date)}
                                </p>
                              )}
                              {inv.next_payment_attempt_at && (
                                <p className="text-sm text-yellow-600">
                                  Próximo intento: {formatDate(inv.next_payment_attempt_at)}
                                </p>
                              )}
                            </div>
                            {inv.hosted_invoice_url && (
                              <a
                                href={inv.hosted_invoice_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                              >
                                Actualizar pago
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Alerta de Facturas Pendientes (sin problemas de pago) */}
          {!billingInfo.tenant.is_suspended && 
           (!billingInfo.tenant.payment_retry_count || billingInfo.tenant.payment_retry_count === 0) &&
           billingInfo.pending_invoices && billingInfo.pending_invoices.length > 0 && (
            <div className="p-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
              <div className="flex items-start">
                <Calendar className="w-6 h-6 text-blue-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-900 mb-2">📋 Facturas Pendientes</h3>
                  <p className="text-blue-800 mb-4">
                    Tienes {billingInfo.pending_invoices.length} {billingInfo.pending_invoices.length === 1 ? 'factura pendiente' : 'facturas pendientes'} de pago.
                  </p>
                  <ul className="space-y-2">
                    {billingInfo.pending_invoices.map((inv) => (
                      <li key={inv.id} className="flex items-center justify-between bg-white p-3 rounded border border-blue-200">
                        <div>
                          <p className="font-medium text-blue-900">
                            {inv.invoice_number || 'Factura'} - {formatCurrency(inv.amount_due)} {inv.currency.toUpperCase()}
                          </p>
                          {inv.due_date && (
                            <p className="text-sm text-blue-600">
                              Vencimiento: {formatDate(inv.due_date)}
                            </p>
                          )}
                        </div>
                        {inv.hosted_invoice_url && (
                          <a
                            href={inv.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                          >
                            Ver factura
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
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
                <p className="text-xs text-gray-400 mt-1"><strong>IVA no incluido</strong></p>
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

          {/* Calculadora Dinámica de Precios */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Calculadora de precios</h2>
                <p className="text-sm text-gray-600">Descubre cuánto te costaría según tus necesidades</p>
              </div>
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>

            <div className="max-w-2xl mx-auto">
              <DynamicPriceCalculator
                currentProperties={currentRooms}
                isYearly={billingInfo?.tenant.plan_id === 'basic_yearly'}
                showUpgradeButton={true}
                onCheckout={handleCheckout}
              />
            </div>
          </div>


          {/* Facturas Pendientes - Sección Separada */}
          {billingInfo.pending_invoices && billingInfo.pending_invoices.length > 0 && (
            <div className="card border-2 border-orange-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-orange-900">⚠️ Facturas Pendientes</h2>
                  <p className="text-sm text-orange-600">Facturas que requieren atención</p>
                </div>
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-orange-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase">Factura</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase">Importe</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase">Vencimiento</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase">Intentos</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {billingInfo.pending_invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-orange-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {inv.invoice_number || inv.id.slice(0, 20) + '...'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-orange-900">
                          {formatCurrency(inv.amount_due)} {inv.currency.toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {inv.due_date ? formatDate(inv.due_date) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            inv.status === 'open' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : inv.status === 'uncollectible'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {inv.status === 'open' ? 'Pendiente' : inv.status === 'uncollectible' ? 'No cobrable' : inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {inv.attempt_count || 0} intentos
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {inv.hosted_invoice_url ? (
                            <a
                              href={inv.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium inline-flex items-center"
                            >
                              Pagar ahora
                              <ExternalLink className="w-4 h-4 ml-1" />
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">No disponible</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invoices */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Historial de facturas</h2>
                <p className="text-sm text-gray-600">Facturas pagadas y procesadas</p>
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

    </div>
  );
}