'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  Calendar, 
  Settings, 
  Home, 
  Users, 
  CreditCard,
  BarChart3,
  LogOut
} from 'lucide-react';

interface AdminNavigationProps {
  onLogout: () => void;
}

export default function AdminNavigation({ onLogout }: AdminNavigationProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: BarChart3,
      current: pathname === '/admin'
    },
    {
      name: 'Calendario',
      href: '/calendar',
      icon: Calendar,
      current: pathname === '/calendar'
    },
    {
      name: 'Reservas Directas',
      href: '/admin/direct-reservations',
      icon: Calendar,
      current: pathname === '/admin/direct-reservations'
    },
    {
      name: 'Comunicaciones MIR',
      href: '/admin/mir-comunicaciones',
      icon: FileText,
      current: pathname === '/admin/mir-comunicaciones'
    },
    {
      name: 'Propiedades',
      href: '/settings/properties',
      icon: Home,
      current: pathname === '/settings/properties'
    },
    {
      name: 'Configuración',
      href: '/settings',
      icon: Settings,
      current: pathname.startsWith('/settings')
    },
    {
      name: 'Facturación',
      href: '/settings/billing',
      icon: CreditCard,
      current: pathname === '/settings/billing'
    }
  ];

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        >
          <span className="sr-only">Abrir menú principal</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 bg-white border-r border-gray-200">
            {/* Logo */}
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <div className="text-2xl mr-2">🐬</div>
                <h1 className="text-xl font-bold text-gray-900">Delfin Check-in</h1>
              </div>
              
              {/* Navigation */}
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`${
                        item.current
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-2 py-2 text-sm font-medium border-l-4`}
                    >
                      <Icon
                        className={`${
                          item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                        } mr-3 flex-shrink-0 h-5 w-5`}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Logout button */}
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <button
                onClick={onLogout}
                className="flex-shrink-0 w-full group flex items-center px-2 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
              >
                <LogOut className="mr-3 flex-shrink-0 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {isOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 flex z-40">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsOpen(false)} />
            <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
              <div className="absolute top-0 right-0 -mr-12 pt-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                >
                  <span className="sr-only">Cerrar sidebar</span>
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
                <div className="flex-shrink-0 flex items-center px-4">
                  <div className="text-2xl mr-2">🐬</div>
                  <h1 className="text-xl font-bold text-gray-900">Delfin Check-in</h1>
                </div>
                <nav className="mt-5 px-2 space-y-1">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`${
                          item.current
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        } group flex items-center px-2 py-2 text-base font-medium border-l-4`}
                      >
                        <Icon
                          className={`${
                            item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                          } mr-4 flex-shrink-0 h-6 w-6`}
                        />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>
              
              <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                <button
                  onClick={() => {
                    onLogout();
                    setIsOpen(false);
                  }}
                  className="flex-shrink-0 w-full group flex items-center px-2 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                >
                  <LogOut className="mr-4 flex-shrink-0 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


