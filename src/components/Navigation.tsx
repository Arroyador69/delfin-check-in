'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isOnboardingPath } from '@/lib/onboarding-route';
import { Home, Bed, Calendar, Users, Settings, Menu, X, TrendingUp, FileText, Download, Shield, Calculator, Send, Receipt, Crown, Target, UserPlus, BarChart3, LifeBuoy, Star, MousePointerClick, Megaphone } from 'lucide-react';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTenant, hasLegalModule, isFreePlanMirPreview, isProPlanTenant } from '@/hooks/useTenant';
import { useClientTranslations } from '@/hooks/useClientTranslations';
import LanguageSwitcher from './LanguageSwitcher';
import { locales, defaultLocale, type Locale } from '@/i18n/config';
import { isMarketIntelligenceEnabled } from '@/lib/feature-flags';
import UnifiedTenantBell from '@/components/UnifiedTenantBell';

function getLocaleFromPathname(pathname: string): Locale {
  const segment = pathname.split('/').filter(Boolean)[0];
  if (segment && (locales as readonly string[]).includes(segment)) return segment as Locale;
  return defaultLocale;
}

const PWAInstallButton = dynamic(() => import('./PWAInstallButton'), { ssr: false });
const AdMenu = dynamic(() => import('./AdMenu'), { ssr: false });

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const { tenant } = useTenant();
  // Usamos siempre el mismo hook (client translations) para evitar variaciones de hooks
  // entre rutas con/sin provider y entre renders.
  const t = useClientTranslations('navigation');
  const tc = t;

  useEffect(() => {
    // En onboarding no necesitamos cargar /api/auth/me
    if (pathname?.includes('/onboarding')) return;

    // Obtener información del usuario para saber si es superadmin
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.isPlatformAdmin) {
          setIsPlatformAdmin(true);
        }
      })
      .catch(err => console.error('Error fetching user:', err));
  }, [pathname]);

  // Cerrar menú al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Bloquear scroll del body mientras el menú móvil está abierto (evita scroll fantasma en iOS)
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, [mobileMenuOpen]);

  // En onboarding el propio asistente incluye cabecera y selector de idioma (misma UX móvil y escritorio).
  if (isOnboardingPath(pathname)) {
    return null;
  }

  const locale = getLocaleFromPathname(pathname ?? '');

  // Menú de Tenant; enlaces con prefijo de idioma (/es/dashboard, /en/reservations...)
  const allTenantNavigation = [
    { name: t('dashboard'), href: '/dashboard', icon: Home, requiresLegal: false },
    { name: t('reservations'), href: '/reservations', icon: Calendar, requiresLegal: false },
    { name: t('directReservations'), href: '/admin/direct-reservations', icon: Calendar, requiresLegal: false },
    {
      name: t('reputationGoogle'),
      href: '/admin/reputation-google',
      icon: Star,
      requiresLegal: false,
      proFeature: true,
    },
    { name: t('calendar'), href: '/calendar', icon: Calendar, requiresLegal: false },
    { name: t('guestRegistrations'), href: '/guest-registrations-dashboard', icon: Users, requiresLegal: false },
    { name: t('invoices'), href: '/facturas', icon: Receipt, requiresLegal: false },
    { name: t('mirStatus'), href: '/admin/mir-comunicaciones', icon: TrendingUp, requiresLegal: true },
    { name: t('costCalculator'), href: '/cost-calculator', icon: Calculator, requiresLegal: false },
    { name: t('exportAEAT'), href: '/aeat', icon: FileText, requiresLegal: false },
    { name: t('offlineQueue'), href: '/offline-queue', icon: Download, requiresLegal: false },
    { name: t('audit'), href: '/audit', icon: Shield, requiresLegal: false },
    ...(isMarketIntelligenceEnabled()
      ? [{ name: t('marketIntelligence'), href: '/market-intelligence', icon: BarChart3, requiresLegal: false }]
      : []),
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
      if (hasLegalModule(tenant)) return true;
      if (tenant && isFreePlanMirPreview(tenant)) return true;
      return false;
    }
    return true;
  });

  // SuperAdmin: textos según preferred-locale (localStorage), como /superadmin sin prefijo de idioma
  const superAdminNavigation = [
    { name: tc('superAdminDashboard'), href: '/superadmin', icon: Crown },
    { name: tc('metrics'), href: '/superadmin/metrics', icon: TrendingUp },
    { name: tc('affiliates'), href: '/superadmin/affiliates', icon: Users },
    { name: tc('amazonAffiliateClicks'), href: '/superadmin/amazon-affiliate-clicks', icon: MousePointerClick },
    { name: tc('referrals'), href: '/superadmin/referrals', icon: Users },
    { name: tc('emails'), href: '/superadmin/emails', icon: FileText },
    { name: 'Secuencias lifecycle', href: '/superadmin/email-sequences', icon: FileText },
    { name: tc('investorMode'), href: '/superadmin/investor-mode', icon: Target },
    { name: tc('tenants'), href: '/superadmin/tenants', icon: Users },
    { name: tc('analytics'), href: '/superadmin/analytics', icon: TrendingUp },
    { name: tc('programmaticPages'), href: '/superadmin/programmatic', icon: FileText },
    { name: tc('radarReach'), href: '/superadmin/radar-reach', icon: Target },
    { name: tc('productUpdates'), href: '/superadmin/updates', icon: Megaphone },
    { name: tc('customerSupport'), href: '/superadmin/support', icon: LifeBuoy },
    // Superadmin es solo tuyo → texto fijo en español y rutas separadas.
    { name: 'Logs (Vercel)', href: '/superadmin/logs', icon: Shield },
    { name: 'Errores (Sentry)', href: '/superadmin/sentry', icon: Shield },
  ];

  const isInSuperAdmin = pathname?.startsWith('/superadmin');
  const navigation = isInSuperAdmin && isPlatformAdmin ? superAdminNavigation : tenantNavigation;
  const prefix = isInSuperAdmin ? '' : `/${locale}`;

  return (
    <nav className="bg-white shadow-lg fixed w-full top-0 z-50 pt-[env(safe-area-inset-top)]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 h-16 min-w-0">
          <div className="flex items-center min-w-0 flex-1">
            <Link
              href={isInSuperAdmin ? '/superadmin' : `/${locale}/dashboard`}
              className="flex items-center min-w-0 gap-1.5 sm:gap-2"
            >
              <span className="text-2xl shrink-0 leading-none">🐬</span>
              <span className="text-base sm:text-xl font-bold text-gray-900 truncate hidden min-[400px]:inline">
                Delfín Check-in
              </span>
            </Link>
          </div>
          {/* Acciones de cabecera: campana, idioma, menú */}
          <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
            {!isInSuperAdmin && <UnifiedTenantBell />}
            <LanguageSwitcher />
            <PWAInstallButton />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 focus:outline-none sm:ml-1"
              aria-label={mobileMenuOpen ? t('closeMenu') : t('menu')}
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

      {/* Menú desplegable: scroll propio y anuncio de afiliados al final (planes free/checkin) */}
      {mobileMenuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/20"
            aria-label={t('closeMenu')}
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] bottom-0 z-50 flex flex-col bg-white border-t shadow"
            role="dialog"
            aria-modal="true"
            aria-label={t('menu')}
          >
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [-webkit-overflow-scrolling:touch]">
              <div className="px-2 pt-2 pb-[max(5.5rem,calc(1.5rem+env(safe-area-inset-bottom)))] space-y-1 sm:px-3">
                {navigation.map((item) => {
                  const fullHref = prefix ? `${prefix}${item.href}` : item.href;
                  const isActive = pathname === fullHref;
                  return (
                    <Link
                      key={item.name}
                      href={fullHref}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-3 py-2.5 rounded-md text-base font-medium transition-colors min-h-[44px] ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                      <span className="flex items-center gap-2 flex-wrap">
                        {item.name}
                        {'proFeature' in item &&
                        item.proFeature &&
                        tenant &&
                        !isPlatformAdmin &&
                        !isProPlanTenant(tenant) ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                            Pro
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  );
                })}

                {isPlatformAdmin ? (
                  <Link
                    href={isInSuperAdmin ? '/' : '/superadmin'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-3 py-2.5 rounded-md text-base font-medium transition-colors border-t border-gray-200 mt-2 pt-3 min-h-[44px] ${
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
                ) : null}

                {/* Anuncio al final: no bloquea el acceso a las secciones del menú */}
                <div className="mt-3 border-t border-gray-100 pt-2">
                  <AdMenu />
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </nav>
  );
}
