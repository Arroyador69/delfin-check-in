'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { ExternalLink, Copy, Eye, Settings, MessageSquare, Users, Calendar } from 'lucide-react';

interface FormSubmission {
  id: string;
  name: string;
  email: string;
  phone?: string;
  checkin?: string;
  checkout?: string;
  guests?: number;
  room_type?: string;
  message?: string;
  created_at: string;
}

interface FormStats {
  total_submissions: number;
  submissions_last_7_days: number;
  submissions_last_30_days: number;
  submissions_with_dates: number;
  submissions_with_guests: number;
}

export default function FormsPage() {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [stats, setStats] = useState<FormStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [formUrl, setFormUrl] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Obtener información del tenant
      const tenantResponse = await fetch('/api/tenant');
      const tenantData = await tenantResponse.json();
      setTenant(tenantData);
      
      // Generar URL del formulario (redirección al formulario existente)
      if (tenantData?.tenant?.id) {
        const baseUrl = process.env.NODE_ENV === 'development' 
          ? 'http://localhost:3000' 
          : 'https://admin.delfincheckin.com';
        setFormUrl(`${baseUrl}/api/public/form-redirect/${tenantData.tenant.id}`);
      }
      
      // Obtener envíos de formularios
      const submissionsResponse = await fetch('/api/forms/submissions');
      const submissionsData = await submissionsResponse.json();
      setSubmissions(submissionsData.submissions || []);
      setStats(submissionsData.stats || null);
      
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('URL copiada al portapapeles');
    } catch (error) {
      console.error('Error copiando:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (submission: FormSubmission) => {
    if (submission.checkin && submission.checkout) {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Con fechas</span>;
    }
    if (submission.message) {
      return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">Consulta</span>;
    }
    return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Básico</span>;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="loading mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando formularios...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <div className="text-3xl mr-3">📝</div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Formularios de Contacto</h1>
                  <p className="text-sm text-gray-600">Gestiona las consultas de tus clientes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Form URL Section */}
          <div className="card mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="text-3xl">🔗</div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">URL de tu formulario</h2>
                  <p className="text-sm text-gray-600">
                    Comparte este enlace con tus clientes para que puedan contactarte
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={formUrl}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                  />
                </div>
                <button
                  onClick={() => copyToClipboard(formUrl)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copiar</span>
                </button>
                <a
                  href={formUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Ver</span>
                </a>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">📊</div>
                  <div>
                    <p className="text-sm text-gray-600">Total consultas</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_submissions}</p>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">📅</div>
                  <div>
                    <p className="text-sm text-gray-600">Últimos 7 días</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.submissions_last_7_days}</p>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🏨</div>
                  <div>
                    <p className="text-sm text-gray-600">Con fechas</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.submissions_with_dates}</p>
                  </div>
                </div>
              </div>
              
              <div className="card">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">👥</div>
                  <div>
                    <p className="text-sm text-gray-600">Con huéspedes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.submissions_with_guests}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submissions List */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Consultas recibidas</h2>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Actualizar
              </button>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay consultas aún</h3>
                <p className="text-gray-600 mb-6">
                  Cuando los clientes envíen consultas a través de tu formulario, aparecerán aquí.
                </p>
                <div className="bg-blue-50 p-4 rounded-lg max-w-md mx-auto">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> Comparte la URL de tu formulario en tu sitio web, redes sociales o 
                    envíala directamente a tus clientes.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contacto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fechas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {submissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-2xl mr-3">👤</div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {submission.name}
                              </div>
                              {submission.guests && (
                                <div className="text-sm text-gray-500">
                                  {submission.guests} huésped{submission.guests > 1 ? 'es' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{submission.email}</div>
                          {submission.phone && (
                            <div className="text-sm text-gray-500">{submission.phone}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {submission.checkin && submission.checkout ? (
                            <div className="text-sm text-gray-900">
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1 text-green-600" />
                                {new Date(submission.checkin).toLocaleDateString('es-ES')}
                              </div>
                              <div className="text-sm text-gray-500">
                                hasta {new Date(submission.checkout).toLocaleDateString('es-ES')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Sin fechas</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(submission)}
                          {submission.room_type && (
                            <div className="text-xs text-gray-500 mt-1">
                              {submission.room_type}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(submission.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">💡 Cómo usar tu formulario</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-blue-800 mb-2">1. Comparte la URL</h4>
                <p className="text-sm text-blue-700 mb-4">
                  Copia y comparte la URL de tu formulario con tus clientes. Puedes añadirla a tu sitio web, 
                  enviarla por email o compartirla en redes sociales.
                </p>
                
                <h4 className="font-medium text-blue-800 mb-2">2. Personaliza el formulario</h4>
                <p className="text-sm text-blue-700">
                  El formulario se adapta automáticamente a la información de tu propiedad. 
                  Los clientes verán el nombre de tu establecimiento y tus datos de contacto.
                </p>
              </div>
              <div>
                <h4 className="font-medium text-blue-800 mb-2">3. Recibe consultas</h4>
                <p className="text-sm text-blue-700 mb-4">
                  Todas las consultas aparecerán en esta página. Puedes ver los datos de contacto, 
                  fechas de interés y mensajes de tus clientes.
                </p>
                
                <h4 className="font-medium text-blue-800 mb-2">4. Responde a tus clientes</h4>
                <p className="text-sm text-blue-700">
                  Usa la información de contacto para responder directamente a tus clientes 
                  y convertir las consultas en reservas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
