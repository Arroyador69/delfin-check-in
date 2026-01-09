'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface OnboardingData {
  // Paso 1: Cambiar contraseña
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  passwordChanged: boolean;
  
  // Paso 2: Datos de empresa
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
  fechaCreacion: string; // Fecha de creación de la empresa
  
  // Paso 3: MIR (opcional)
  usuarioMir: string;
  contraseñaMir: string;
  codigoArrendador: string;
  codigoEstablecimiento: string;
  
  // Paso 4: Añadir propiedad
  propertyName: string;
  propertyAdded: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [rooms, setRooms] = useState<Array<{id: number, name: string}>>([]);
  
  const [formData, setFormData] = useState<OnboardingData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    passwordChanged: false,
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
    fechaCreacion: '',
    usuarioMir: '',
    contraseñaMir: '',
    codigoArrendador: '',
    codigoEstablecimiento: '',
    propertyName: '',
    propertyAdded: false
  });

  useEffect(() => {
    checkOnboardingStatus();
    if (currentStep === 4) {
      loadRooms();
    }
  }, [currentStep]);

  const checkOnboardingStatus = async () => {
    try {
      const tenantResponse = await fetch('/api/tenant');
      const tenantData = await tenantResponse.json();
      
      if (tenantData.tenant?.onboarding_status === 'completed') {
        router.push('/');
        return;
      }
    } catch (error) {
      console.error('Error verificando estado del onboarding:', error);
    }
  };

  const loadRooms = async () => {
    try {
      const response = await fetch('/api/tenant/rooms');
      const data = await response.json();
      if (data.success) {
        setRooms(data.rooms || []);
      }
    } catch (error) {
      console.error('Error cargando habitaciones:', error);
    }
  };

  const handleInputChange = (field: keyof OnboardingData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Cambiar contraseña
        if (!formData.passwordChanged) {
          setError('Debes cambiar tu contraseña antes de continuar');
          return false;
        }
        return true;
      case 2: // Datos empresa
        if (!formData.nombreEmpresa || !formData.nifEmpresa || !formData.direccionEmpresa ||
            !formData.codigoPostal || !formData.ciudad || !formData.provincia || 
            !formData.pais || !formData.telefono || !formData.email || !formData.fechaCreacion) {
          setError('Todos los campos marcados con * son obligatorios');
          return false;
        }
        return true;
      case 3: // MIR (opcional, puede saltarse)
        return true;
      case 4: // Añadir propiedad
        if (!formData.propertyAdded) {
          setError('Debes añadir al menos una propiedad antes de continuar');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    setError('');
    
    if (!validateStep(currentStep)) {
      return;
    }

    // Guardar datos del paso actual antes de avanzar
    if (currentStep === 2) {
      await saveCompanyData();
    }

    if (currentStep < 4) {
      if (currentStep === 1) {
        try {
          await fetch('/api/tenant/onboarding-status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ onboarding_status: 'in_progress' })
          });
        } catch (error) {
          console.error('Error actualizando onboarding_status:', error);
        }
      }
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
    }
  };

  const handlePasswordChange = async () => {
    setError('');
    setLoading(true);

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('Todos los campos son obligatorios');
      setLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Error al cambiar la contraseña');
        setLoading(false);
        return;
      }

      setFormData(prev => ({ ...prev, passwordChanged: true }));
      setError('');
      // Auto-avanzar al siguiente paso
      setTimeout(() => {
        setCurrentStep(2);
      }, 1000);
    } catch (error) {
      setError('Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const saveCompanyData = async () => {
    try {
      const response = await fetch('/api/empresa/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_empresa: formData.nombreEmpresa,
          nif: formData.nifEmpresa,
          direccion: formData.direccionEmpresa,
          codigo_postal: formData.codigoPostal,
          ciudad: formData.ciudad,
          provincia: formData.provincia,
          pais: formData.pais,
          telefono: formData.telefono,
          email: formData.email,
          web: formData.web,
          fecha_creacion: formData.fechaCreacion
        })
      });

      if (!response.ok) {
        console.error('Error guardando datos de empresa');
      }
    } catch (error) {
      console.error('Error guardando datos de empresa:', error);
    }
  };

  const handleAddProperty = async () => {
    setError('');
    setLoading(true);

    if (!formData.propertyName.trim()) {
      setError('El nombre de la propiedad es obligatorio');
      setLoading(false);
      return;
    }

    try {
      // Crear habitación primero
      const roomsResponse = await fetch('/api/tenant/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rooms: [{ name: formData.propertyName }]
        })
      });

      const roomsData = await roomsResponse.json();

      if (!roomsResponse.ok || !roomsData.success) {
        setError(roomsData.error || 'Error al crear la propiedad');
        setLoading(false);
        return;
      }

      setFormData(prev => ({ ...prev, propertyAdded: true }));
      setError('');
      await loadRooms();
    } catch (error) {
      setError('Error al añadir la propiedad');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    if (!validateStep(4)) {
      setLoading(false);
      return;
    }

    try {
      // Guardar datos MIR si se proporcionaron (opcional)
      if (formData.usuarioMir && formData.contraseñaMir && formData.codigoArrendador && formData.codigoEstablecimiento) {
        await fetch('/api/ministerio/config-produccion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario: formData.usuarioMir,
            contraseña: formData.contraseñaMir,
            codigoArrendador: formData.codigoArrendador,
            codigoEstablecimiento: formData.codigoEstablecimiento,
            baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
            aplicacion: 'Delfin_Check_in',
            simulacion: false,
            activo: true
          })
        });
      }

      // Marcar onboarding como completado
      await fetch('/api/tenant/onboarding-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_status: 'completed' })
      });

      router.push('/');
    } catch (error) {
      console.error('Error:', error);
      setError('Error al completar el onboarding. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Paso 1: Cambiar contraseña
  const renderPasswordStep = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🔐 Cambiar Contraseña
        </h1>
        
        <p className="text-gray-600 mb-6">
          Por seguridad, debes cambiar tu contraseña temporal antes de continuar.
        </p>

        {formData.passwordChanged && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-semibold">✅ Contraseña cambiada exitosamente</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña Actual *
            </label>
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={formData.passwordChanged}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nueva Contraseña *
            </label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={formData.passwordChanged}
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">Mínimo 8 caracteres</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirmar Nueva Contraseña *
            </label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={formData.passwordChanged}
            />
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button
            onClick={handlePasswordChange}
            disabled={loading || formData.passwordChanged}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Cambiando...' : formData.passwordChanged ? 'Contraseña Cambiada' : 'Cambiar Contraseña'}
          </button>
        </div>
      </div>
    </div>
  );

  // Paso 2: Datos empresa
  const renderEmpresaStep = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          📋 Datos de la Empresa
        </h1>
        
        <p className="text-gray-600 mb-6">
          Complete los datos de su empresa o alojamiento. Esta información se utilizará para las facturas y el formulario público de huéspedes.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

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
              Fecha de Creación de la Empresa *
            </label>
            <input
              type="date"
              value={formData.fechaCreacion}
              onChange={(e) => handleInputChange('fechaCreacion', e.target.value)}
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

  // Paso 3: MIR (opcional)
  const renderMIRStep = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🔐 Configuración MIR (Opcional)
        </h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">
            ⚠️ Información Importante
          </h2>
          <p className="text-yellow-700 mb-3">
            Para poder enviar las comunicaciones al Ministerio del Interior, necesita configurar sus credenciales MIR. 
            Estas credenciales las obtiene al registrarse en el Sistema de Hospedajes (SES-Hospedajes) del MIR.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            💰 Módulo MIR - Solo 8€/mes
          </h2>
          <p className="text-blue-700 mb-2">
            <strong>Recordatorio:</strong> El envío automático de formularios de huéspedes al Ministerio del Interior es <strong>obligatorio</strong> en España.
          </p>
          <p className="text-blue-700">
            Por solo <strong>8€/mes (+ IVA)</strong> puedes tener el módulo MIR activado, que incluye:
          </p>
          <ul className="list-disc list-inside text-blue-800 mt-2 space-y-1">
            <li>Check-in digital automático</li>
            <li>Envío automático de formularios al gobierno</li>
            <li>Cumplimiento legal garantizado</li>
            <li>Sin preocupaciones por multas o sanciones</li>
          </ul>
          <Link 
            href="/upgrade-plan"
            className="inline-block mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
          >
            Activar Módulo MIR por 8€/mes
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Usuario MIR
            </label>
            <input
              type="text"
              value={formData.usuarioMir}
              onChange={(e) => handleInputChange('usuarioMir', e.target.value)}
              placeholder="Formato: CIF---WS"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Formato: CIF---WS (ejemplo: B12345678---WS)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña MIR
            </label>
            <input
              type="password"
              value={formData.contraseñaMir}
              onChange={(e) => handleInputChange('contraseñaMir', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código de Arrendador
            </label>
            <input
              type="text"
              value={formData.codigoArrendador}
              onChange={(e) => handleInputChange('codigoArrendador', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código de Establecimiento
            </label>
            <input
              type="text"
              value={formData.codigoEstablecimiento}
              onChange={(e) => handleInputChange('codigoEstablecimiento', e.target.value)}
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
            Continuar (Opcional)
          </button>
        </div>
      </div>
    </div>
  );

  // Paso 4: Añadir propiedad
  const renderPropertyStep = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          🏠 Añadir Propiedad
        </h1>
        
        <p className="text-gray-600 mb-6">
          Añade al menos una propiedad o habitación para comenzar a gestionar tus reservas.
        </p>

        {formData.propertyAdded && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 font-semibold">✅ Propiedad añadida exitosamente</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {rooms.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Propiedades existentes:</h3>
            <ul className="list-disc list-inside text-blue-800">
              {rooms.map(room => (
                <li key={room.id}>{room.name}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Propiedad/Habitación *
            </label>
            <input
              type="text"
              value={formData.propertyName}
              onChange={(e) => handleInputChange('propertyName', e.target.value)}
              placeholder="Ej: Habitación 1, Apartamento Vista al Mar, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={formData.propertyAdded}
            />
          </div>

          {!formData.propertyAdded && (
            <button
              onClick={handleAddProperty}
              disabled={loading || !formData.propertyName.trim()}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Añadiendo...' : 'Añadir Propiedad'}
            </button>
          )}
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
            disabled={loading || !formData.propertyAdded}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
              Paso {currentStep} de 4
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex space-x-2">
              {[1, 2, 3, 4].map((step) => (
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

      {currentStep === 1 && renderPasswordStep()}
      {currentStep === 2 && renderEmpresaStep()}
      {currentStep === 3 && renderMIRStep()}
      {currentStep === 4 && renderPropertyStep()}
    </div>
  );
}
