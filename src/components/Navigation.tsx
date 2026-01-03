'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Bed, Calendar, Users, Settings, Menu, X, TrendingUp, FileText, Download, Shield, Calculator, Send, MessageSquare, Receipt, Crown, Target } from 'lucide-react';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

const PWAInstallButton = dynamic(() => import('./PWAInstallButton'), { ssr: false });

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

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

  // Menú de Tenant (normal)
  const tenantNavigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Reservas', href: '/reservations', icon: Calendar },
    { name: 'Reservas Directas', href: '/admin/direct-reservations', icon: Calendar },
    { name: 'Calendario', href: '/calendar', icon: Calendar },
    { name: 'Registros de formularios', href: '/guest-registrations-dashboard', icon: Users },
    { name: 'Facturas', href: '/facturas', icon: Receipt },
    { name: 'Estado Envíos MIR', href: '/admin/mir-comunicaciones', icon: TrendingUp },
    { name: 'Asistente IA (Telegram)', href: '/telegram-assistant', icon: MessageSquare },
    { name: 'Calculadora de Costos', href: '/cost-calculator', icon: Calculator },
    { name: 'Exportar AEAT', href: '/aeat', icon: FileText },
    { name: 'Cola offline', href: '/offline-queue', icon: Download },
    { name: 'Bitácora', href: '/audit', icon: Shield },
    { name: 'Configuración', href: '/settings', icon: Settings },
  ];

  // Menú de SuperAdmin
  const superAdminNavigation = [
    { name: 'Dashboard SuperAdmin', href: '/superadmin', icon: Crown },
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
            <Link href="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl mr-2">🐬</span>
              <span className="text-xl font-bold text-gray-900">Delfín Check-in</span>
            </Link>
          </div>
          {/* Botón de menú (visible en móvil y escritorio) */}
          <div className="flex items-center">
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
              <span className="hidden md:inline ml-2 font-medium">Menú</span>
            </button>
          </div>
        </div>
      </div>

      {/* Menú desplegable adaptativo (alto de pantalla y scroll) */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 bottom-0 bg-white border-t shadow overflow-y-auto">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
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
                    Ver Mi Panel Tenant
                  </>
                ) : (
                  <>
                    <Crown className="w-5 h-5 mr-3" />
                    👑 SuperAdmin Dashboard
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
