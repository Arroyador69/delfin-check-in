'use client';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 border-2 border-purple-200">
          <div className="text-center">
            <div className="text-5xl mb-4" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>
              📜
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Términos de Servicio
            </h1>
            <p className="text-gray-500 italic">Última actualización: 27 de octubre de 2023</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Section 1 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-purple-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>1️⃣</span>
              Información General
            </h2>
            <p className="mb-3 text-gray-700">Estos términos y condiciones regulan el uso del servicio <strong>Delfín Check-in</strong>, una plataforma de gestión hotelera y auto check-in para hostales y apartamentos turísticos.</p>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
              <p className="text-gray-700"><strong>Datos del prestador:</strong><br />
              Delfín Check-in<br />
              📧 Email: contacto@delfincheckin.com<br />
              📍 Dirección: Málaga, España</p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-blue-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>2️⃣</span>
              Aceptación de los Términos
            </h2>
            <p className="text-gray-700">Al acceder y utilizar nuestro servicio, usted acepta estar sujeto a estos términos y condiciones. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestro servicio.</p>
          </div>

          {/* Section 3 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-green-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>3️⃣</span>
              Descripción del Servicio
            </h2>
            <p className="mb-3 text-gray-700">Delfín Check-in proporciona:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Sistema de gestión de reservas</li>
              <li>Check-in online para huéspedes</li>
              <li>Registro de viajeros para cumplimiento normativo</li>
              <li>Gestión de habitaciones y disponibilidad</li>
              <li>Exportación de datos para contabilidad</li>
              <li>Panel de administración web</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-orange-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>4️⃣</span>
              Registro y Cuenta de Usuario
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">4.1 Requisitos</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Ser mayor de 18 años</li>
                  <li>Proporcionar información veraz y actualizada</li>
                  <li>Mantener la confidencialidad de sus credenciales</li>
                  <li>Notificar inmediatamente cualquier uso no autorizado</li>
                </ul>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">4.2 Responsabilidades del Usuario</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Utilizar el servicio de acuerdo con la normativa aplicable</li>
                  <li>No compartir su cuenta con terceros</li>
                  <li>Mantener actualizada la información de contacto</li>
                  <li>Respetar los derechos de propiedad intelectual</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 5 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-yellow-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-yellow-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>5️⃣</span>
              Precios y Facturación
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">5.1 Tarifas</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li><strong>Plan Mensual:</strong> 14,99€ por propiedad/mes</li>
                  <li><strong>Plan Anual:</strong> 149,90€ por propiedad/año (16,7% descuento)</li>
                  <li><strong>Descuentos por Volumen:</strong> Hasta 25% de descuento según número de propiedades</li>
                </ul>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">5.2 Facturación</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Los pagos se procesan mensual o anualmente según el plan</li>
                  <li>Las facturas se envían por email</li>
                  <li>Los precios incluyen IVA</li>
                  <li>No se realizan reembolsos por cancelaciones anticipadas</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 6 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-red-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>6️⃣</span>
              Obligaciones del Cliente
            </h2>
            <p className="mb-3 text-gray-700">El cliente se compromete a:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Cumplir con toda la normativa turística y fiscal aplicable</li>
              <li>Proporcionar datos veraces de huéspedes y reservas</li>
              <li>Mantener la confidencialidad de los datos de huéspedes</li>
              <li>Utilizar el servicio únicamente para fines legítimos</li>
              <li>Notificar inmediatamente cualquier incidencia de seguridad</li>
            </ul>
          </div>

          {/* Section 7 */}
          <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl shadow-lg p-6 text-white border-2 border-orange-700">
            <h2 className="text-2xl font-bold mb-4 flex items-center">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>7️⃣</span>
              Limitaciones del Servicio
            </h2>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
              <p className="font-semibold">⚠️ Importante:</p>
              <p>Delfín Check-in es un sistema de gestión manual. No hay conexión automática con portales externos como Booking.com, Airbnb, Expedia o Vrbo. Todas las reservas deben introducirse manualmente en el sistema.</p>
            </div>
          </div>

          {/* Section 8 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-indigo-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-indigo-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>8️⃣</span>
              Disponibilidad del Servicio
            </h2>
            <p className="mb-3 text-gray-700">Nos esforzamos por mantener el servicio disponible 24/7, pero no garantizamos:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Disponibilidad ininterrumpida del servicio</li>
              <li>Ausencia de errores o interrupciones</li>
              <li>Compatibilidad con todos los dispositivos o navegadores</li>
            </ul>
          </div>

          {/* Section 9 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-blue-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>9️⃣</span>
              Propiedad Intelectual
            </h2>
            <p className="text-gray-700">Todo el contenido del servicio, incluyendo software, diseño, textos, imágenes y funcionalidades, es propiedad de Delfín Check-in y está protegido por las leyes de propiedad intelectual.</p>
          </div>

          {/* Section 10 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-green-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🔟</span>
              Protección de Datos
            </h2>
            <p className="text-gray-700">El tratamiento de datos personales se rige por nuestra <a href="/legal/privacy" className="text-blue-600 hover:text-purple-600 font-semibold underline">Política de Privacidad</a>, que cumple con el RGPD y la normativa española de protección de datos.</p>
          </div>

          {/* Section 11 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-red-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>1️⃣1️⃣</span>
              Limitación de Responsabilidad
            </h2>
            <p className="mb-3 text-gray-700">Delfín Check-in no será responsable de:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Pérdidas económicas derivadas del uso del servicio</li>
              <li>Interrupciones temporales del servicio</li>
              <li>Datos incorrectos introducidos por el usuario</li>
              <li>Incumplimiento de normativas por parte del cliente</li>
            </ul>
          </div>

          {/* Section 12 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-purple-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>1️⃣2️⃣</span>
              Suspensión y Terminación
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">12.1 Suspensión</h3>
                <p className="mb-2 text-gray-700">Podemos suspender su cuenta temporalmente en caso de:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Incumplimiento de estos términos</li>
                  <li>Actividad fraudulenta o sospechosa</li>
                  <li>Uso indebido del servicio</li>
                </ul>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">12.2 Terminación</h3>
                <p className="mb-2 text-gray-700">Cualquiera de las partes puede terminar el servicio con 30 días de antelación. En caso de terminación:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>El cliente puede exportar sus datos</li>
                  <li>Se eliminarán los datos tras el período de gracia</li>
                  <li>No se realizarán reembolsos</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 13 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-blue-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>1️⃣3️⃣</span>
              Modificaciones
            </h2>
            <p className="text-gray-700">Nos reservamos el derecho de modificar estos términos en cualquier momento. Las modificaciones se notificarán con 30 días de antelación. El uso continuado del servicio constituye aceptación de los nuevos términos.</p>
          </div>

          {/* Section 14 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-indigo-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-indigo-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>1️⃣4️⃣</span>
              Ley Aplicable y Jurisdicción
            </h2>
            <p className="text-gray-700">Estos términos se rigen por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales de Málaga, renunciando a cualquier otro fuero que pudiera corresponderles.</p>
          </div>

          {/* Section 15 */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl shadow-2xl p-6 text-white">
            <h2 className="text-xl font-bold mb-3 flex items-center">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>1️⃣5️⃣</span>
              Contacto
            </h2>
            <p className="mb-3">Para cualquier consulta sobre estos términos de servicio:</p>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
              <p><strong>📧 Email:</strong> contacto@delfincheckin.com<br />
              <strong>📍 Dirección:</strong> Málaga, España</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


