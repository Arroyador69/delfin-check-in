'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, Send, User, Mail, Phone, Calendar, Users, Home } from 'lucide-react';

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
  formConfig: {
    title: string;
    description: string;
    fields: Array<{
      id: string;
      type: 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'textarea';
      label: string;
      required: boolean;
      placeholder?: string;
      options?: string[];
    }>;
    submitButtonText: string;
    successMessage: string;
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
  
  const [formData, setFormData] = useState<Record<string, any>>({});

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
      
      // Inicializar formData con valores vacíos
      const initialData: Record<string, any> = {};
      data.formConfig.fields.forEach((field: any) => {
        initialData[field.id] = '';
      });
      setFormData(initialData);
      
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

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const renderField = (field: any) => {
    const commonProps = {
      id: field.id,
      value: formData[field.id] || '',
      onChange: (e: any) => handleInputChange(field.id, e.target.value),
      placeholder: field.placeholder,
      required: field.required,
      className: "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
    };

    switch (field.type) {
      case 'email':
        return <input type="email" {...commonProps} />;
      case 'tel':
        return <input type="tel" {...commonProps} />;
      case 'date':
        return <input type="date" {...commonProps} />;
      case 'number':
        return <input type="number" {...commonProps} />;
      case 'textarea':
        return <textarea rows={4} {...commonProps} />;
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Selecciona una opción</option>
            {field.options?.map((option: string) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      default:
        return <input type="text" {...commonProps} />;
    }
  };

  const getFieldIcon = (field: any) => {
    switch (field.type) {
      case 'email':
        return <Mail className="w-5 h-5" />;
      case 'tel':
        return <Phone className="w-5 h-5" />;
      case 'date':
        return <Calendar className="w-5 h-5" />;
      case 'number':
        return <Users className="w-5 h-5" />;
      default:
        return <User className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando formulario...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
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
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center">
            <div className="text-3xl mr-3">🐬</div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{config.tenant.config.propertyName}</h1>
              <p className="text-sm text-gray-600">Formulario de contacto</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          
          {/* Form Header */}
          <div className="text-center mb-8">
            <div className="text-blue-600 text-4xl mb-4">
              <Home className="w-12 h-12 mx-auto" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {config.formConfig.title}
            </h2>
            <p className="text-gray-600 text-lg">
              {config.formConfig.description}
            </p>
          </div>

          {success ? (
            /* Success State */
            <div className="text-center">
              <div className="text-green-500 text-6xl mb-4">
                <CheckCircle className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">¡Mensaje enviado!</h3>
              <p className="text-gray-600 mb-6">
                {config.formConfig.successMessage}
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
            <form onSubmit={handleSubmit} className="space-y-6">
              {config.formConfig.fields.map((field) => (
                <div key={field.id}>
                  <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center">
                      <span className="text-blue-600 mr-2">{getFieldIcon(field)}</span>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </div>
                  </label>
                  {renderField(field)}
                </div>
              ))}

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <div className="loading mr-3"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      {config.formConfig.submitButtonText}
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
