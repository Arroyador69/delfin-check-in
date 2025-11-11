'use client';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 border-2 border-blue-200">
          <div className="text-center">
            <div className="text-5xl mb-4" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>
              🔒
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Política de Privacidad
            </h1>
            <p className="text-gray-500 italic">Última actualización: 27 de octubre de 2023</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Section 1 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-blue-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>1️⃣</span>
              Información del Responsable
            </h2>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200 text-gray-800">
              <p className="leading-relaxed">
                <span className="font-semibold text-gray-900">Delfín Check-in</span>
                <br />
                <span className="inline-flex items-center gap-2">
                  <span role="img" aria-hidden="true">📧</span>
                  Email: contacto@delfincheckin.com
                </span>
                <br />
                <span className="inline-flex items-center gap-2">
                  <span role="img" aria-hidden="true">📍</span>
                  Dirección: Málaga, España
                </span>
              </p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-green-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>2️⃣</span>
              Datos que Recopilamos
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">2.1 Datos de contacto</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Nombre y apellidos</li>
                  <li>Dirección de correo electrónico</li>
                  <li>Nombre de la empresa o alojamiento</li>
                </ul>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">2.2 Datos de uso del servicio</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Información de reservas y huéspedes</li>
                  <li>Datos de registro de viajeros (DNI, pasaporte, fechas de estancia)</li>
                  <li>Información de facturación y pagos</li>
                  <li>Datos de navegación y cookies</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-purple-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>3️⃣</span>
              Finalidad del Tratamiento
            </h2>
            <p className="mb-3 text-gray-700">Utilizamos sus datos personales para:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Prestar el servicio de gestión hotelera y check-in online</li>
              <li>Gestionar reservas y registro de viajeros</li>
              <li>Cumplir con las obligaciones legales del sector turístico</li>
              <li>Procesar pagos y facturación</li>
              <li>Comunicarnos con usted sobre el servicio</li>
              <li>Mejorar nuestros servicios y desarrollar nuevas funcionalidades</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-orange-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>4️⃣</span>
              Base Legal
            </h2>
            <p className="mb-3 text-gray-700">El tratamiento de sus datos se basa en:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>Ejecución del contrato:</strong> Para la prestación del servicio contratado</li>
              <li><strong>Obligación legal:</strong> Cumplimiento de normativas turísticas y fiscales</li>
              <li><strong>Interés legítimo:</strong> Mejora de servicios y comunicación comercial</li>
              <li><strong>Consentimiento:</strong> Para comunicaciones promocionales</li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-yellow-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-yellow-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>5️⃣</span>
              Conservación de Datos
            </h2>
            <p className="mb-3 text-gray-700">Conservaremos sus datos durante:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>Datos de clientes activos:</strong> Durante la vigencia del contrato y 5 años adicionales</li>
              <li><strong>Datos de facturación:</strong> 6 años según normativa fiscal</li>
              <li><strong>Datos de registro de viajeros:</strong> 3 años según normativa turística</li>
              <li><strong>Datos de marketing:</strong> Hasta que retire su consentimiento</li>
            </ul>
          </div>

          {/* Section 6 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-red-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>6️⃣</span>
              Compartir Información
            </h2>
            <p className="mb-3 text-gray-700">Podemos compartir sus datos con:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 mb-4">
              <li><strong>Autoridades competentes:</strong> Ministerio del Interior, Hacienda, etc.</li>
              <li><strong>Proveedores de servicios:</strong> Hosting, email, procesamiento de pagos</li>
              <li><strong>Asesores legales y contables:</strong> Para cumplimiento normativo</li>
            </ul>
            <p className="text-gray-700 font-semibold">No vendemos ni alquilamos sus datos personales a terceros.</p>
          </div>

          {/* Section 7 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-indigo-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-indigo-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>7️⃣</span>
              Sus Derechos
            </h2>
            <p className="mb-3 text-gray-700">Bajo el RGPD, usted tiene derecho a:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>Acceso:</strong> Conocer qué datos tenemos sobre usted</li>
              <li><strong>Rectificación:</strong> Corregir datos inexactos</li>
              <li><strong>Supresión:</strong> Solicitar la eliminación de sus datos</li>
              <li><strong>Limitación:</strong> Restringir el tratamiento</li>
              <li><strong>Portabilidad:</strong> Recibir sus datos en formato estructurado</li>
              <li><strong>Oposición:</strong> Oponerse al tratamiento</li>
            </ul>
          </div>

          {/* Section 8 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-blue-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>8️⃣</span>
              Seguridad
            </h2>
            <p className="mb-3 text-gray-700">Implementamos medidas técnicas y organizativas apropiadas para proteger sus datos:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Cifrado SSL/TLS en todas las comunicaciones</li>
              <li>Acceso restringido a datos personales</li>
              <li>Copias de seguridad regulares</li>
              <li>Formación del personal en protección de datos</li>
            </ul>
          </div>

          {/* Section 9 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-green-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>9️⃣</span>
              Cookies
            </h2>
            <p className="mb-3 text-gray-700">Utilizamos cookies para:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Recordar sus preferencias</li>
              <li>Analizar el uso del sitio web</li>
              <li>Mejorar la funcionalidad</li>
            </ul>
            <p className="mt-3 text-gray-700">Puede gestionar las cookies desde la configuración de su navegador.</p>
          </div>

          {/* Section 10 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-purple-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🔟</span>
              Transferencias Internacionales
            </h2>
            <p className="mb-3 text-gray-700">Algunos de nuestros proveedores pueden estar fuera del EEE. En estos casos, garantizamos un nivel adecuado de protección mediante:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Decisiones de adecuación de la Comisión Europea</li>
              <li>Cláusulas contractuales tipo</li>
              <li>Certificaciones de privacidad</li>
            </ul>
          </div>

          {/* Section 11 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-orange-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>1️⃣1️⃣</span>
              Menores de Edad
            </h2>
            <p className="text-gray-700">Nuestro servicio no está dirigido a menores de 16 años. No recopilamos intencionadamente datos de menores sin el consentimiento de sus padres o tutores.</p>
          </div>

          {/* Section 12 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-blue-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>1️⃣2️⃣</span>
              Cambios en esta Política
            </h2>
            <p className="text-gray-700">Podemos actualizar esta política de privacidad. Le notificaremos cualquier cambio significativo por email o mediante un aviso en nuestro sitio web.</p>
          </div>

          {/* Contact Section */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-2xl p-6 text-white">
            <h3 className="text-xl font-bold mb-3 flex items-center">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📧</span>
              Contacto para Ejercer Derechos
            </h3>
            <p className="mb-3">Para ejercer sus derechos o resolver cualquier duda sobre esta política de privacidad, puede contactarnos en:</p>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
              <p><strong>📧 Email:</strong> contacto@delfincheckin.com<br />
              <strong>📍 Dirección:</strong> Málaga, España</p>
              <p className="mt-2">También puede presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


