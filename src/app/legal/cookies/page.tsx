'use client';

export default function CookiesPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-6 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center">
            🍪 Política de Cookies
          </h1>
        </div>

        {/* Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-8 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <p className="text-gray-600 italic mb-8">Última actualización: <strong>Diciembre 2024</strong></p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">1. ¿Qué son las cookies?</h2>
              <p className="text-gray-700 leading-relaxed">
                Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas nuestro sitio web. 
                Nos ayudan a mejorar tu experiencia de navegación y a entender cómo utilizas nuestro sitio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">2. Tipos de cookies que utilizamos</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 p-4 text-left font-semibold">Tipo</th>
                      <th className="border border-gray-300 p-4 text-left font-semibold">Finalidad</th>
                      <th className="border border-gray-300 p-4 text-left font-semibold">Duración</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-4">
                        <span className="font-semibold text-blue-600">Cookies Técnicas</span>
                      </td>
                      <td className="border border-gray-300 p-4">Funcionamiento básico del sitio web</td>
                      <td className="border border-gray-300 p-4">Sesión</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-300 p-4">
                        <span className="font-semibold text-green-600">Cookies de Autenticación</span>
                      </td>
                      <td className="border border-gray-300 p-4">Mantener la sesión del usuario</td>
                      <td className="border border-gray-300 p-4">30 días</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-4">
                        <span className="font-semibold text-purple-600">Cookies de Análisis</span>
                      </td>
                      <td className="border border-gray-300 p-4">Estadísticas de uso y rendimiento</td>
                      <td className="border border-gray-300 p-4">2 años</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">3. Cookies específicas que utilizamos</h2>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-sm">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-200 p-2 rounded-lg">
                      <span className="text-blue-700 text-lg">🔐</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-blue-800 mb-2">auth_token</h3>
                      <p className="text-sm text-gray-700 mb-2">Cookie de autenticación para mantener la sesión del usuario logueado</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">Duración: 30 días</span>
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">Tipo: Técnica necesaria</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-sm">
                  <div className="flex items-start space-x-3">
                    <div className="bg-green-200 p-2 rounded-lg">
                      <span className="text-green-700 text-lg">⚙️</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-green-800 mb-2">user_preferences</h3>
                      <p className="text-sm text-gray-700 mb-2">Almacena preferencias del usuario como tema, idioma, etc.</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Duración: 1 año</span>
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">Tipo: Funcional</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-sm">
                  <div className="flex items-start space-x-3">
                    <div className="bg-purple-200 p-2 rounded-lg">
                      <span className="text-purple-700 text-lg">📊</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-purple-800 mb-2">analytics_session</h3>
                      <p className="text-sm text-gray-700 mb-2">Recopila información anónima sobre el uso del sitio web</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">Duración: Sesión</span>
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">Tipo: Análisis</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">4. Gestión de cookies</h2>
              <p className="text-gray-700 mb-4">
                Puedes gestionar las cookies de varias maneras:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Configuración del navegador:</strong> La mayoría de navegadores permiten gestionar las cookies</li>
                <li><strong>Herramientas de nuestro sitio:</strong> Utiliza nuestro banner de cookies</li>
                <li><strong>Desactivación:</strong> Puedes desactivar las cookies, pero esto puede afectar la funcionalidad</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">5. Cookies de terceros</h2>
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-200 shadow-sm">
                <div className="flex items-start space-x-3">
                  <div className="bg-yellow-200 p-2 rounded-lg">
                    <span className="text-yellow-700 text-lg">⚠️</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-yellow-800 mb-2">Importante</h3>
                    <p className="text-gray-700 mb-3">Nuestro sitio web puede contener cookies de terceros como:</p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">📊</span>
                        <span className="text-gray-700 text-sm">Google Analytics (análisis web)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">💳</span>
                        <span className="text-gray-700 text-sm">Stripe (procesamiento de pagos)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">📱</span>
                        <span className="text-gray-700 text-sm">Redes sociales (botones de compartir)</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-3 p-2 bg-gray-50 rounded-lg">
                      Estas cookies están sujetas a las políticas de privacidad de sus respectivos proveedores.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">6. Actualizaciones</h2>
              <p className="text-gray-700">
                Esta política de cookies puede actualizarse periódicamente. Te recomendamos revisarla regularmente 
                para estar informado sobre cómo utilizamos las cookies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">7. Contacto</h2>
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <p className="text-gray-700">
                  Si tienes preguntas sobre nuestra política de cookies, puedes contactarnos en: 
                  <strong> contacto@delfincheckin.com</strong>
                </p>
              </div>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <a 
              href="/" 
              className="inline-flex items-center text-blue-600 hover:text-blue-800 font-semibold transition-colors duration-200"
            >
              ← Volver al inicio
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
