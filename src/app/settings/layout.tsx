'use client';

import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, FileText, CreditCard, User, LinkIcon, Home, Calendar, Wallet } from 'lucide-react';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

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
      id: 'account',
      name: 'Cuenta',
      icon: User,
      href: '/settings/account',
    },
  ];

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

