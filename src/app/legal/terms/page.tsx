'use client';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-6 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center">
            📋 Términos de Servicio
          </h1>
        </div>

        {/* Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-8 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <p className="text-gray-600 italic mb-8">Última actualización: 27 de octubre de 2023</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">1. Información General</h2>
              <p className="text-gray-700 mb-4">
                Estos términos y condiciones regulan el uso del servicio <strong>Delfín Check-in</strong>, 
                una plataforma de gestión hotelera y auto check-in para hostales y apartamentos turísticos.
              </p>
              
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                <p><strong>Datos del prestador:</strong><br/>
                Delfín Check-in<br/>
                Email: contacto@delfincheckin.com<br/>
                Dirección: Málaga, España</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">2. Aceptación de los Términos</h2>
              <p className="text-gray-700">
                Al acceder y utilizar nuestro servicio, usted acepta estar sujeto a estos términos y condiciones. 
                Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestro servicio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">3. Descripción del Servicio</h2>
              <p className="text-gray-700 mb-4">Delfín Check-in ofrece:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Sistema de gestión de reservas</li>
                <li>Check-in online automatizado</li>
                <li>Registro de viajeros para el Ministerio del Interior</li>
                <li>Integración con calendarios externos</li>
                <li>Asistente de IA para consultas</li>
                <li>Exportación de datos para asesorías</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">4. Uso del Servicio</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">4.1 Uso Permitido</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Gestión de alojamientos turísticos</li>
                <li>Cumplimiento de normativas legales</li>
                <li>Mejora de la experiencia del huésped</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">4.2 Uso Prohibido</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Actividades ilegales o fraudulentas</li>
                <li>Violación de derechos de terceros</li>
                <li>Uso no autorizado de datos</li>
                <li>Interferencia con el funcionamiento del servicio</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">5. Obligaciones del Usuario</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Proporcionar información veraz y actualizada</li>
                <li>Cumplir con la normativa legal aplicable</li>
                <li>Mantener la confidencialidad de sus credenciales</li>
                <li>Notificar cualquier uso no autorizado</li>
                <li>Respetar los derechos de los huéspedes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">6. Facturación y Pagos</h2>
              <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Los precios se establecen según el plan contratado</li>
                  <li>Los pagos se realizan por adelantado</li>
                  <li>Las facturas se envían por correo electrónico</li>
                  <li>Se pueden aplicar descuentos por volumen o anualidad</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">7. Limitación de Responsabilidad</h2>
              <p className="text-gray-700 mb-4">
                Delfín Check-in se esfuerza por proporcionar un servicio confiable, pero no garantiza:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Disponibilidad ininterrumpida del servicio</li>
                <li>Ausencia de errores o interrupciones</li>
                <li>Compatibilidad con todos los sistemas</li>
                <li>Resultados específicos del uso del servicio</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">8. Protección de Datos</h2>
              <p className="text-gray-700">
                El tratamiento de datos personales se rige por nuestra Política de Privacidad, 
                cumpliendo con el RGPD y la normativa española aplicable.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">9. Modificaciones</h2>
              <p className="text-gray-700">
                Nos reservamos el derecho de modificar estos términos en cualquier momento. 
                Las modificaciones entrarán en vigor al ser publicadas en el sitio web.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">10. Resolución de Conflictos</h2>
              <p className="text-gray-700">
                Cualquier disputa será resuelta mediante arbitraje o en los tribunales competentes de Málaga, España.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">11. Contacto</h2>
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <p className="text-gray-700">
                  Para cualquier consulta sobre estos términos, puedes contactarnos en: 
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
