export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-t-2 border-blue-200 shadow-xl w-full mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {/* Delfín Check-in */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🐬</span>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Delfín Check-in
              </span>
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Software de gestión hotelera y auto check-in para hostales y apartamentos.
            </p>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center">
              <span className="text-xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📧</span>
              Contacto
            </h3>
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
          <div className="bg-white rounded-xl p-4 border-2 border-blue-200 shadow-md">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
              <span className="text-xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>⚖️</span>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Legal
              </span>
            </h3>
            <div className="space-y-2">
              <a 
                href="/legal/privacy" 
                className="block text-sm font-semibold text-gray-700 hover:text-blue-600 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 px-3 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 border border-blue-200 hover:border-blue-400"
              >
                <span className="text-base mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🔒</span>
                Política de Privacidad
              </a>
              <a 
                href="/legal/cookies" 
                className="block text-sm font-semibold text-gray-700 hover:text-blue-600 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 px-3 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 border border-green-200 hover:border-green-400"
              >
                <span className="text-base mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🍪</span>
                Política de Cookies
              </a>
              <a 
                href="/legal/terms" 
                className="block text-sm font-semibold text-gray-700 hover:text-blue-600 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 px-3 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 border border-purple-200 hover:border-purple-400"
              >
                <span className="text-base mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📜</span>
                Términos de Servicio
              </a>
              <a 
                href="/legal/notice" 
                className="block text-sm font-semibold text-gray-700 hover:text-blue-600 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 px-3 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 border border-orange-200 hover:border-orange-400"
              >
                <span className="text-base mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📋</span>
                Aviso Legal
              </a>
              <a 
                href="/legal/cookies" 
                className="block text-sm font-semibold text-gray-700 hover:text-blue-600 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 px-3 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 border border-indigo-200 hover:border-indigo-400"
              >
                <span className="text-base mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>⚙️</span>
                Gestionar Cookies
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t-2 border-blue-200 pt-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">
              © 2025 Delfín Check-in 🐬{' '}
              <a href="https://delfincheckin.com" className="text-blue-600 hover:text-blue-800 underline font-semibold transition-all duration-200 hover:text-purple-600">
                Ver precios
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

