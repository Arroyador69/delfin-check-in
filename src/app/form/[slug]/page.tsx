'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, Send, User, Mail, Phone, Calendar, Users, Home, FileText } from 'lucide-react';
import MunicipioSelector from '@/components/MunicipioSelector';

interface TenantFormConfig {
  tenant: {
    id: string;
    name: string;
    email: string;
    config: {
      propertyName: string;
      contactEmail: string;
      contactPhone: string;
      address: string;
      city: string;
      country: string;
      language: string;
      currency: string;
      timezone: string;
    };
  };
}

export default function TenantFormPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [config, setConfig] = useState<TenantFormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    // Datos del contrato
    fechaContrato: '',
    fechaEntrada: '',
    fechaSalida: '',
    numHabitaciones: 1,
    internet: false,
    tipoPago: 'PLATF',
    fechaPago: '',
    medioPago: '',
    titular: '',
    caducidadTarjeta: '',
    
    // Datos del viajero 1
    nombre: '',
    apellido1: '',
    apellido2: '',
    fechaNacimiento: '',
    tipoDocumento: 'PAS',
    numeroDocumento: '',
    nacionalidad: 'España',
    sexo: 'H',
    telefono: '',
    correo: '',
    direccion: '',
    codigoPostal: '',
    pais: 'España',
    codigoMunicipio: '',
    nombreMunicipio: '',
    
    // Datos del viajero 2 (opcional)
    nombre2: '',
    apellido1_2: '',
    apellido2_2: '',
    fechaNacimiento2: '',
    tipoDocumento2: 'PAS',
    numeroDocumento2: '',
    nacionalidad2: 'España',
    sexo2: 'H',
    telefono2: '',
    correo2: '',
    direccion2: '',
    codigoPostal2: '',
    pais2: 'España',
    codigoMunicipio2: '',
    nombreMunicipio2: '',
  });

  const [showTraveler2, setShowTraveler2] = useState(false);

  useEffect(() => {
    if (slug) {
      loadFormConfig();
    }
  }, [slug]);

  const loadFormConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/form/${slug}`);
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Formulario no encontrado');
        return;
      }
      
      setConfig(data);
      
      // Pre-llenar algunos campos con la fecha actual
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString().slice(0, 16);
      
      setFormData(prev => ({
        ...prev,
        fechaContrato: today,
        fechaEntrada: now,
        fechaSalida: now
      }));
      
    } catch (error) {
      console.error('Error cargando configuración:', error);
      setError('Error cargando el formulario');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/public/form/${slug}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: config?.tenant.id,
          formData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error enviando el formulario');
      }

      setSuccess(true);
      
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleINEFields = (paisValue: string, travelerNum: number) => {
    const isEspana = paisValue.toLowerCase().includes('españa') || 
                     paisValue.toLowerCase().includes('spain') || 
                     paisValue.toLowerCase() === 'es' || 
                     paisValue.toLowerCase() === 'esp';
    
    if (isEspana) {
      // Para españoles: requerir INE, no requerir nombre municipio
      const ineInput = document.getElementById(`codigoMunicipio${travelerNum}`);
      const ineRequired = document.getElementById(`ineRequired${travelerNum}`);
      const municipioInput = document.getElementById(`nombreMunicipio${travelerNum}`);
      const municipioRequired = document.getElementById(`municipioRequired${travelerNum}`);
      
      if (ineInput) ineInput.setAttribute('required', 'true');
      if (ineRequired) {
        ineRequired.classList.remove('hidden');
        ineRequired.style.display = 'inline';
      }
      if (municipioInput) municipioInput.removeAttribute('required');
      if (municipioRequired) {
        municipioRequired.classList.add('hidden');
        municipioRequired.style.display = 'none';
      }
    } else {
      // Para extranjeros: no requerir INE, requerir nombre municipio
      const ineInput = document.getElementById(`codigoMunicipio${travelerNum}`);
      const ineRequired = document.getElementById(`ineRequired${travelerNum}`);
      const municipioInput = document.getElementById(`nombreMunicipio${travelerNum}`);
      const municipioRequired = document.getElementById(`municipioRequired${travelerNum}`);
      
      if (ineInput) ineInput.removeAttribute('required');
      if (ineRequired) {
        ineRequired.classList.add('hidden');
        ineRequired.style.display = 'none';
      }
      if (municipioInput) municipioInput.setAttribute('required', 'true');
      if (municipioRequired) {
        municipioRequired.classList.remove('hidden');
        municipioRequired.style.display = 'inline';
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header Simple - Sin menú de admin */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <div className="text-3xl mr-3">🐬</div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">{config.tenant.config.propertyName}</h1>
              <p className="text-sm text-gray-600">Registro de viajero</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
          
          {success ? (
            /* Success State */
            <div className="text-center">
              <div className="text-green-500 text-6xl mb-4">
                <CheckCircle className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">¡Registro enviado!</h3>
              <p className="text-gray-600 mb-6">
                Gracias por completar el registro. {config.tenant.config.propertyName} se pondrá en contacto contigo pronto.
              </p>
              <div className="bg-green-50 p-6 rounded-lg">
                <h4 className="font-semibold text-green-900 mb-2">Información de contacto</h4>
                <div className="text-green-800 text-sm space-y-1">
                  <p><strong>Propiedad:</strong> {config.tenant.config.propertyName}</p>
                  <p><strong>Email:</strong> {config.tenant.config.contactEmail}</p>
                  {config.tenant.config.contactPhone && (
                    <p><strong>Teléfono:</strong> {config.tenant.config.contactPhone}</p>
                  )}
                  <p><strong>Ubicación:</strong> {config.tenant.config.city}, {config.tenant.config.country}</p>
                </div>
              </div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Sección Contrato */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Contrato
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha contrato (AAAA-MM-DD) *
                    </label>
                    <input
                      type="date"
                      value={formData.fechaContrato}
                      onChange={(e) => handleInputChange('fechaContrato', e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Entrada Check-in (AAAA-MM-DDThh:mm:ss) *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.fechaEntrada}
                      onChange={(e) => handleInputChange('fechaEntrada', e.target.value)}
                      required
                      step="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salida Check-out (AAAA-MM-DDThh:mm:ss) *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.fechaSalida}
                      onChange={(e) => handleInputChange('fechaSalida', e.target.value)}
                      required
                      step="1"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de habitación
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.numHabitaciones}
                      onChange={(e) => handleInputChange('numHabitaciones', parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="internet"
                      checked={formData.internet}
                      onChange={(e) => handleInputChange('internet', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="internet" className="ml-2 block text-sm text-gray-900">
                      Internet
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de pago *
                    </label>
                    <select
                      value={formData.tipoPago}
                      onChange={(e) => handleInputChange('tipoPago', e.target.value)}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="EFECT">Efectivo</option>
                      <option value="TARJT">Tarjeta</option>
                      <option value="PLATF">Plataforma</option>
                      <option value="TRANS">Transferencia</option>
                      <option value="MOVIL">Móvil</option>
                      <option value="TREG">Cheque</option>
                      <option value="DESTI">Destino</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de pago (AAAA-MM-DD)
                    </label>
                    <input
                      type="date"
                      value={formData.fechaPago}
                      onChange={(e) => handleInputChange('fechaPago', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Medio de pago
                    </label>
                    <input
                      type="text"
                      value={formData.medioPago}
                      onChange={(e) => handleInputChange('medioPago', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Titular
                    </label>
                    <input
                      type="text"
                      value={formData.titular}
                      onChange={(e) => handleInputChange('titular', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Caducidad (MM/AAAA)
                    </label>
                    <input
                      type="text"
                      value={formData.caducidadTarjeta}
                      onChange={(e) => handleInputChange('caducidadTarjeta', e.target.value)}
                      placeholder="MM/AAAA"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      En caso de pago con tarjeta, indique la fecha de caducidad de la tarjeta utilizada
                    </p>
                  </div>
                </div>
              </div>

              {/* Sección Viajeros */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  Viajeros
                </h3>
                
                {/* Viajero 1 */}
                <div className="border rounded-lg p-6 mb-4 bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-4">Viajero 1</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={formData.nombre}
                        onChange={(e) => handleInputChange('nombre', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Primer apellido *
                      </label>
                      <input
                        type="text"
                        value={formData.apellido1}
                        onChange={(e) => handleInputChange('apellido1', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Segundo apellido
                      </label>
                      <input
                        type="text"
                        value={formData.apellido2}
                        onChange={(e) => handleInputChange('apellido2', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha nacimiento (AAAA-MM-DD) *
                      </label>
                      <input
                        type="date"
                        value={formData.fechaNacimiento}
                        onChange={(e) => handleInputChange('fechaNacimiento', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tipo documento
                      </label>
                      <select
                        value={formData.tipoDocumento}
                        onChange={(e) => handleInputChange('tipoDocumento', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="NIF">DNI</option>
                        <option value="NIE">NIE</option>
                        <option value="PAS">Pasaporte</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Número documento
                      </label>
                      <input
                        type="text"
                        value={formData.numeroDocumento}
                        onChange={(e) => handleInputChange('numeroDocumento', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nacionalidad
                      </label>
                      <input
                        type="text"
                        value={formData.nacionalidad}
                        onChange={(e) => {
                          handleInputChange('nacionalidad', e.target.value);
                          handleINEFields(e.target.value, 1);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Ej: España, Francia, Italia..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Escriba el país en su idioma natural (ej: España, Francia). Se convertirá automáticamente al código ISO3.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sexo
                      </label>
                      <select
                        value={formData.sexo}
                        onChange={(e) => handleInputChange('sexo', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="H">Hombre</option>
                        <option value="M">Mujer</option>
                        <option value="O">Otro</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={formData.telefono}
                        onChange={(e) => handleInputChange('telefono', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        value={formData.correo}
                        onChange={(e) => handleInputChange('correo', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dirección *
                      </label>
                      <input
                        type="text"
                        value={formData.direccion}
                        onChange={(e) => handleInputChange('direccion', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Código postal *
                      </label>
                      <input
                        type="text"
                        value={formData.codigoPostal}
                        onChange={(e) => handleInputChange('codigoPostal', e.target.value)}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        País *
                      </label>
                      <input
                        type="text"
                        value={formData.pais}
                        onChange={(e) => {
                          handleInputChange('pais', e.target.value);
                          handleINEFields(e.target.value, 1);
                        }}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="Ej: España, Francia, Italia..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Escriba el país en su idioma natural (ej: España, Francia). Se convertirá automáticamente al código ISO3.
                      </p>
                    </div>
                    
                    {formData.pais && (formData.pais.toLowerCase().includes('españa') || formData.pais.toLowerCase().includes('spain') || formData.pais.toLowerCase() === 'es') ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Municipio <span className="text-red-500">*</span>
                        </label>
                        <MunicipioSelector
                          value={formData.codigoMunicipio}
                          onChange={(codigo, nombre) => {
                            handleInputChange('codigoMunicipio', codigo);
                            handleInputChange('nombreMunicipio', nombre);
                          }}
                          placeholder="Busca tu municipio (ej: Fuengirola, Málaga...)"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          required
                        />
                        <p className="text-xs text-blue-600 mt-1">
                          💡 Escribe para buscar tu municipio. El código INE se asignará automáticamente.
                        </p>
                      </div>
                    ) : null}
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre del municipio <span id="municipioRequired1" className="text-red-500 hidden">*</span>
                      </label>
                      <input
                        type="text"
                        id="nombreMunicipio1"
                        value={formData.nombreMunicipio}
                        onChange={(e) => handleInputChange('nombreMunicipio', e.target.value)}
                        placeholder="Helsinki, Paris, London..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        <strong className="text-green-600">Solo para extranjeros:</strong> Nombre de la ciudad/municipio donde resides
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Botón para añadir segundo viajero */}
                {!showTraveler2 && (
                  <div className="text-center mb-4">
                    <button 
                      type="button"
                      onClick={() => setShowTraveler2(true)}
                      className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Users className="w-5 h-5 mr-2" />
                      Añadir segundo viajero
                    </button>
                  </div>
                )}
                
                {/* Segundo Viajero (Opcional) */}
                {showTraveler2 && (
                  <div className="border rounded-lg p-6 mb-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium text-gray-900">Viajero 2 (Opcional)</h4>
                      <button 
                        type="button"
                        onClick={() => setShowTraveler2(false)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre
                        </label>
                        <input
                          type="text"
                          value={formData.nombre2}
                          onChange={(e) => handleInputChange('nombre2', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Primer apellido
                        </label>
                        <input
                          type="text"
                          value={formData.apellido1_2}
                          onChange={(e) => handleInputChange('apellido1_2', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Segundo apellido
                        </label>
                        <input
                          type="text"
                          value={formData.apellido2_2}
                          onChange={(e) => handleInputChange('apellido2_2', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fecha nacimiento (AAAA-MM-DD)
                        </label>
                        <input
                          type="date"
                          value={formData.fechaNacimiento2}
                          onChange={(e) => handleInputChange('fechaNacimiento2', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tipo documento
                        </label>
                        <select
                          value={formData.tipoDocumento2}
                          onChange={(e) => handleInputChange('tipoDocumento2', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="NIF">DNI</option>
                          <option value="NIE">NIE</option>
                          <option value="PAS">Pasaporte</option>
                          <option value="OTRO">Otro</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Número documento
                        </label>
                        <input
                          type="text"
                          value={formData.numeroDocumento2}
                          onChange={(e) => handleInputChange('numeroDocumento2', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nacionalidad
                        </label>
                        <input
                          type="text"
                          value={formData.nacionalidad2}
                          onChange={(e) => {
                            handleInputChange('nacionalidad2', e.target.value);
                            handleINEFields(e.target.value, 2);
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Ej: España, Francia, Italia..."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sexo
                        </label>
                        <select
                          value={formData.sexo2}
                          onChange={(e) => handleInputChange('sexo2', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <option value="H">Hombre</option>
                          <option value="M">Mujer</option>
                          <option value="O">Otro</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          value={formData.telefono2}
                          onChange={(e) => handleInputChange('telefono2', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Correo electrónico
                        </label>
                        <input
                          type="email"
                          value={formData.correo2}
                          onChange={(e) => handleInputChange('correo2', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dirección
                        </label>
                        <input
                          type="text"
                          value={formData.direccion2}
                          onChange={(e) => handleInputChange('direccion2', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Código postal
                        </label>
                        <input
                          type="text"
                          value={formData.codigoPostal2}
                          onChange={(e) => handleInputChange('codigoPostal2', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          País
                        </label>
                        <input
                          type="text"
                          value={formData.pais2}
                          onChange={(e) => {
                            handleInputChange('pais2', e.target.value);
                            handleINEFields(e.target.value, 2);
                          }}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          placeholder="Ej: España, Francia, Italia..."
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Código municipio INE (5) <span id="ineRequired2" className="text-red-500 hidden">*</span>
                        </label>
                        <input
                          type="text"
                          id="codigoMunicipio2"
                          value={formData.codigoMunicipio2}
                          onChange={(e) => handleInputChange('codigoMunicipio2', e.target.value)}
                          maxLength={5}
                          placeholder="29042"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nombre del municipio <span id="municipioRequired2" className="text-red-500 hidden">*</span>
                        </label>
                        <input
                          type="text"
                          id="nombreMunicipio2"
                          value={formData.nombreMunicipio2}
                          onChange={(e) => handleInputChange('nombreMunicipio2', e.target.value)}
                          placeholder="Helsinki, Paris, London..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Botón de envío */}
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Enviar Registro
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <div className="text-center text-sm text-gray-500">
              <p>Powered by <span className="font-semibold text-blue-600">Delfín Check-in</span></p>
              <p className="mt-1">Sistema de gestión hotelera profesional</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}