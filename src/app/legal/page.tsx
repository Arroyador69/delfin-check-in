'use client';

import Link from 'next/link';
import { Shield, Cookie, FileText, Scale } from 'lucide-react';

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center">
            ⚖️ Información Legal
          </h1>
          <p className="text-gray-600 text-center text-lg">
            Documentos legales y políticas de Delfín Check-in
          </p>
        </div>

        {/* Legal Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Privacy Policy */}
          <Link href="/legal/privacy" className="group">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-8 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] group-hover:border-blue-300">
              <div className="flex items-center mb-4">
                <Shield className="h-8 w-8 text-blue-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">Política de Privacidad</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Información sobre cómo recopilamos, utilizamos y protegemos tus datos personales 
                de acuerdo con el RGPD y la normativa española.
              </p>
              <div className="text-blue-600 font-semibold group-hover:text-blue-800 transition-colors">
                Leer más →
              </div>
            </div>
          </Link>

          {/* Cookies Policy */}
          <Link href="/legal/cookies" className="group">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-8 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] group-hover:border-green-300">
              <div className="flex items-center mb-4">
                <Cookie className="h-8 w-8 text-green-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">Política de Cookies</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Información detallada sobre el uso de cookies y tecnologías similares 
                en nuestro sitio web y cómo gestionarlas.
              </p>
              <div className="text-green-600 font-semibold group-hover:text-green-800 transition-colors">
                Leer más →
              </div>
            </div>
          </Link>

          {/* Terms of Service */}
          <Link href="/legal/terms" className="group">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-8 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] group-hover:border-purple-300">
              <div className="flex items-center mb-4">
                <FileText className="h-8 w-8 text-purple-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">Términos de Servicio</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Condiciones de uso del servicio Delfín Check-in, incluyendo derechos, 
                obligaciones y limitaciones de responsabilidad.
              </p>
              <div className="text-purple-600 font-semibold group-hover:text-purple-800 transition-colors">
                Leer más →
              </div>
            </div>
          </Link>

          {/* Legal Notice */}
          <Link href="/legal/notice" className="group">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-8 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] group-hover:border-indigo-300">
              <div className="flex items-center mb-4">
                <Scale className="h-8 w-8 text-indigo-600 mr-3" />
                <h2 className="text-xl font-bold text-gray-900">Aviso Legal</h2>
              </div>
              <p className="text-gray-600 mb-4">
                Información corporativa, condiciones de acceso y uso del sitio web, 
                propiedad intelectual y legislación aplicable.
              </p>
              <div className="text-indigo-600 font-semibold group-hover:text-indigo-800 transition-colors">
                Leer más →
              </div>
            </div>
          </Link>
        </div>

        {/* Footer Info */}
        <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-lg">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              📞 ¿Necesitas ayuda?
            </h3>
            <p className="text-gray-700">
              Si tienes alguna pregunta sobre nuestros documentos legales, 
              puedes contactarnos en <strong>contacto@delfincheckin.com</strong>
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-6 text-center">
          <Link 
            href="/" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
