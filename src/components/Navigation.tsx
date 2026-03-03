'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bed, Calendar, Users, Settings, Menu, X, TrendingUp, FileText, Download, Shield, Calculator, Send, Receipt, Crown, Target, UserPlus } from 'lucide-react';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTenant, hasLegalModule } from '@/hooks/useTenant';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from './LanguageSwitcher';

const PWAInstallButton = dynamic(() => import('./PWAInstallButton'), { ssr: false });
const AdMenu = dynamic(() => import('./AdMenu'), { ssr: false });

// Hook seguro que no falla si no hay provider
function useSafeTranslations(namespace: string) {
  // Textos hardcoded en español para cuando NO hay provider de i18n
  const fallbackTexts: Record<string, string> = {
    'dashboard': 'Dashboard',
    'reservations': 'Reservas',
    'directReservations': 'Reservas Directas',
    'calendar': 'Calendario',
    'guestRegistrations': 'Registros de formularios',
    'invoices': 'Facturas',
    'mirStatus': 'Estado Envíos MIR',
    'costCalculator': 'Calculadora de Costos',
    'exportAEAT': 'Exportar AEAT',
    'offlineQueue': 'Cola offline',
    'audit': 'Bitácora',
    'referrals': 'Referidos',
    'settings': 'Configuración',
    'superAdminDashboardTitle': '👑 SuperAdmin Dashboard',
    'logout': 'Cerrar Sesión',
  };
  
  try {
    return useTranslations(namespace);
  } catch (error) {
    // Si no hay provider, devolver función que retorna texto en español
    console.log("ℹ️ [Navigation] Sin provider i18n, usando textos en español");
    return (key: string) => fallbackTexts[key] || key;
  }
}

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const { tenant } = useTenant();
  const t = useSafeTranslations('navigation');

  useEffect(() => {
    // Obtener información del usuario para saber si es superadmin
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.isPlatformAdmin) {
          setIsPlatformAdmin(true);
        }
      })
      .catch(err => console.error('Error fetching user:', err));
  }, []);

  // Menú de Tenant. Dashboard en /dashboard (protegido por middleware como /reservations)
  const allTenantNavigation = [
    { name: t('dashboard'), href: '/dashboard', icon: Home, requiresLegal: false },
    { name: t('reservations'), href: '/reservations', icon: Calendar, requiresLegal: false },
    { name: t('directReservations'), href: '/admin/direct-reservations', icon: Calendar, requiresLegal: false },
    { name: t('calendar'), href: '/calendar', icon: Calendar, requiresLegal: false },
    { name: t('guestRegistrations'), href: '/guest-registrations-dashboard', icon: Users, requiresLegal: true },
    { name: t('invoices'), href: '/facturas', icon: Receipt, requiresLegal: false },
    { name: t('mirStatus'), href: '/admin/mir-comunicaciones', icon: TrendingUp, requiresLegal: true },
    { name: t('costCalculator'), href: '/cost-calculator', icon: Calculator, requiresLegal: false },
    { name: t('exportAEAT'), href: '/aeat', icon: FileText, requiresLegal: false },
    { name: t('offlineQueue'), href: '/offline-queue', icon: Download, requiresLegal: false },
    { name: t('audit'), href: '/audit', icon: Shield, requiresLegal: false },
    { name: t('referrals'), href: '/referrals', icon: UserPlus, requiresLegal: false },
    { name: t('settings'), href: '/settings', icon: Settings, requiresLegal: false },
  ];

  // Filtrar elementos según permisos del plan
  // IMPORTANTE: Superadmins SIEMPRE ven todos los elementos, sin importar el plan
  const tenantNavigation = allTenantNavigation.filter(item => {
    // Si es superadmin, mostrar TODO
    if (isPlatformAdmin) {
      return true;
    }
    // Para usuarios normales, aplicar filtros según plan
    if (item.requiresLegal) {
      return hasLegalModule(tenant);
    }
    return true;
  });

  // Menú de SuperAdmin (NO traducir - siempre en español)
  const superAdminNavigation = [
    { name: 'Dashboard SuperAdmin', href: '/superadmin', icon: Crown },
    { name: 'Métricas', href: '/superadmin/metrics', icon: TrendingUp },
    { name: 'Afiliados', href: '/superadmin/affiliates', icon: Users },
    { name: 'Referidos', href: '/superadmin/referrals', icon: Users },
    { name: 'Emails', href: '/superadmin/emails', icon: FileText },
    { name: 'Investor Mode', href: '/superadmin/investor-mode', icon: Target },
    { name: 'Tenants', href: '/superadmin/tenants', icon: Users },
    { name: 'Analytics', href: '/superadmin/analytics', icon: TrendingUp },
    { name: 'Páginas Programáticas', href: '/superadmin/programmatic', icon: FileText },
    { name: 'Radar Reach', href: '/superadmin/radar-reach', icon: Target },
    { name: 'Logs', href: '/superadmin/logs', icon: Shield },
  ];

  // Decidir qué menú mostrar
  const isInSuperAdmin = pathname.startsWith('/superadmin');
  const navigation = isInSuperAdmin && isPlatformAdmin ? superAdminNavigation : tenantNavigation;

  return (
    <nav className="bg-white shadow-lg fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0 flex items-center">
              <span className="text-2xl mr-2">🐬</span>
              <span className="text-xl font-bold text-gray-900">Delfín Check-in</span>
            </Link>
          </div>
          {/* Botón de menú (visible en móvil y escritorio) */}
          <div className="flex items-center space-x-2">
            <LanguageSwitcher />
            <PWAInstallButton />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="ml-4 inline-flex items-center px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 focus:outline-none"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
              <span className="hidden md:inline ml-2 font-medium">{t('menu')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Menú desplegable adaptativo (alto de pantalla y scroll) */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 bottom-0 bg-white border-t shadow overflow-y-auto">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {/* Anuncio en el menú - arriba */}
            <AdMenu />
            
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
            
            {/* Botón para cambiar entre modos (solo si es superadmin) */}
            {isPlatformAdmin && (
              <Link
                href={isInSuperAdmin ? "/" : "/superadmin"}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors border-t border-gray-200 mt-2 pt-3 ${
                  isInSuperAdmin 
                    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-50' 
                    : 'text-purple-600 hover:text-purple-900 hover:bg-purple-50'
                }`}
              >
                {isInSuperAdmin ? (
                  <>
                    <Home className="w-5 h-5 mr-3" />
                    {t('viewMyTenantPanel')}
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5 mr-3" />
                    {t('superAdminDashboardTitle')}
                  </>
                )}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
