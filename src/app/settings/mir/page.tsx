'use client';

import { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, FileText } from 'lucide-react';

interface MIRConfig {
  enabled: boolean;
  codigoEstablecimiento: string;
  denominacion: string;
  direccionCompleta: string;
  autoSubmit: boolean;
  testMode: boolean;
}

export default function MIRSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [tenant, setTenant] = useState<any>(null);
  
  const [mirConfig, setMirConfig] = useState<MIRConfig>({
    enabled: true,
    codigoEstablecimiento: '',
    denominacion: '',
    direccionCompleta: '',
    autoSubmit: false,
    testMode: true
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/tenant');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error cargando configuración');
      }
      
      setTenant(data);
      
      // Cargar configuración MIR desde el config del tenant
      if (data.tenant?.config?.mir) {
        setMirConfig(data.tenant.config.mir);
      }
      
    } catch (error: any) {
      console.error('Error cargando configuración:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const response = await fetch('/api/settings/mir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mir: mirConfig }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error guardando configuración');
      }

      setSuccess(true);
      
      // Recargar configuración
      await loadConfig();
      
      // Ocultar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(false), 3000);

    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
          
          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              <p className="text-green-800">Configuración guardada correctamente</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Information Card */}
          <div className="card mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-start">
              <div className="text-2xl mr-4">ℹ️</div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Sobre el registro MIR</h3>
                <p className="text-blue-800 text-sm mb-3">
                  El Ministerio del Interior de España requiere que todos los establecimientos de alojamiento 
                  turístico registren a sus huéspedes. Esta configuración te permite personalizar los datos 
                  de tu establecimiento para cumplir con esta normativa.
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• <strong>Código de establecimiento:</strong> Proporcionado por el Ministerio del Interior</li>
                  <li>• <strong>Modo de prueba:</strong> Evita envíos reales mientras configuras el sistema</li>
                  <li>• <strong>Envío automático:</strong> Envía los partes automáticamente al MIR</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <form onSubmit={handleSave}>
            <div className="card space-y-6">
              
              {/* Enable/Disable MIR */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-semibold text-gray-900">Habilitar registro MIR</h3>
                  <p className="text-sm text-gray-600">
                    Activa el sistema de registro de viajeros para tu establecimiento
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mirConfig.enabled}
                    onChange={(e) => setMirConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Establishment Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de establecimiento *
                </label>
                <input
                  type="text"
                  required
                  value={mirConfig.codigoEstablecimiento}
                  onChange={(e) => setMirConfig(prev => ({ ...prev, codigoEstablecimiento: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: 0000256653"
                  disabled={!mirConfig.enabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Código único proporcionado por el Ministerio del Interior al registrar tu establecimiento
                </p>
              </div>

              {/* Establishment Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Denominación del establecimiento *
                </label>
                <input
                  type="text"
                  required
                  value={mirConfig.denominacion}
                  onChange={(e) => setMirConfig(prev => ({ ...prev, denominacion: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Hotel Delfín, Apartamentos Playa..."
                  disabled={!mirConfig.enabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nombre oficial de tu establecimiento registrado en el MIR
                </p>
              </div>

              {/* Full Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección completa *
                </label>
                <textarea
                  required
                  rows={3}
                  value={mirConfig.direccionCompleta}
                  onChange={(e) => setMirConfig(prev => ({ ...prev, direccionCompleta: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej: Calle Mayor 10, 29640 Fuengirola, Málaga, España"
                  disabled={!mirConfig.enabled}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Dirección completa incluyendo calle, número, código postal, ciudad y provincia
                </p>
              </div>

              {/* Test Mode */}
              <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div>
                  <h3 className="font-semibold text-yellow-900">Modo de prueba</h3>
                  <p className="text-sm text-yellow-700">
                    Los partes NO se enviarán al Ministerio del Interior mientras esté activo
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mirConfig.testMode}
                    onChange={(e) => setMirConfig(prev => ({ ...prev, testMode: e.target.checked }))}
                    className="sr-only peer"
                    disabled={!mirConfig.enabled}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                </label>
              </div>

              {/* Auto Submit */}
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                <div>
                  <h3 className="font-semibold text-green-900">Envío automático</h3>
                  <p className="text-sm text-green-700">
                    Los partes se enviarán automáticamente al completar el registro
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mirConfig.autoSubmit}
                    onChange={(e) => setMirConfig(prev => ({ ...prev, autoSubmit: e.target.checked }))}
                    className="sr-only peer"
                    disabled={!mirConfig.enabled || mirConfig.testMode}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              {mirConfig.testMode && mirConfig.autoSubmit && (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-800">
                    ⚠️ <strong>Nota:</strong> El envío automático solo se activará cuando desactives el modo de prueba.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex justify-end pt-6 border-t">
                <button
                  type="submit"
                  disabled={saving || !mirConfig.enabled}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="loading mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Guardar configuración
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Documentation Link */}
          <div className="mt-6 card bg-gray-50">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-gray-600 mr-3" />
              <div>
                <h3 className="font-semibold text-gray-900">¿Necesitas ayuda?</h3>
                <p className="text-sm text-gray-600">
                  Consulta la{' '}
                  <a 
                    href="https://www.interior.gob.es/opencms/es/servicios-al-ciudadano/tramites-y-gestiones/hospedaje/partes-de-entrada-de-viajeros/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    documentación oficial del Ministerio del Interior
                  </a>
                  {' '}para más información sobre el registro de viajeros.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

