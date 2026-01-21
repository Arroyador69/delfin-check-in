'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-200 p-8 sm:p-12">
          <div className="text-9xl mb-6">🔍</div>
          <h1 className="text-4xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Página No Encontrada
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Lo sentimos, la página que buscas no existe o ha sido movida.
          </p>
          <Link
            href="/"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Volver al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
