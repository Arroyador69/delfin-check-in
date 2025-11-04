'use client';

import { useEffect } from 'react';

export default function CookiesRedirect() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.replace('https://delfincheckin.com/politica-cookies.html');
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border-2 border-green-200 animate-fade-in">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>
            🍪
          </div>
          <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Política de Cookies
          </h1>
          <p className="text-gray-600 mb-6">
            Redirigiendo a la Política de Cookies...
          </p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Si no eres redirigido automáticamente,{' '}
            <a 
              href="https://delfincheckin.com/politica-cookies.html" 
              className="text-green-600 hover:text-emerald-600 font-semibold underline transition-colors duration-200"
            >
              haz clic aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}


