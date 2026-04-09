'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { CreditCard, TrendingUp, Calendar, AlertCircle, CheckCircle, Download, ExternalLink } from 'lucide-react';
import DynamicPriceCalculator from '@/components/DynamicPriceCalculator';

type BillingPlanType = 'free' | 'checkin' | 'standard' | 'pro';
type PaidPlanId = 'checkin' | 'standard' | 'pro';

const PLAN_FEATURE_KEYS: Record<BillingPlanType, string[]> = {
  free: ['freeF0', 'freeF1', 'freeF2', 'freeF3', 'freeF4'],
  checkin: ['checkinF0', 'checkinF1', 'checkinF2', 'checkinF3', 'checkinF4', 'checkinF5', 'checkinF6'],
  standard: ['standardF0', 'standardF1', 'standardF2', 'standardF3', 'standardF4', 'standardF5'],
  pro: ['proF0', 'proF1', 'proF2', 'proF3', 'proF4', 'proF5', 'proF6', 'proF7'],
};

const PLAN_BADGE_CLASS: Record<BillingPlanType, string> = {
  free: 'bg-gray-100 text-gray-800',
  checkin: 'bg-green-100 text-green-800',
  standard: 'bg-amber-100 text-amber-900',
  pro: 'bg-purple-100 text-purple-900',
};

function getPlanName(tPlans: (key: string) => string, planId: string | null | undefined): string {
  if (!planId || planId === 'free') {
    return tPlans('freePlanName');
  }
  if (planId === 'checkin') {
    return tPlans('checkinPlanName');
  }
  if (planId === 'standard') {
    return tPlans('standardPlanName');
  }
  if (planId === 'pro') {
    return tPlans('proPlanName');
  }
  return tPlans('freePlanName');
}

interface BillingInfo {
  tenant: {
    id: string;
    name: string;
    email: string;
    plan_id: string;
    plan_type?: BillingPlanType;
    plan_name: string;
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
  plan?: {
    effective_type: BillingPlanType;
    billing_rooms: number;
    price_ex_vat: number;
    vat_rate: number;
    vat_amount: number;
    price_total: number;
    features: string[];
  };
  subscription?: {
    id: string;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    billing_interval?: 'month' | 'year' | null;
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

export default function BillingPage() {
  const t = useTranslations('settings.billing');
  const tPlans = useTranslations('plans');
  const tLayout = useTranslations('settings.layout');
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentRooms, setCurrentRooms] = useState(1);

  useEffect(() => {
    loadBillingInfo();
  }, []);

  const loadBillingInfo = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/billing');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || t('errorLoading'));
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
    if (!confirm(t('cancelConfirm'))) {
      return;
    }

    try {
      const response = await fetch('/api/billing/cancel', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('errorCancel'));
      }

      setSuccess(t('cancelSuccess'));
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
        throw new Error(data.error || t('errorReactivate'));
      }

      setSuccess(t('reactivateSuccess'));
      await loadBillingInfo();

    } catch (error: any) {
      setError(error.message);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="loading mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('loading')}</p>
          </div>
        </div>

      </div>
    );
  }

  if (!billingInfo) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{t('errorLoading')}</p>
      </div>
    );
  }

  const effectivePlan: BillingPlanType = billingInfo.plan?.effective_type
    || billingInfo.tenant.plan_type
    || 'free';
  const badgeClass = PLAN_BADGE_CLASS[effectivePlan] || PLAN_BADGE_CLASS.free;
  const planTitle = getPlanName(tPlans, effectivePlan);
  const featureKeys = PLAN_FEATURE_KEYS[effectivePlan] || PLAN_FEATURE_KEYS.free;
  const currentPlanFeatures = featureKeys.map((key) => tPlans(key as never));

  const priceExVat = billingInfo.plan?.price_ex_vat ?? 0;
  const vatRate = billingInfo.plan?.vat_rate ?? 21;
  const vatAmount = billingInfo.plan?.vat_amount ?? 0;
  const priceTotal = billingInfo.plan?.price_total ?? 0;
  const billingRooms = billingInfo.plan?.billing_rooms ?? 1;

  const periodEnd = billingInfo.subscription?.current_period_end;
  const nextChargeDisplay =
    effectivePlan === 'free'
      ? t('nextChargeNa')
      : periodEnd
        ? formatDate(periodEnd)
        : t('nextChargeUnknown');

  const calculatorDefaultPlan: PaidPlanId =
    effectivePlan === 'checkin' || effectivePlan === 'standard' || effectivePlan === 'pro'
      ? effectivePlan
      : 'standard';

  const showSubscriptionActions = Boolean(billingInfo.tenant.stripe_subscription_id);

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
                  <h3 className="text-lg font-bold text-red-900 mb-2">🚫 {tLayout('suspendedTitle')}</h3>
                  <p className="text-red-800 mb-3">
                    {tLayout('suspendedMessage', { count: billingInfo.tenant.payment_retry_count || 0 })}
                  </p>
                  <p className="text-red-700 text-sm mb-4">
                    {tLayout('suspendedHint')}
                  </p>
                  {billingInfo.pending_invoices && billingInfo.pending_invoices.length > 0 && (
                    <div className="mt-4">
                      <p className="text-red-700 font-semibold mb-2">{t('pendingInvoicesLabel')}</p>
                      <ul className="space-y-2">
                        {billingInfo.pending_invoices.map((inv) => (
                          <li key={inv.id} className="flex items-center justify-between bg-white p-3 rounded border border-red-200">
                            <div>
                              <p className="font-medium text-red-900">
                                {formatCurrency(inv.amount_due)} {inv.currency.toUpperCase()}
                              </p>
                              {inv.due_date && (
                                <p className="text-sm text-red-600">
                                  {t('dueDate')} {formatDate(inv.due_date)}
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
                                {t('payNow')}
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
          {!billingInfo.tenant.is_suspended &&
            (billingInfo.tenant.payment_retry_count ?? 0) > 0 && (
            <div className="p-6 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-6 h-6 text-yellow-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-yellow-900 mb-2">⚠️ {tLayout('paymentFailedTitle')}</h3>
                  <p className="text-yellow-800 mb-3">
                    {tLayout('paymentFailedMessage', { current: billingInfo.tenant.payment_retry_count })}
                  </p>
                  <p className="text-yellow-700 text-sm mb-4">
                    {3 - (billingInfo.tenant.payment_retry_count || 0) === 1
                      ? tLayout('paymentFailedHintOne')
                      : tLayout('paymentFailedHintMany', { remaining: 3 - (billingInfo.tenant.payment_retry_count || 0) })}
                  </p>
                  {billingInfo.pending_invoices && billingInfo.pending_invoices.length > 0 && (
                    <div className="mt-4">
                      <p className="text-yellow-700 font-semibold mb-2">{t('pendingInvoicesLabel')}</p>
                      <ul className="space-y-2">
                        {billingInfo.pending_invoices.map((inv) => (
                          <li key={inv.id} className="flex items-center justify-between bg-white p-3 rounded border border-yellow-200">
                            <div>
                              <p className="font-medium text-yellow-900">
                                {formatCurrency(inv.amount_due)} {inv.currency.toUpperCase()}
                              </p>
                              {inv.due_date && (
                                <p className="text-sm text-yellow-600">
                                  {t('dueDate')} {formatDate(inv.due_date)}
                                </p>
                              )}
                              {inv.next_payment_attempt_at && (
                                <p className="text-sm text-yellow-600">
                                  {t('nextAttempt')} {formatDate(inv.next_payment_attempt_at)}
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
                                {t('updatePayment')}
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
                  <h3 className="text-lg font-bold text-blue-900 mb-2">📋 {tLayout('pendingInvoicesTitle')}</h3>
                  <p className="text-blue-800 mb-4">
                    {billingInfo.pending_invoices.length === 1 ? tLayout('pendingInvoicesCountOne') : tLayout('pendingInvoicesCountMany', { count: billingInfo.pending_invoices.length })}
                  </p>
                  <ul className="space-y-2">
                    {billingInfo.pending_invoices.map((inv) => (
                      <li key={inv.id} className="flex items-center justify-between bg-white p-3 rounded border border-blue-200">
                        <div>
                          <p className="font-medium text-blue-900">
                            {inv.invoice_number || t('invoice')} - {formatCurrency(inv.amount_due)} {inv.currency.toUpperCase()}
                          </p>
                          {inv.due_date && (
                            <p className="text-sm text-blue-600">
                              {t('dueDate')} {formatDate(inv.due_date)}
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
                            {t('viewInvoice')}
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('currentPlan')}</h2>
                <p className="text-sm text-gray-600">{t('currentPlanSubtitle')}</p>
                <p className="text-xs text-gray-500 mt-2">{t('billedUnits', { count: billingRooms })}</p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1">
                <div className={`px-4 py-2 rounded-full font-semibold ${badgeClass}`}>
                  {planTitle}
                </div>
                {billingInfo.subscription?.billing_interval === 'year' && (
                  <span className="text-xs text-gray-500">{t('billingPeriodYearly')}</span>
                )}
                {billingInfo.subscription?.billing_interval === 'month' && (
                  <span className="text-xs text-gray-500">{t('billingPeriodMonthly')}</span>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center mb-1">
                  <CreditCard className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">{t('monthlyPrice')}</span>
                </div>
                <div className="space-y-1 text-sm text-gray-800">
                  <div className="flex justify-between gap-4">
                    <span>{t('priceExVat')}</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(priceExVat)}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-gray-600">
                    <span>{t('vatAmount', { rate: vatRate })}</span>
                    <span className="tabular-nums">{formatCurrency(vatAmount)}</span>
                  </div>
                  <div className="flex justify-between gap-4 pt-2 border-t border-gray-200 text-base">
                    <span className="font-medium">{t('totalWithVat')}</span>
                    <span className="font-bold text-gray-900 tabular-nums">
                      {formatCurrency(priceTotal)}
                      <span className="text-xs font-normal text-gray-500">{t('perMonthShort')}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <Calendar className="w-5 h-5 text-gray-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">{t('nextCharge')}</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{nextChargeDisplay}</p>
                {billingInfo.subscription?.cancel_at_period_end && (
                  <p className="text-xs text-orange-600 mt-1">⚠️ {t('willCancelAtEnd')}</p>
                )}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-semibold text-gray-900 mb-3">{t('featuresIncluded')}</h3>
              <ul className="space-y-2">
                {currentPlanFeatures.map((feature, index) => (
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
                  {t('customerSince')} {formatDate(billingInfo.tenant.created_at)}
                </p>
                {billingInfo.tenant.stripe_customer_id && (
                  <p className="text-xs text-gray-500 mt-1">
                    ID: {billingInfo.tenant.stripe_customer_id.slice(0, 20)}...
                  </p>
                )}
              </div>
              
              {showSubscriptionActions && (
                <div className="flex space-x-3">
                  {billingInfo.subscription?.cancel_at_period_end ? (
                    <button
                      type="button"
                      onClick={handleReactivateSubscription}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {t('reactivateSubscription')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCancelSubscription}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      {t('cancelSubscription')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Calculadora Dinámica de Precios */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t('priceCalculatorTitle')}</h2>
                <p className="text-sm text-gray-600">{t('priceCalculatorSubtitle')}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>

            <div className="max-w-2xl mx-auto">
              <DynamicPriceCalculator
                currentRoomCount={currentRooms}
                defaultPlanId={calculatorDefaultPlan}
              />
            </div>
          </div>


          {/* Facturas Pendientes - Sección Separada */}
          {billingInfo.pending_invoices && billingInfo.pending_invoices.length > 0 && (
            <div className="card border-2 border-orange-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-orange-900">⚠️ {t('pendingSectionTitle')}</h2>
                  <p className="text-sm text-orange-600">{t('pendingSectionDesc')}</p>
                </div>
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-orange-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase">{t('tableInvoice')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase">{t('tableAmount')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase">{t('tableDue')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase">{t('tableState')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase">{t('tableAttempts')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-orange-700 uppercase">{t('tableAction')}</th>
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
                            {inv.status === 'open' ? t('statusOpen') : inv.status === 'uncollectible' ? t('statusUncollectible') : inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {t('attemptsCount', { count: inv.attempt_count || 0 })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {inv.hosted_invoice_url ? (
                            <a
                              href={inv.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium inline-flex items-center"
                            >
                              {t('payNow')}
                              <ExternalLink className="w-4 h-4 ml-1" />
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">{t('notAvailable')}</span>
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
                <h2 className="text-xl font-bold text-gray-900">{t('invoiceHistoryTitle')}</h2>
                <p className="text-sm text-gray-600">{t('invoiceHistoryDesc')}</p>
              </div>
              <Download className="w-6 h-6 text-gray-600" />
            </div>

            {billingInfo.invoices && billingInfo.invoices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tableDate')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tableStatus')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tableMonto')}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('tableAction')}</th>
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
                            {invoice.status === 'paid' ? t('paid') : t('pending')}
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
                              {t('downloadPdf')}
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
                <p className="text-gray-500">{t('noInvoices')}</p>
              </div>
            )}
          </div>

          {/* Help Card */}
          <div className="card bg-blue-50 border-blue-200">
            <div className="flex items-start">
              <div className="text-2xl mr-4">💡</div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">{t('helpTitle')}</h3>
                <p className="text-blue-800 text-sm mb-3">
                  {t('helpText')}
                </p>
                <a
                  href="mailto:soporte@delfincheckin.com"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  {t('contactSupport')}
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