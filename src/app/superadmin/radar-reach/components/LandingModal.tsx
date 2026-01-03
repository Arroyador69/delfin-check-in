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
  signal_type: string;
  signal_intensity: number;
}

interface DynamicLanding {
  id: number;
  property_id: number;
  tenant_id: string;
  radar_signal_id: number | null;
  slug: string;
  content: any;
  target_date_start: string | null;
  target_date_end: string | null;
  target_keywords: string[];
  target_audience: string | null;
  status: string;
  is_published: boolean;
}

interface LandingModalProps {
  landing: DynamicLanding | null;
  properties: Property[];
  signals: RadarSignal[];
  onClose: () => void;
  onSave: () => void;
}

export default function LandingModal({ landing, properties, signals, onClose, onSave }: LandingModalProps) {
  const [formData, setFormData] = useState({
    property_id: landing?.property_id || '',
    tenant_id: landing?.tenant_id || '',
    radar_signal_id: landing?.radar_signal_id || '',
    slug: landing?.slug || '',
    content: landing?.content ? JSON.stringify(landing.content, null, 2) : JSON.stringify({
      title: '',
      meta_description: '',
      hero: {
        headline: '',
        subheadline: '',
        cta_text: 'Reservar ahora'
      },
      sections: [],
      faqs: [],
      seo: {
        keywords: [],
        json_ld: {}
      }
    }, null, 2),
    target_date_start: landing?.target_date_start ? landing.target_date_start.split('T')[0] : '',
    target_date_end: landing?.target_date_end ? landing.target_date_end.split('T')[0] : '',
    target_keywords: landing?.target_keywords?.join(', ') || '',
    target_audience: landing?.target_audience || '',
    status: landing?.status || 'draft',
    is_published: landing?.is_published || false
  });

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingContent, setGeneratingContent] = useState(false);

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

  const handleGenerateContent = async () => {
    if (!formData.property_id || !formData.radar_signal_id || !formData.target_keywords) {
      setError('Se requiere propiedad, señal del Radar y keywords para generar contenido');
      return;
    }

    setGeneratingContent(true);
    setError(null);

    try {
      const res = await fetch('/api/superadmin/reach/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          radar_signal_id: parseInt(formData.radar_signal_id as string),
          property_id: parseInt(formData.property_id as string),
          target_keywords: formData.target_keywords.split(',').map(k => k.trim()).filter(k => k),
          target_audience: formData.target_audience || null,
          target_date_start: formData.target_date_start || null,
          target_date_end: formData.target_date_end || null
        })
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Error al generar contenido');
        setGeneratingContent(false);
        return;
      }

      setFormData(prev => ({ ...prev, content: JSON.stringify(data.content, null, 2) }));
      setGeneratingContent(false);
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
      setGeneratingContent(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar JSON
      let contentData;
      try {
        contentData = JSON.parse(formData.content);
      } catch (e) {
        setError('El campo content debe ser un JSON válido');
        setLoading(false);
        return;
      }

      const payload = {
        property_id: parseInt(formData.property_id as string),
        tenant_id: formData.tenant_id,
        radar_signal_id: formData.radar_signal_id ? parseInt(formData.radar_signal_id as string) : null,
        slug: formData.slug,
        content: contentData,
        target_date_start: formData.target_date_start || null,
        target_date_end: formData.target_date_end || null,
        target_keywords: formData.target_keywords.split(',').map(k => k.trim()).filter(k => k),
        target_audience: formData.target_audience || null,
        status: formData.status,
        is_published: formData.is_published
      };

      const url = '/api/superadmin/reach/landings';
      const method = landing ? 'PUT' : 'POST';

      const body = landing ? { id: landing.id, ...payload } : payload;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Error al guardar la landing');
        setLoading(false);
        return;
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
      setLoading(false);
    }
  };

  const availableSignals = signals.filter(s => 
    !formData.property_id || s.property_id === parseInt(formData.property_id as string)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{landing ? 'Editar Landing Dinámica' : 'Nueva Landing Dinámica'}</h3>

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
          </div>

          {/* Señal del Radar (opcional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Señal del Radar (opcional)
            </label>
            <select
              value={formData.radar_signal_id}
              onChange={(e) => setFormData(prev => ({ ...prev, radar_signal_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Ninguna (manual)</option>
              {availableSignals.map((signal) => (
                <option key={signal.id} value={signal.id}>
                  {signal.signal_type} (Intensidad: {signal.signal_intensity}%)
                </option>
              ))}
            </select>
            {formData.radar_signal_id && formData.target_keywords && (
              <button
                type="button"
                onClick={handleGenerateContent}
                disabled={generatingContent}
                className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                {generatingContent ? 'Generando...' : '✨ Generar Contenido con IA'}
              </button>
            )}
          </div>

          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug (URL única) *
            </label>
            <input
              type="text"
              required
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="fuengirola-playa-semana-santa-2025"
            />
            <p className="mt-1 text-xs text-gray-500">
              URL única: book.delfincheckin.com/[tenant]/landing/{formData.slug || 'slug'}
            </p>
          </div>

          {/* Keywords objetivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keywords Objetivo (separadas por comas) *
            </label>
            <input
              type="text"
              required
              value={formData.target_keywords}
              onChange={(e) => setFormData(prev => ({ ...prev, target_keywords: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="fuengirola, playa, semana santa, 2025"
            />
          </div>

          {/* Fechas objetivo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio (opcional)
              </label>
              <input
                type="date"
                value={formData.target_date_start}
                onChange={(e) => setFormData(prev => ({ ...prev, target_date_start: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin (opcional)
              </label>
              <input
                type="date"
                value={formData.target_date_end}
                onChange={(e) => setFormData(prev => ({ ...prev, target_date_end: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Audiencia objetivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audiencia Objetivo (opcional)
            </label>
            <input
              type="text"
              value={formData.target_audience}
              onChange={(e) => setFormData(prev => ({ ...prev, target_audience: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="familias, parejas, grupos"
            />
          </div>

          {/* Contenido (JSON) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contenido (JSON estructurado) *
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Contenido estructurado en JSON. Usa el botón "Generar Contenido con IA" si hay una señal asociada.
            </p>
          </div>

          {/* Estado y publicación */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Borrador</option>
                <option value="active">Activa</option>
                <option value="paused">Pausada</option>
                <option value="archived">Archivada</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_published}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 block text-sm text-gray-700">
                  Publicada
                </span>
              </label>
            </div>
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
              {loading ? 'Guardando...' : landing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

