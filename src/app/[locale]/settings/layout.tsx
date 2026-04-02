'use client';

import { useState, useEffect, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, FileText, CreditCard, User, LinkIcon, Home, Calendar, Wallet, AlertCircle, ExternalLink, LifeBuoy } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useTranslations, useLocale } from 'next-intl';

const AdSidebar = dynamic(() => import('@/components/AdSidebar'), {
  ssr: false
});

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('settings');
  const locale = useLocale();
  const pathname = usePathname();
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const settingsSections = useMemo(() => {
    const p = (path: string) => `/${locale}${path}`;
    return [
      { id: 'general', tabKey: 'general', icon: Settings, href: p('/settings') },
      { id: 'empresa', tabKey: 'empresa', icon: FileText, href: p('/settings/empresa') },
      { id: 'mir', tabKey: 'mir', icon: FileText, href: p('/settings/mir') },
      { id: 'properties', tabKey: 'properties', icon: Home, href: p('/settings/properties') },
      { id: 'checkinInstructions', tabKey: 'checkinInstructions', icon: FileText, href: p('/settings/checkin-instructions') },
      { id: 'integrations', tabKey: 'integrations', icon: Calendar, href: p('/settings/integrations') },
      { id: 'billing', tabKey: 'billing', icon: CreditCard, href: p('/settings/billing') },
      { id: 'microsite-payments', tabKey: 'micrositePayments', icon: Wallet, href: p('/settings/microsite-payments') },
      { id: 'payment-links', tabKey: 'paymentLinks', icon: LinkIcon, href: p('/settings/payment-links') },
      { id: 'support', tabKey: 'support', icon: LifeBuoy, href: p('/settings/support') },
      { id: 'account', tabKey: 'account', icon: User, href: p('/settings/account') },
    ];
  }, [locale]);

  useEffect(() => {
    const loadBillingInfo = async () => {
      try {
        const response = await fetch('/api/billing');
        if (response.ok) {
          const data = await response.json();
          setBillingInfo(data);
        }
      } catch (error) {
        console.error('Error cargando información de facturación:', error);
      } finally {
        setLoading(false);
      }
    };
    loadBillingInfo();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-6">
              <div className="text-3xl mr-3">⚙️</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('layout.headerTitle')}</h1>
                <p className="text-sm text-gray-600">{t('layout.headerSubtitle')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alerta de Suspensión o Facturas Pendientes */}
        {!loading && billingInfo && (
          <>
            {/* Alerta de Suspensión */}
            {billingInfo.tenant?.is_suspended && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg shadow-sm">
                  <div className="flex items-start">
                    <AlertCircle className="w-6 h-6 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-red-900 mb-1">🚫 {t('layout.suspendedTitle')}</h3>
                      <p className="text-red-800 text-sm mb-2">
                        {t('layout.suspendedMessage', { count: billingInfo.tenant.payment_retry_count || 0 })}
                      </p>
                      <p className="text-red-700 text-xs mb-3">
                        {t('layout.suspendedHint')}
                      </p>
                      <Link
                        href={`/${locale}/settings/billing`}
                        className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        {t('layout.viewPendingInvoices')}
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alerta de Pagos Fallidos (antes de suspensión) */}
            {!billingInfo.tenant?.is_suspended && billingInfo.tenant?.payment_retry_count && billingInfo.tenant.payment_retry_count > 0 && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg shadow-sm">
                  <div className="flex items-start">
                    <AlertCircle className="w-6 h-6 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-yellow-900 mb-1">⚠️ {t('layout.paymentFailedTitle')}</h3>
                      <p className="text-yellow-800 text-sm mb-2">
                        {t('layout.paymentFailedMessage', { current: billingInfo.tenant.payment_retry_count })}
                      </p>
                      <p className="text-yellow-700 text-xs mb-3">
                        {3 - (billingInfo.tenant.payment_retry_count || 0) === 1
                          ? t('layout.paymentFailedHintOne')
                          : t('layout.paymentFailedHintMany', { remaining: 3 - (billingInfo.tenant.payment_retry_count || 0) })}
                      </p>
                      <Link
                        href={`/${locale}/settings/billing`}
                        className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                      >
                        {t('layout.updatePaymentMethod')}
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Alerta de Facturas Pendientes (sin problemas de pago) */}
            {!billingInfo.tenant?.is_suspended && 
             (!billingInfo.tenant?.payment_retry_count || billingInfo.tenant.payment_retry_count === 0) &&
             billingInfo.pending_invoices && billingInfo.pending_invoices.length > 0 && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg shadow-sm">
                  <div className="flex items-start">
                    <AlertCircle className="w-6 h-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-blue-900 mb-1">📋 {t('layout.pendingInvoicesTitle')}</h3>
                      <p className="text-blue-800 text-sm mb-3">
                        {billingInfo.pending_invoices.length === 1
                          ? t('layout.pendingInvoicesCountOne')
                          : t('layout.pendingInvoicesCountMany', { count: billingInfo.pending_invoices.length })}
                      </p>
                      <Link
                        href={`/${locale}/settings/billing`}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        {t('layout.viewPendingInvoices')}
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <nav className="space-y-2">
                {settingsSections.map((section) => {
                  const isActive = pathname === section.href;
                  return (
                    <Link
                      key={section.id}
                      href={section.href}
                      className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-blue-50'
                      }`}
                    >
                      <section.icon className="w-5 h-5 mr-3" />
                      <span className="font-medium">{t(`tabs.${section.tabKey}`)}</span>
                    </Link>
                  );
                })}
              </nav>
              {/* Anuncio en sidebar - solo en settings, no crítico */}
              <div className="mt-6">
                <AdSidebar />
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              {children}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

