'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { useAuth } from '@/lib/auth';

interface OnboardingData {
  // Datos del DPA
  dpaAceptado: boolean;
  
  // Datos de empresa
  nombreEmpresa: string;
  nifEmpresa: string;
  direccionEmpresa: string;
  codigoPostal: string;
  ciudad: string;
  provincia: string;
  pais: string;
  telefono: string;
  email: string;
  web: string;
  
  // Configuración MIR
  usuarioMir: string;
  contraseñaMir: string;
  codigoArrendador: string;
  codigoEstablecimiento: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  // const { user, tenantId } = useAuth();
  const tenantId = '870e589f-d313-4a5a-901f-f25fd4e7240a'; // Temporal para testing
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OnboardingData>({
    dpaAceptado: false,
    nombreEmpresa: '',
    nifEmpresa: '',
    direccionEmpresa: '',
    codigoPostal: '',
    ciudad: '',
    provincia: '',
    pais: 'España',
    telefono: '',
    email: '',
    web: '',
    usuarioMir: '',
    contraseñaMir: '',
    codigoArrendador: '',
    codigoEstablecimiento: ''
  });

  useEffect(() => {
    // Verificar si el usuario ya completó el onboarding
    checkOnboardingStatus();
  }, [tenantId]);

  const checkOnboardingStatus = async () => {
    try {
      const response = await fetch('/api/onboarding/status');
      const data = await response.json();
      
      if (data.onboardingCompleto) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error verificando estado del onboarding:', error);
    }
  };

  const handleInputChange = (field: keyof OnboardingData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/dashboard');
      } else {
        throw new Error('Error al completar el onboarding');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al completar el onboarding. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const renderDPAStep = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🐬 Bienvenido a Delfín Check-in
        </h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">
            Contrato de Encargado del Tratamiento (DPA)
          </h2>
          <p className="text-blue-800 mb-4">
            De acuerdo con el RGPD (art. 28) y el RD 933/2021, debe aceptar el Contrato de Encargado del Tratamiento entre su alojamiento (Responsable) y Delfín Check-in (Encargado), para poder utilizar el sistema de registro y envío de partes de viajeros.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">1. Partes</h3>
          <p className="mb-4">
            <strong>Responsable del Tratamiento (RDT):</strong> El usuario titular del alojamiento o empresa de gestión de hospedajes que utiliza la plataforma Delfín Check-in para el registro de viajeros conforme al RD 933/2021, en adelante "el Responsable".
          </p>
          <p className="mb-4">
            <strong>Encargado del Tratamiento (EDT):</strong> Titular del sistema Delfín Check-in, con NIF 49128023T y correo de contacto contacto@delfincheckin.com, en adelante "el Encargado".
          </p>

          <h3 className="text-lg font-semibold mb-4">2. Objeto del contrato</h3>
          <p className="mb-4">
            El Encargado tratará, por cuenta del Responsable, los datos personales de viajeros y reservas necesarios para cumplir con la obligación legal de registro documental y comunicación de hospedajes establecida por la Ley Orgánica 4/2015 y el Real Decreto 933/2021, mediante el envío telemático al Sistema de Hospedajes (SES-Hospedajes) del Ministerio del Interior.
          </p>

          <h3 className="text-lg font-semibold mb-4">3. Naturaleza, finalidad y categorías de datos</h3>
          <p className="mb-2"><strong>Finalidad del tratamiento:</strong></p>
          <p className="mb-4">
            Recolección, validación, almacenamiento y comunicación inmediata o en un plazo no superior a 24 horas de los datos de huéspedes al MIR, para garantizar la seguridad ciudadana.
          </p>
          
          <p className="mb-2"><strong>Categorías de datos tratados:</strong></p>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Identificación personal: NIF/NIE/Pasaporte, nombre y apellidos</li>
            <li>Datos de contacto: teléfono y/o correo electrónico</li>
            <li>Datos contractuales: referencia, fechas de entrada y salida</li>
            <li>Datos de pago: tipo, medio, fecha y titular del pago</li>
            <li>Datos de filiación: fecha de nacimiento, sexo, nacionalidad</li>
            <li>Datos del alojamiento o propiedad que pone en el sistema</li>
          </ul>

          <h3 className="text-lg font-semibold mb-4">4. Obligaciones del Encargado (Delfín Check-in)</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Tratamiento por instrucciones: Tratar los datos solo siguiendo las instrucciones documentadas del Responsable</li>
            <li>Confidencialidad: Garantizar que el personal autorizado mantenga confidencialidad permanente</li>
            <li>Seguridad técnica: Utilizar túneles SSL/TLS y autenticación segura</li>
            <li>Gestión de credenciales: Usar de forma segura las credenciales del servicio web</li>
            <li>Notificación de brechas: Informar al Responsable sin demora ante cualquier violación</li>
          </ul>

          <h3 className="text-lg font-semibold mb-4">5. Obligaciones del Responsable (propietario/gestor)</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Base jurídica: Garantizar que el tratamiento se realiza bajo obligación legal (art. 6.1.c RGPD)</li>
            <li>Veracidad de los datos: Asegurar que los datos comunicados son exactos y completos</li>
            <li>Custodia de credenciales: Mantener bajo su responsabilidad las credenciales de acceso al SES-Hospedajes</li>
            <li>Información al viajero: Garantizar que los huéspedes son informados mediante la Parte de Viajero</li>
          </ul>

          <h3 className="text-lg font-semibold mb-4">6. Medidas de seguridad aplicadas por Delfín Check-in</h3>
          <ul className="list-disc list-inside mb-4 space-y-1">
            <li>Transmisión cifrada (HTTPS TLS 1.2+)</li>
            <li>Cifrado de datos en reposo y backups seguros</li>
            <li>Control de accesos y autenticación multifactor</li>
            <li>Registro de logs y auditoría</li>
            <li>Segmentación por cliente (multi-tenant)</li>
          </ul>

          <h3 className="text-lg font-semibold mb-4">7. Duración</h3>
          <p className="mb-4">
            Este contrato entra en vigor desde el momento en que el Responsable activa su cuenta en Delfín Check-in y permanecerá vigente mientras utilice el servicio.
          </p>

          <h3 className="text-lg font-semibold mb-4">8. Aceptación</h3>
          <p className="mb-4">
            Mediante la activación y uso inicial del sistema, el Responsable declara haber leído y aceptar este Contrato de Encargado del Tratamiento, que pasa a formar parte integrante de las condiciones de uso de Delfín Check-in.
          </p>
        </div>

        <div className="flex items-center space-x-3 mb-6">
          <input
            type="checkbox"
            id="dpaAceptado"
            checked={formData.dpaAceptado}
            onChange={(e) => handleInputChange('dpaAceptado', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            required
          />
          <label htmlFor="dpaAceptado" className="text-sm font-medium text-gray-900">
            Acepto el Contrato de Encargado del Tratamiento (DPA) entre mi alojamiento y Delfín Check-in.
          </label>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleNext}
            disabled={!formData.dpaAceptado}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );

  const renderEmpresaStep = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          📋 Datos de la Empresa
        </h1>
        
        <p className="text-gray-600 mb-6">
          Complete los datos de su empresa o alojamiento. Esta información se utilizará para las facturas y el formulario público de huéspedes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Empresa *
            </label>
            <input
              type="text"
              value={formData.nombreEmpresa}
              onChange={(e) => handleInputChange('nombreEmpresa', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              NIF/CIF *
            </label>
            <input
              type="text"
              value={formData.nifEmpresa}
              onChange={(e) => handleInputChange('nifEmpresa', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dirección *
            </label>
            <input
              type="text"
              value={formData.direccionEmpresa}
              onChange={(e) => handleInputChange('direccionEmpresa', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código Postal *
            </label>
            <input
              type="text"
              value={formData.codigoPostal}
              onChange={(e) => handleInputChange('codigoPostal', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ciudad *
            </label>
            <input
              type="text"
              value={formData.ciudad}
              onChange={(e) => handleInputChange('ciudad', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provincia *
            </label>
            <input
              type="text"
              value={formData.provincia}
              onChange={(e) => handleInputChange('provincia', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              País *
            </label>
            <input
              type="text"
              value={formData.pais}
              onChange={(e) => handleInputChange('pais', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono *
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => handleInputChange('telefono', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sitio Web
            </label>
            <input
              type="url"
              value={formData.web}
              onChange={(e) => handleInputChange('web', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
          >
            Anterior
          </button>
          <button
            onClick={handleNext}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );

  const renderMIRStep = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🔐 Configuración MIR
        </h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            ⚠️ Información Importante
          </h2>
          <p className="text-yellow-700">
            Para poder enviar las comunicaciones al Ministerio del Interior, necesita configurar sus credenciales MIR. 
            Estas credenciales las obtiene al registrarse en el Sistema de Hospedajes (SES-Hospedajes) del MIR.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario MIR *
            </label>
            <input
              type="text"
              value={formData.usuarioMir}
              onChange={(e) => handleInputChange('usuarioMir', e.target.value)}
              placeholder="Formato: CIF---WS"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Formato: CIF---WS (ejemplo: B12345678---WS)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña MIR *
            </label>
            <input
              type="password"
              value={formData.contraseñaMir}
              onChange={(e) => handleInputChange('contraseñaMir', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código de Arrendador *
            </label>
            <input
              type="text"
              value={formData.codigoArrendador}
              onChange={(e) => handleInputChange('codigoArrendador', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código de Establecimiento *
            </label>
            <input
              type="text"
              value={formData.codigoEstablecimiento}
              onChange={(e) => handleInputChange('codigoEstablecimiento', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            📋 Resumen de la Configuración
          </h3>
          <p className="text-blue-800 mb-4">
            Una vez completado este proceso, tendrá configurado:
          </p>
          <ul className="list-disc list-inside text-blue-800 space-y-1">
            <li>✅ Contrato de Encargado del Tratamiento (DPA) firmado</li>
            <li>✅ Datos de empresa configurados para facturas y formulario público</li>
            <li>✅ Credenciales MIR configuradas para envío de comunicaciones</li>
            <li>✅ Sistema listo para recibir registros de huéspedes</li>
          </ul>
        </div>

        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600"
          >
            Anterior
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Completando...' : 'Completar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-2xl">🐬</span>
              <h1 className="text-xl font-bold text-gray-900">Delfín Check-in</h1>
            </div>
            <div className="text-sm text-gray-500">
              Paso {currentStep} de 3
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex space-x-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`h-2 flex-1 rounded-full ${
                    step <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {currentStep === 1 && renderDPAStep()}
      {currentStep === 2 && renderEmpresaStep()}
      {currentStep === 3 && renderMIRStep()}
    </div>
  );
}