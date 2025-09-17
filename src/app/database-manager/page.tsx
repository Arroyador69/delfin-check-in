'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Database, Download, BarChart3, Users, Calendar } from 'lucide-react';

interface DatabaseStats {
  rooms: number;
  reservations: number;
  guests: number;
  registrations: number;
}

interface ReservationData {
  id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  channel: string;
  total_price: number;
  status: string;
}

export default function DatabaseManagerPage() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [reservations, setReservations] = useState<ReservationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Obtener estadísticas
      const statsResponse = await fetch('/api/database/stats');
      const statsData = await statsResponse.json();
      setStats(statsData);
      
      // Obtener reservas recientes
      const reservationsResponse = await fetch('/api/reservations');
      const reservationsData = await reservationsResponse.json();
      setReservations(reservationsData.slice(0, 10));
      
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (type: string) => {
    try {
      const response = await fetch(`/api/database/export?type=${type}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando datos:', error);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando datos...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gestor de Base de Datos</h1>
                <p className="text-gray-600">Control total de tus datos desde Cursor</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Database className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Habitaciones</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.rooms}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Reservas</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.reservations}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Huéspedes</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.guests}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Registros MIR</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.registrations}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                {[
                  { id: 'overview', name: 'Resumen', icon: BarChart3 },
                  { id: 'reservations', name: 'Reservas', icon: Calendar },
                  { id: 'export', name: 'Exportar', icon: Download },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="h-4 w-4 mr-2" />
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'overview' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de Base de Datos</h3>
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900">🗄️ PostgreSQL en Vercel</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Base de datos principal con todas las tablas de negocio
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900">📊 Capacidades</h4>
                      <ul className="text-sm text-blue-700 mt-1 space-y-1">
                        <li>• JSON nativo para datos MIR complejos</li>
                        <li>• Consultas avanzadas y análisis</li>
                        <li>• Backups automáticos</li>
                        <li>• Escalable hasta 1TB</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'reservations' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Reservas Recientes</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Huésped
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fechas
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Canal
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Precio
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {reservations.map((reservation) => (
                          <tr key={reservation.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {reservation.guest_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(reservation.check_in).toLocaleDateString()} - {new Date(reservation.check_out).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                reservation.channel === 'airbnb' ? 'bg-red-100 text-red-800' :
                                reservation.channel === 'booking' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {reservation.channel}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              €{reservation.total_price}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                reservation.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                reservation.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {reservation.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'export' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Exportar Datos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => exportData('reservations')}
                      className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Reservas (CSV)
                    </button>
                    
                    <button
                      onClick={() => exportData('guest_registrations')}
                      className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Registros MIR (CSV)
                    </button>
                    
                    <button
                      onClick={() => exportData('guests')}
                      className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Exportar Huéspedes (CSV)
                    </button>
                    
                    <button
                      onClick={() => exportData('backup')}
                      className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-blue-600 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Backup Completo (JSON)
                    </button>
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900">💡 Tip: Gestión desde Cursor</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Usa <code className="bg-blue-100 px-1 rounded">node scripts/database-client.js stats</code> 
                      desde la terminal de Cursor para consultas rápidas.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
