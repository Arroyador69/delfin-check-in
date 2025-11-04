'use client';

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 border-2 border-green-200">
          <div className="text-center">
            <div className="text-5xl mb-4" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>
              🍪
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Política de Cookies
            </h1>
            <p className="text-gray-500 italic">Última actualización: <strong>Diciembre 2024</strong></p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Section 1 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-green-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>1️⃣</span>
              ¿Qué son las cookies?
            </h2>
            <p className="text-gray-700">Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas nuestro sitio web. Nos ayudan a mejorar tu experiencia de navegación y a entender cómo utilizas nuestro sitio.</p>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-blue-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>2️⃣</span>
              Tipos de cookies que utilizamos
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <th className="border-2 border-blue-200 p-3 text-left font-semibold text-gray-800">Tipo</th>
                    <th className="border-2 border-blue-200 p-3 text-left font-semibold text-gray-800">Propósito</th>
                    <th className="border-2 border-blue-200 p-3 text-left font-semibold text-gray-800">Duración</th>
                    <th className="border-2 border-blue-200 p-3 text-left font-semibold text-gray-800">Obligatorio</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white hover:bg-green-50 transition-colors">
                    <td className="border-2 border-green-200 p-3 text-gray-700 font-medium">Cookies técnicas/necesarias</td>
                    <td className="border-2 border-green-200 p-3 text-gray-700">Funcionamiento básico del sitio, preferencias de idioma, consentimiento de cookies</td>
                    <td className="border-2 border-green-200 p-3 text-gray-700">1 año</td>
                    <td className="border-2 border-green-200 p-3 text-green-600 font-semibold">Sí</td>
                  </tr>
                  <tr className="bg-white hover:bg-blue-50 transition-colors">
                    <td className="border-2 border-blue-200 p-3 text-gray-700 font-medium">Cookies de rendimiento/analíticas</td>
                    <td className="border-2 border-blue-200 p-3 text-gray-700">Análisis de tráfico, páginas más visitadas, tiempo de permanencia</td>
                    <td className="border-2 border-blue-200 p-3 text-gray-700">2 años</td>
                    <td className="border-2 border-blue-200 p-3 text-orange-600 font-semibold">No</td>
                  </tr>
                  <tr className="bg-white hover:bg-purple-50 transition-colors">
                    <td className="border-2 border-purple-200 p-3 text-gray-700 font-medium">Cookies de funcionalidad</td>
                    <td className="border-2 border-purple-200 p-3 text-gray-700">Recordar preferencias del usuario, personalización de la experiencia</td>
                    <td className="border-2 border-purple-200 p-3 text-gray-700">6 meses</td>
                    <td className="border-2 border-purple-200 p-3 text-orange-600 font-semibold">No</td>
                  </tr>
                  <tr className="bg-white hover:bg-pink-50 transition-colors">
                    <td className="border-2 border-pink-200 p-3 text-gray-700 font-medium">Cookies de marketing</td>
                    <td className="border-2 border-pink-200 p-3 text-gray-700">Publicidad personalizada, seguimiento de conversiones</td>
                    <td className="border-2 border-pink-200 p-3 text-gray-700">1 año</td>
                    <td className="border-2 border-pink-200 p-3 text-orange-600 font-semibold">No</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-purple-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>3️⃣</span>
              Cookies específicas que utilizamos
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">3.1 Cookies propias (primera parte)</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li><strong>cookiesConsent:</strong> Almacena tu preferencia sobre el uso de cookies (1 año)</li>
                  <li><strong>languagePreference:</strong> Recuerda tu idioma preferido (6 meses)</li>
                  <li><strong>userPreferences:</strong> Configuraciones personalizadas del usuario (3 meses)</li>
                </ul>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">3.2 Cookies de terceros</h3>
                <p className="mb-2 text-gray-700">Actualmente no utilizamos cookies de terceros, pero podríamos implementar en el futuro:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li><strong>Google Analytics:</strong> Para análisis de tráfico web</li>
                  <li><strong>Google Tag Manager:</strong> Para gestión de etiquetas</li>
                  <li><strong>Facebook Pixel:</strong> Para seguimiento de conversiones</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl shadow-lg p-6 text-white border-2 border-green-700">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>4️⃣</span>
              Base legal para el uso de cookies
            </h2>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm space-y-2">
              <p><strong>Cookies técnicas:</strong> Interés legítimo (funcionamiento del sitio)</p>
              <p><strong>Cookies analíticas:</strong> Consentimiento explícito del usuario</p>
              <p><strong>Cookies de marketing:</strong> Consentimiento explícito del usuario</p>
            </div>
          </div>

          {/* Section 5 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-orange-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>5️⃣</span>
              Cómo gestionar las cookies
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">5.1 A través de nuestro sitio web</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Utiliza el banner de cookies que aparece en tu primera visita</li>
                  <li>Accede a la configuración de cookies en el footer</li>
                  <li>Modifica tus preferencias en cualquier momento</li>
                </ul>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">5.2 A través de tu navegador</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li><strong>Chrome:</strong> Configuración &gt; Privacidad y seguridad &gt; Cookies</li>
                  <li><strong>Firefox:</strong> Opciones &gt; Privacidad y seguridad &gt; Cookies</li>
                  <li><strong>Safari:</strong> Preferencias &gt; Privacidad &gt; Cookies</li>
                  <li><strong>Edge:</strong> Configuración &gt; Cookies y permisos de sitio</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 6 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-yellow-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-yellow-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>6️⃣</span>
              Consecuencias de desactivar cookies
            </h2>
            <p className="mb-3 text-gray-700">Si desactivas las cookies:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>✅ El sitio web seguirá funcionando correctamente</li>
              <li>❌ No podremos recordar tus preferencias</li>
              <li>❌ No podremos analizar el rendimiento del sitio</li>
              <li>❌ Algunas funcionalidades podrían verse limitadas</li>
            </ul>
          </div>

          {/* Section 7 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-indigo-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-indigo-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>7️⃣</span>
              Transferencias internacionales
            </h2>
            <p className="text-gray-700">Algunos de nuestros proveedores de servicios pueden estar ubicados fuera del Espacio Económico Europeo (EEE). En estos casos, garantizamos que se aplican las salvaguardias adecuadas según el RGPD.</p>
          </div>

          {/* Section 8 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-purple-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>8️⃣</span>
              Tus derechos
            </h2>
            <p className="mb-3 text-gray-700">Según el RGPD, tienes derecho a:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Acceder a tus datos personales</li>
              <li>Rectificar datos inexactos</li>
              <li>Solicitar la supresión de tus datos</li>
              <li>Limitar el tratamiento de tus datos</li>
              <li>Portabilidad de datos</li>
              <li>Oponerte al tratamiento</li>
              <li>Retirar tu consentimiento en cualquier momento</li>
            </ul>
          </div>

          {/* Section 9 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-blue-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>9️⃣</span>
              Contacto
            </h2>
            <p className="mb-3 text-gray-700">Para ejercer tus derechos o resolver dudas sobre cookies:</p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <p className="text-gray-700"><strong>📧 Email:</strong> contacto@delfincheckin.com<br />
              <strong>📍 Dirección:</strong> Málaga, España</p>
            </div>
          </div>

          {/* Section 10 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-green-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🔟</span>
              Cambios en esta política
            </h2>
            <p className="text-gray-700">Nos reservamos el derecho de modificar esta política de cookies. Los cambios se publicarán en esta página y, si son significativos, te notificaremos a través del sitio web.</p>
          </div>
        </div>
      </div>
    </div>
  );
}


