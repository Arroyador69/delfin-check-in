export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 shadow-lg w-full mt-auto">
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
                <svg className="h-4 w-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                contacto@delfincheckin.com
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <svg className="h-4 w-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                Lun-Dom: 9:00-22:00
              </div>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Legal</h3>
            <div className="space-y-1">
              <a href="/legal/privacy" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                Política de Privacidad
              </a>
              <a href="/legal/cookies" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                Política de Cookies
              </a>
              <a href="/legal/terms" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                Términos de Servicio
              </a>
              <a href="/legal/notice" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                Aviso Legal
              </a>
              <a href="/legal/cookies" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                Gestionar Cookies
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 pt-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              © 2025 Delfín Check-in ·{' '}
              <a href="https://delfincheckin.com" className="text-blue-600 hover:text-blue-800 underline">
                Ver precios
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

