'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Wallet, CheckCircle, XCircle, Download, CreditCard, Calendar, AlertCircle, ExternalLink } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { useTenantMoneyFormat } from '@/hooks/use-tenant-money-format';

type StripeConnectStatus =
  | {
      has_account: false;
      charges_enabled: false;
      payouts_enabled: false;
      details_submitted: false;
    }
  | {
      has_account: true;
      stripe_connect_account_id: string;
      charges_enabled: boolean;
      payouts_enabled: boolean;
      details_submitted: boolean;
      requirements: unknown;
    };

interface Payment {
  reservation_code: string;
  check_in_date: string;
  check_out_date: string;
  property_owner_amount: number;
  delfin_commission_amount: number;
  stripe_fee_amount: number;
  total_amount: number;
  status: string;
  transfer_id?: string;
  processed_at?: string;
}

export default function MicrositePaymentsPage() {
  const t = useTranslations('settings.micrositePayments');
  const locale = useLocale();
  const { formatCurrency } = useTenantMoneyFormat();
  const { tenant } = useTenant();
  const commissionPercent = tenant?.plan_type === 'pro' ? 5 : 9;
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar estado Connect y pagos en paralelo
      const [connectRes, paymentsRes] = await Promise.all([
        fetch('/api/stripe-connect/status'),
        fetch('/api/admin/payouts/history'),
      ]);

      const connectData = await connectRes.json();
      const paymentsData = await paymentsRes.json();

      if (connectData.success) setConnectStatus(connectData as StripeConnectStatus);

      if (paymentsData.success) {
        setPayments(paymentsData.payments || []);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      setMessage({ type: 'error', text: t('errorLoading') });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenConnectOnboarding = async () => {
    try {
      setConnectLoading(true);
      setMessage(null);
      const res = await fetch('/api/stripe-connect/onboarding-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_path: `/${locale}/settings/microsite-payments` }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data?.url) {
        throw new Error(data?.error || t('connectError'));
      }
      window.location.href = data.url as string;
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('connectError');
      setMessage({ type: 'error', text: msg });
    } finally {
      setConnectLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const response = await fetch('/api/admin/payouts/download-report');
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pagos_microsite_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setMessage({ type: 'error', text: t('errorReport') });
      }
    } catch (error) {
      console.error('Error descargando reporte:', error);
      setMessage({ type: 'error', text: t('errorDownloadReport') });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Wallet className="w-6 h-6 mr-2 text-blue-600" />
            {t('title')}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 mr-2" />
            ) : (
              <XCircle className="w-5 h-5 mr-2" />
            )}
            {message.text}
          </div>
        </div>
      )}

      {/* Configuración de cobros (Stripe Connect Express) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{t('connectTitle')}</h3>
            <p className="text-sm text-gray-600 mt-1">{t('connectSubtitle')}</p>
            <p className="text-xs text-gray-500 mt-2">{t('connectWebOnly')}</p>
          </div>
          <button
            onClick={handleOpenConnectOnboarding}
            disabled={connectLoading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {connectLoading ? t('connectOpening') : t('connectButton')}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">{t('connectStatusAccount')}</p>
            <p className="mt-1 font-semibold text-gray-900">
              {connectStatus?.has_account ? t('connectYes') : t('connectNo')}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">{t('connectStatusCharges')}</p>
            <p className="mt-1 font-semibold text-gray-900">
              {connectStatus && 'charges_enabled' in connectStatus && connectStatus.charges_enabled
                ? t('connectEnabled')
                : t('connectDisabled')}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">{t('connectStatusPayouts')}</p>
            <p className="mt-1 font-semibold text-gray-900">
              {connectStatus && 'payouts_enabled' in connectStatus && connectStatus.payouts_enabled
                ? t('connectEnabled')
                : t('connectDisabled')}
            </p>
          </div>
        </div>
      </div>

      {/* Historial de Pagos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{t('paymentHistory')}</h3>
          <button
            onClick={handleDownloadReport}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            {t('downloadReport')}
          </button>
        </div>

        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reservationCode')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('dates')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('totalReservation')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('stripeFee')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('delfinFee')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('amountReceived')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {payment.reservation_code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{formatDate(payment.check_in_date)}</div>
                      <div className="text-xs text-gray-500">{formatDate(payment.check_out_date)}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {formatCurrency(payment.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600">
                      -{formatCurrency(payment.stripe_fee_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-orange-600">
                      -{formatCurrency(payment.delfin_commission_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600 font-semibold">
                      +{formatCurrency(payment.property_owner_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {payment.status === 'completed' ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t('paid')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Calendar className="w-3 h-3 mr-1" />
                          {t('pending')}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Wallet className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>{t('noPayments')}</p>
          </div>
        )}

        {/* Resumen */}
        {payments.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{t('summaryTotal')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(payments.reduce((sum, p) => sum + p.total_amount, 0))}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{t('summaryCommissions')}</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(payments.reduce((sum, p) => sum + p.delfin_commission_amount, 0))}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{t('summaryReceived')}</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(payments.reduce((sum, p) => sum + p.property_owner_amount, 0))}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Info adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">{t('infoTitle')}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('info1')}</li>
              <li>{t('info2', { percent: commissionPercent })}</li>
              <li>{t('info3')}</li>
              <li>{t('info4')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

