'use client';

import { Shield, Building2, Mail, MapPin, Phone } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-6 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent text-center flex items-center justify-center">
            <Shield className="mr-3 h-8 w-8 text-blue-600" />
            Política de Privacidad
          </h1>
        </div>

        {/* Content */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/30 p-8 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <p className="text-gray-600 italic mb-8">Última actualización: 27 de octubre de 2023</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">1. Información del Responsable</h2>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                <div className="flex items-start space-x-3">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <Building2 className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-800 mb-2">Delfín Check-in</h3>
                    <div className="flex items-center text-gray-700 text-sm mb-1">
                      <Mail className="h-4 w-4 mr-2 text-blue-600" />
                      contacto@delfincheckin.com
                    </div>
                    <div className="flex items-center text-gray-700 text-sm">
                      <MapPin className="h-4 w-4 mr-2 text-blue-600" />
                      Málaga, España
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">2. Datos que Recopilamos</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Datos de contacto</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Nombre y apellidos</li>
                <li>Dirección de correo electrónico</li>
                <li>Nombre de la empresa o alojamiento</li>
                <li>Número de teléfono</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2.2 Datos de huéspedes</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Información personal de identificación</li>
                <li>Datos del documento de identidad</li>
                <li>Fecha de nacimiento y nacionalidad</li>
                <li>Información de estancia</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">2.3 Datos técnicos</h3>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Dirección IP</li>
                <li>Información del navegador</li>
                <li>Cookies y tecnologías similares</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">3. Finalidad del Tratamiento</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Prestación del servicio de gestión hotelera</li>
                <li>Cumplimiento de obligaciones legales (registro de viajeros)</li>
                <li>Comunicación con clientes y usuarios</li>
                <li>Mejora de nuestros servicios</li>
                <li>Gestión de reservas y estancias</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">4. Base Legal</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Consentimiento:</strong> Para el tratamiento de datos de contacto y comunicación</li>
                <li><strong>Ejecución contractual:</strong> Para la prestación del servicio contratado</li>
                <li><strong>Obligación legal:</strong> Para el cumplimiento del registro de viajeros</li>
                <li><strong>Interés legítimo:</strong> Para la mejora de servicios y análisis</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">5. Conservación de Datos</h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Datos de clientes: Durante la duración del contrato y 5 años adicionales</li>
                <li>Datos de huéspedes: Según normativa vigente (generalmente 3 años)</li>
                <li>Datos de contacto: Hasta que se solicite la supresión</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">6. Derechos del Usuario</h2>
              <p className="text-gray-700 mb-4">Tienes derecho a:</p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li><strong>Acceso:</strong> Conocer qué datos tenemos sobre ti</li>
                <li><strong>Rectificación:</strong> Corregir datos inexactos</li>
                <li><strong>Supresión:</strong> Solicitar la eliminación de tus datos</li>
                <li><strong>Limitación:</strong> Restringir el tratamiento</li>
                <li><strong>Portabilidad:</strong> Obtener tus datos en formato estructurado</li>
                <li><strong>Oposición:</strong> Oponerte al tratamiento</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">7. Seguridad</h2>
              <p className="text-gray-700">Implementamos medidas técnicas y organizativas apropiadas para proteger tus datos personales contra el acceso no autorizado, la alteración, divulgación o destrucción.</p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-blue-600 mb-4">8. Contacto</h2>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 shadow-sm">
                <div className="flex items-start space-x-3">
                  <div className="bg-green-100 p-2 rounded-lg">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800 mb-2">Contacto</h3>
                    <p className="text-gray-700 text-sm">
                      Para ejercer tus derechos o resolver cualquier duda sobre el tratamiento de datos, 
                      puedes contactarnos en:
                    </p>
                    <div className="flex items-center text-green-700 font-semibold mt-2">
                      <Mail className="h-4 w-4 mr-2" />
                      contacto@delfincheckin.com
                    </div>
                  </div>
                </div>
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
