'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SignalModal from './components/SignalModal';
import LandingModal from './components/LandingModal';

interface Tenant {
  id: string;
  name: string;
  email: string;
}

interface Property {
  id: number;
  tenant_id: string;
  property_name: string;
  tenant_name: string;
  tenant_email: string;
}

interface RadarSignal {
  id: number;
  property_id: number;
  tenant_id: string;
  signal_type: string;
  signal_intensity: number;
  signal_data: any;
  detected_at: string;
  expires_at: string | null;
  is_active: boolean;
  processed: boolean;
  property_name: string;
  tenant_name: string;
}

interface DynamicLanding {
  id: number;
  property_id: number;
  tenant_id: string;
  radar_signal_id: number | null;
  slug: string;
  public_url: string;
  content: any;
  target_date_start: string | null;
  target_date_end: string | null;
  target_keywords: string[];
  target_audience: string | null;
  status: string;
  is_published: boolean;
  views: number;
  conversions: number;
  conversion_rate: number;
  property_name: string;
  tenant_name: string;
  signal_type: string | null;
  signal_intensity: number | null;
}

export default function RadarReachPage() {
  const [activeTab, setActiveTab] = useState<'radar' | 'reach'>('radar');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [signals, setSignals] = useState<RadarSignal[]>([]);
  const [landings, setLandings] = useState<DynamicLanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [showLandingModal, setShowLandingModal] = useState(false);
  const [editingSignal, setEditingSignal] = useState<RadarSignal | null>(null);
  const [editingLanding, setEditingLanding] = useState<DynamicLanding | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargar tenants
      const tenantsRes = await fetch('/api/superadmin/tenants');
      if (tenantsRes.ok) {
        const tenantsData = await tenantsRes.json();
        setTenants(tenantsData.tenants || []);
      }

      // Cargar propiedades
      const propsRes = await fetch('/api/superadmin/properties');
      if (propsRes.ok) {
        const propsData = await propsRes.json();
        setProperties(propsData.properties || []);
      }

      // Cargar según tab activo
      if (activeTab === 'radar') {
        const signalsRes = await fetch('/api/superadmin/radar/signals');
        if (signalsRes.ok) {
          const signalsData = await signalsRes.json();
          setSignals(signalsData.signals || []);
        }
      } else {
        const landingsRes = await fetch('/api/superadmin/reach/landings');
        if (landingsRes.ok) {
          const landingsData = await landingsRes.json();
          setLandings(landingsData.landings || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSignal = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta señal?')) return;

    try {
      const res = await fetch(`/api/superadmin/radar/signals?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting signal:', error);
    }
  };

  const handleDeleteLanding = async (id: number) => {
    if (!confirm('¿Estás seguro de eliminar esta landing?')) return;

    try {
      const res = await fetch(`/api/superadmin/reach/landings?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting landing:', error);
    }
  };

  const getSignalTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      google_trends: 'Google Trends',
      ota_demand: 'Demanda OTA',
      seasonal: 'Estacional',
      event_based: 'Basado en Eventos',
      competitor: 'Competencia',
      custom: 'Personalizado'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const styles: { [key: string]: string } = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      archived: 'bg-gray-100 text-gray-600'
    };
    return styles[status] || styles.draft;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🎯 Radar Reach</h1>
            <p className="text-gray-700 mt-2">Gestión de señales de tendencias y landings dinámicas</p>
          </div>
          <Link
            href="/superadmin"
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Volver al Dashboard
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('radar')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'radar'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📡 Radar (Señales)
          </button>
          <button
            onClick={() => setActiveTab('reach')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reach'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            🎯 Reach (Landings)
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      ) : (
        <>
          {activeTab === 'radar' ? (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Señales del Radar</h2>
                <button
                  onClick={() => {
                    setEditingSignal(null);
                    setShowSignalModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Nueva Señal
                </button>
              </div>

              {signals.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-600">No hay señales del Radar. Crea una nueva para empezar.</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Propiedad / Tenant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Intensidad
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Detección
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {signals.map((signal) => (
                        <tr key={signal.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{signal.property_name}</div>
                            <div className="text-sm text-gray-500">{signal.tenant_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{getSignalTypeLabel(signal.signal_type)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${signal.signal_intensity}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-900">{signal.signal_intensity.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              signal.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {signal.is_active ? 'Activa' : 'Inactiva'}
                            </span>
                            {signal.processed && (
                              <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                Procesada
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(signal.detected_at).toLocaleDateString('es-ES')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                setEditingSignal(signal);
                                setShowSignalModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteSignal(signal.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Landings Dinámicas</h2>
                <button
                  onClick={() => {
                    setEditingLanding(null);
                    setShowLandingModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Nueva Landing
                </button>
              </div>

              {landings.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <p className="text-gray-600">No hay landings dinámicas. Crea una nueva para empezar.</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Landing
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Propiedad / Tenant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Métricas
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Creada
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {landings.map((landing) => (
                        <tr key={landing.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{landing.slug}</div>
                            {landing.is_published && (
                              <a
                                href={landing.public_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                              >
                                Ver landing →
                              </a>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{landing.property_name}</div>
                            <div className="text-sm text-gray-500">{landing.tenant_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(landing.status)}`}>
                              {landing.status}
                            </span>
                            {landing.is_published && (
                              <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                Publicada
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div>👁️ {landing.views} vistas</div>
                            <div>✅ {landing.conversions} conversiones</div>
                            <div className="text-xs text-gray-500">
                              {landing.conversion_rate.toFixed(2)}% tasa
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(landing.created_at).toLocaleDateString('es-ES')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                setEditingLanding(landing);
                                setShowLandingModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteLanding(landing.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal para señales */}
      {showSignalModal && (
        <SignalModal
          signal={editingSignal}
          properties={properties}
          onClose={() => {
            setShowSignalModal(false);
            setEditingSignal(null);
          }}
          onSave={() => {
            setShowSignalModal(false);
            setEditingSignal(null);
            fetchData();
          }}
        />
      )}

      {/* Modal para landings */}
      {showLandingModal && (
        <LandingModal
          landing={editingLanding}
          properties={properties}
          signals={signals.filter(s => s.is_active && !s.processed)}
          onClose={() => {
            setShowLandingModal(false);
            setEditingLanding(null);
          }}
          onSave={() => {
            setShowLandingModal(false);
            setEditingLanding(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

