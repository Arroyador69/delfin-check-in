'use client';

import Link from 'next/link';
import { Mail, Clock } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {/* Delfín Check-in */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delfín Check-in</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Software de gestión hotelera y auto check-in para hostales y apartamentos.
            </p>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Contacto</h3>
            <div className="space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 text-blue-500 mr-2" />
                contacto@delfincheckin.com
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 text-gray-400 mr-2" />
                Lun-Dom: 9:00-22:00
              </div>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Legal</h3>
            <div className="space-y-1">
              <Link href="/legal/privacy" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                Política de Privacidad
              </Link>
              <Link href="/legal/cookies" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                Política de Cookies
              </Link>
              <Link href="/legal/terms" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                Términos de Servicio
              </Link>
              <Link href="/legal/notice" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                Aviso Legal
              </Link>
              <Link href="/legal/cookies" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                Gestionar Cookies
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 pt-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              © 2025 Delfín Check-in ·{' '}
              <Link href="https://delfincheckin.com" className="text-blue-600 hover:text-blue-800 underline">
                Ver precios
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
