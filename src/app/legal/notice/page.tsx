'use client';

export default function LegalNoticePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-6 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center">
            ⚖️ Aviso Legal
          </h1>
        </div>

        {/* Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-8 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <p className="text-gray-600 italic mb-8">Última actualización: 27 de octubre de 2023</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">1. Datos Identificativos</h2>
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                <p><strong>Denominación social:</strong> Delfín Check-in<br/>
                <strong>Actividad:</strong> Desarrollo de software y servicios de gestión hotelera<br/>
                <strong>Email:</strong> contacto@delfincheckin.com<br/>
                <strong>Dirección:</strong> Málaga, España<br/>
                <strong>Sitio web:</strong> https://admin.delfincheckin.com</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">2. Objeto del Sitio Web</h2>
              <p className="text-gray-700">
                El presente sitio web tiene como objeto proporcionar acceso al panel de administración de 
                <strong> Delfín Check-in</strong>, una plataforma de gestión hotelera y auto check-in para 
                hostales y apartamentos turísticos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">3. Condiciones de Acceso y Uso</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Acceso</h3>
              <p className="text-gray-700 mb-4">
                El acceso al sitio web es gratuito, pero requiere registro y autenticación para acceder 
                a las funcionalidades del panel de administración.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Uso Responsable</h3>
              <p className="text-gray-700 mb-4">
                El usuario se compromete a hacer un uso responsable del sitio web y de sus servicios, 
                respetando las siguientes condiciones:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>No utilizar el sitio para actividades ilegales</li>
                <li>No intentar acceder a áreas restringidas</li>
                <li>No interferir en el funcionamiento del sistema</li>
                <li>Proteger la confidencialidad de sus credenciales</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">4. Propiedad Intelectual</h2>
              <p className="text-gray-700 mb-4">
                Todos los contenidos del sitio web, incluyendo textos, imágenes, logotipos, iconos, 
                software y cualquier otro material, están protegidos por derechos de propiedad intelectual 
                e industrial.
              </p>
              <p className="text-gray-700">
                Queda prohibida la reproducción, distribución, modificación o uso de cualquier contenido 
                sin autorización expresa de Delfín Check-in.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">5. Exclusión de Garantías y Responsabilidad</h2>
              <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                <p className="text-gray-700 mb-4">
                  <strong>Exclusión de garantías:</strong> Delfín Check-in no garantiza la disponibilidad 
                  continua del sitio web ni la ausencia de errores en el mismo.
                </p>
                <p className="text-gray-700">
                  <strong>Limitación de responsabilidad:</strong> En ningún caso Delfín Check-in será 
                  responsable de los daños que puedan derivarse del uso del sitio web.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">6. Protección de Datos</h2>
              <p className="text-gray-700">
                El tratamiento de datos personales se rige por nuestra Política de Privacidad, 
                cumpliendo con el Reglamento General de Protección de Datos (RGPD) y la normativa 
                española aplicable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">7. Cookies</h2>
              <p className="text-gray-700">
                Este sitio web utiliza cookies para mejorar la experiencia del usuario. 
                Para más información, consulta nuestra Política de Cookies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">8. Enlaces Externos</h2>
              <p className="text-gray-700">
                El sitio web puede contener enlaces a sitios web de terceros. Delfín Check-in no se 
                responsabiliza del contenido de dichos sitios ni de sus políticas de privacidad.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">9. Modificaciones</h2>
              <p className="text-gray-700">
                Delfín Check-in se reserva el derecho de modificar este aviso legal en cualquier momento, 
                así como el contenido del sitio web, sin previo aviso.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">10. Legislación Aplicable y Jurisdicción</h2>
              <p className="text-gray-700">
                Este aviso legal se rige por la legislación española. Para la resolución de cualquier 
                controversia, las partes se someten a los Juzgados y Tribunales de Málaga.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">11. Contacto</h2>
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <p className="text-gray-700">
                  Para cualquier consulta relacionada con este aviso legal, puedes contactarnos en: 
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
