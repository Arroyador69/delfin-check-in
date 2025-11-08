'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, FileText, CreditCard, User, LinkIcon, Home, Calendar, Wallet, AlertCircle, ExternalLink } from 'lucide-react';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const settingsSections = [
    {
      id: 'general',
      name: 'General',
      icon: Settings,
      href: '/settings',
    },
    {
      id: 'empresa',
      name: 'Datos Empresa',
      icon: FileText,
      href: '/settings/empresa',
    },
    {
      id: 'mir',
      name: 'Configuración MIR',
      icon: FileText,
      href: '/settings/mir',
    },
          {
            id: 'properties',
            name: 'Propiedades',
            icon: Home,
            href: '/settings/properties',
          },
          {
            id: 'checkinInstructions',
            name: 'Instrucciones Check‑in',
            icon: FileText,
            href: '/settings/checkin-instructions',
          },
          {
            id: 'integrations',
            name: 'Integraciones',
            icon: Calendar,
            href: '/settings/integrations',
          },
          {
            id: 'billing',
            name: 'Facturación',
            icon: CreditCard,
            href: '/settings/billing',
          },
          {
            id: 'microsite-payments',
            name: 'Pagos Microsite',
            icon: Wallet,
            href: '/settings/microsite-payments',
          },
          {
            id: 'payment-links',
            name: 'Enlaces de Pago',
            icon: LinkIcon,
            href: '/settings/payment-links',
          },
    {
      id: 'account',
      name: 'Cuenta',
      icon: User,
      href: '/settings/account',
    },
  ];

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
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
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
                <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
                <p className="text-sm text-gray-600">Gestiona la configuración de tu cuenta</p>
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
                      <h3 className="text-lg font-bold text-red-900 mb-1">🚫 Servicios Suspendidos</h3>
                      <p className="text-red-800 text-sm mb-2">
                        Tus servicios han sido suspendidos por falta de pago después de {billingInfo.tenant.payment_retry_count || 0} intentos fallidos.
                      </p>
                      <p className="text-red-700 text-xs mb-3">
                        Puedes ver tus datos, pero no podrás crear nuevos registros, enviar mensajes o procesar reservas hasta que actualices tu método de pago.
                      </p>
                      <Link
                        href="/settings/billing"
                        className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Ver facturas pendientes
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
                      <h3 className="text-lg font-bold text-yellow-900 mb-1">⚠️ Pago Fallido</h3>
                      <p className="text-yellow-800 text-sm mb-2">
                        No se ha podido procesar el pago de tu suscripción. Intento {billingInfo.tenant.payment_retry_count}/3.
                      </p>
                      <p className="text-yellow-700 text-xs mb-3">
                        Si no actualizas tu método de pago, se intentará cobrar automáticamente {3 - (billingInfo.tenant.payment_retry_count || 0)} {3 - (billingInfo.tenant.payment_retry_count || 0) === 1 ? 'vez más' : 'veces más'}. 
                        Después de 3 intentos fallidos, los servicios serán suspendidos.
                      </p>
                      <Link
                        href="/settings/billing"
                        className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
                      >
                        Actualizar método de pago
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
                      <h3 className="text-lg font-bold text-blue-900 mb-1">📋 Facturas Pendientes</h3>
                      <p className="text-blue-800 text-sm mb-3">
                        Tienes {billingInfo.pending_invoices.length} {billingInfo.pending_invoices.length === 1 ? 'factura pendiente' : 'facturas pendientes'} de pago.
                      </p>
                      <Link
                        href="/settings/billing"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Ver facturas pendientes
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
                      <span className="font-medium">{section.name}</span>
                    </Link>
                  );
                })}
              </nav>
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

