'use client';

import { useState, useEffect } from 'react';

interface Property {
  id: number;
  tenant_id: string;
  property_name: string;
  tenant_name: string;
}

interface RadarSignal {
  id: number;
  property_id: number;
  tenant_id: string;
  signal_type: string;
  signal_intensity: number;
  signal_data: any;
  expires_at: string | null;
  is_active: boolean;
  processed: boolean;
}

interface SignalModalProps {
  signal: RadarSignal | null;
  properties: Property[];
  onClose: () => void;
  onSave: () => void;
}

export default function SignalModal({ signal, properties, onClose, onSave }: SignalModalProps) {
  const [formData, setFormData] = useState({
    property_id: signal?.property_id || '',
    tenant_id: signal?.tenant_id || '',
    signal_type: signal?.signal_type || 'google_trends',
    signal_intensity: signal?.signal_intensity || 50,
    signal_data: signal?.signal_data ? JSON.stringify(signal.signal_data, null, 2) : '{}',
    expires_at: signal?.expires_at ? signal.expires_at.split('T')[0] : '',
    is_active: signal?.is_active !== false
  });

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (formData.property_id) {
      const prop = properties.find(p => p.id === parseInt(formData.property_id as string));
      if (prop) {
        setSelectedProperty(prop);
        setFormData(prev => ({ ...prev, tenant_id: prop.tenant_id }));
      }
    }
  }, [formData.property_id, properties]);

  const handlePropertyChange = (propertyId: string) => {
    const prop = properties.find(p => p.id === parseInt(propertyId));
    if (prop) {
      setSelectedProperty(prop);
      setFormData(prev => ({ ...prev, property_id: propertyId, tenant_id: prop.tenant_id }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar JSON
      let signalData;
      try {
        signalData = JSON.parse(formData.signal_data);
      } catch (e) {
        setError('El campo signal_data debe ser un JSON válido');
        setLoading(false);
        return;
      }

      const payload = {
        property_id: parseInt(formData.property_id as string),
        tenant_id: formData.tenant_id,
        signal_type: formData.signal_type,
        signal_intensity: formData.signal_intensity,
        signal_data: signalData,
        expires_at: formData.expires_at || null,
        is_active: formData.is_active
      };

      const url = signal
        ? '/api/superadmin/radar/signals'
        : '/api/superadmin/radar/signals';
      const method = signal ? 'PUT' : 'POST';

      const body = signal ? { id: signal.id, ...payload } : payload;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Error al guardar la señal');
        setLoading(false);
        return;
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
      setLoading(false);
    }
  };

  const signalTypes = [
    { value: 'google_trends', label: 'Google Trends' },
    { value: 'ota_demand', label: 'Demanda OTA' },
    { value: 'seasonal', label: 'Estacional' },
    { value: 'event_based', label: 'Basado en Eventos' },
    { value: 'competitor', label: 'Competencia' },
    { value: 'custom', label: 'Personalizado' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{signal ? 'Editar Señal del Radar' : 'Nueva Señal del Radar'}</h3>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Propiedad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Propiedad *
            </label>
            <select
              required
              value={formData.property_id}
              onChange={(e) => handlePropertyChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleccionar propiedad...</option>
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.property_name} ({prop.tenant_name})
                </option>
              ))}
            </select>
            {selectedProperty && (
              <p className="mt-1 text-sm text-gray-500">
                Tenant: {selectedProperty.tenant_name}
              </p>
            )}
          </div>

          {/* Tipo de señal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Señal *
            </label>
            <select
              required
              value={formData.signal_type}
              onChange={(e) => setFormData(prev => ({ ...prev, signal_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              {signalTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Intensidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intensidad: {formData.signal_intensity}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.signal_intensity}
              onChange={(e) => setFormData(prev => ({ ...prev, signal_intensity: parseInt(e.target.value) }))}
              className="w-full"
            />
          </div>

          {/* Datos de la señal (JSON) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Datos de la Señal (JSON) *
            </label>
            <textarea
              required
              value={formData.signal_data}
              onChange={(e) => setFormData(prev => ({ ...prev, signal_data: e.target.value }))}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder='{"keywords": ["fuengirola", "playa"], "dates": "2025-04", ...}'
            />
            <p className="mt-1 text-xs text-gray-500">
              Datos estructurados en formato JSON. Ejemplo: keywords, dates, metrics, source URLs, etc.
            </p>
          </div>

          {/* Fecha de expiración */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de Expiración (opcional)
            </label>
            <input
              type="date"
              value={formData.expires_at}
              onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Estado activo */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
              Señal activa
            </label>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Guardando...' : signal ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

