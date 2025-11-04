'use client';

export default function NoticePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 border-2 border-orange-200">
          <div className="text-center">
            <div className="text-5xl mb-4" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>
              📋
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              Aviso Legal
            </h1>
            <p className="text-gray-500 italic">Última actualización: 27 de octubre de 2023</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Section 1 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-orange-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>1️⃣</span>
              Datos Identificativos
            </h2>
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
              <p className="text-gray-700"><strong>Denominación social:</strong> Delfín Check-in<br />
              <strong>Actividad:</strong> Desarrollo de software y servicios de gestión hotelera<br />
              <strong>📧 Email:</strong> contacto@delfincheckin.com<br />
              <strong>📍 Dirección:</strong> Málaga, España<br />
              <strong>🌐 Sitio web:</strong> https://delfincheckin.com</p>
            </div>
          </div>

          {/* Section 2 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-blue-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>2️⃣</span>
              Objeto del Sitio Web
            </h2>
            <p className="text-gray-700">El presente sitio web tiene como objeto informar sobre los servicios de <strong>Delfín Check-in</strong>, una plataforma de gestión hotelera y auto check-in para hostales y apartamentos turísticos.</p>
          </div>

          {/* Section 3 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-green-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>3️⃣</span>
              Condiciones de Acceso y Uso
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">3.1 Acceso</h3>
                <p className="text-gray-700">El acceso al sitio web es gratuito y no requiere registro previo. Sin embargo, algunos servicios pueden requerir la creación de una cuenta de usuario.</p>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">3.2 Uso</h3>
                <p className="mb-2 text-gray-700">El usuario se compromete a:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Utilizar el sitio web de conformidad con la ley y las buenas costumbres</li>
                  <li>No realizar actividades que puedan dañar, inutilizar o sobrecargar el sitio</li>
                  <li>No introducir virus, programas maliciosos o cualquier otro elemento que pueda dañar el sistema</li>
                  <li>Respetar los derechos de propiedad intelectual e industrial</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 4 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-purple-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>4️⃣</span>
              Propiedad Intelectual e Industrial
            </h2>
            <p className="text-gray-700">Todos los contenidos del sitio web, incluyendo textos, fotografías, gráficos, imágenes, iconos, tecnología, software, links y demás contenidos audiovisuales o sonoros, así como su diseño gráfico y códigos fuente, constituyen una obra cuya propiedad pertenece a Delfín Check-in, sin que puedan entenderse cedidos al usuario ninguno de los derechos de explotación sobre los mismos.</p>
          </div>

          {/* Section 5 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-red-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-red-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>5️⃣</span>
              Exclusión de Garantías y Responsabilidad
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-red-50 to-pink-50 p-4 rounded-lg border border-red-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">5.1 Disponibilidad</h3>
                <p className="text-gray-700">Delfín Check-in no garantiza la disponibilidad y continuidad del funcionamiento del sitio web ni de los servicios en él contenidos, ni la ausencia de errores en el mismo.</p>
              </div>
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">5.2 Contenidos</h3>
                <p className="mb-2 text-gray-700">Delfín Check-in no se hace responsable de:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Los daños de cualquier naturaleza que puedan derivarse del uso de los contenidos</li>
                  <li>La veracidad, exactitud o actualidad de los contenidos</li>
                  <li>Los daños producidos por la presencia de virus u otros elementos en los contenidos</li>
                  <li>El funcionamiento de los enlaces a sitios web de terceros</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Section 6 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-blue-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>6️⃣</span>
              Política de Enlaces
            </h2>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">6.1 Enlaces Salientes</h3>
                <p className="text-gray-700">El sitio web puede contener enlaces a otros sitios web. Delfín Check-in no se responsabiliza del contenido de dichos sitios ni de sus políticas de privacidad.</p>
              </div>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <h3 className="text-lg font-semibold mb-2 text-gray-800">6.2 Enlaces Entrantes</h3>
                <p className="text-gray-700">Se prohíbe la creación de enlaces al sitio web sin autorización expresa de Delfín Check-in.</p>
              </div>
            </div>
          </div>

          {/* Section 7 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-green-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>7️⃣</span>
              Protección de Datos Personales
            </h2>
            <p className="text-gray-700">El tratamiento de datos personales se rige por nuestra <a href="/legal/privacy" className="text-blue-600 hover:text-purple-600 font-semibold underline">Política de Privacidad</a>, que cumple con el Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).</p>
          </div>

          {/* Section 8 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-purple-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-purple-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>8️⃣</span>
              Cookies
            </h2>
            <p className="text-gray-700">Este sitio web utiliza cookies para mejorar la experiencia del usuario. Para más información, consulte nuestra <a href="/legal/cookies" className="text-blue-600 hover:text-green-600 font-semibold underline">Política de Cookies</a>.</p>
          </div>

          {/* Section 9 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-indigo-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-indigo-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>9️⃣</span>
              Modificaciones
            </h2>
            <p className="text-gray-700">Delfín Check-in se reserva el derecho de realizar modificaciones en el sitio web sin previo aviso, pudiendo cambiar, suprimir o añadir tanto los contenidos como la forma en que éstos se presentan.</p>
          </div>

          {/* Section 10 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-orange-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-orange-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🔟</span>
              Legislación Aplicable y Jurisdicción
            </h2>
            <p className="text-gray-700">El presente aviso legal se rige por la legislación española. Para la resolución de cualquier controversia, las partes se someterán a los Juzgados y Tribunales de Málaga, renunciando expresamente a cualquier otro fuero que pudiera corresponderles.</p>
          </div>

          {/* Section 11 */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center text-blue-600">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>1️⃣1️⃣</span>
              Contacto
            </h2>
            <p className="mb-3 text-gray-700">Para cualquier consulta relacionada con este aviso legal:</p>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <p className="text-gray-700"><strong>📧 Email:</strong> contacto@delfincheckin.com<br />
              <strong>📍 Dirección:</strong> Málaga, España</p>
            </div>
          </div>

          {/* Section 12 */}
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl shadow-2xl p-6 text-white">
            <h2 className="text-xl font-bold mb-3 flex items-center">
              <span className="text-2xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>1️⃣2️⃣</span>
              Cumplimiento Normativo
            </h2>
            <p className="mb-3">Delfín Check-in cumple con:</p>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 backdrop-blur-sm">
              <ul className="list-disc list-inside space-y-2">
                <li>Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI)</li>
                <li>Reglamento General de Protección de Datos (RGPD)</li>
                <li>Ley Orgánica de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD)</li>
                <li>Normativa española de protección al consumidor</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


