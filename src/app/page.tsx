'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarDays, Users, Home, Settings, BarChart3, MessageSquare, RefreshCw } from 'lucide-react';
// Removido: import { getRooms, getReservations } from '@/lib/storage';

export default function HomePage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Obtener habitaciones
      const roomsResponse = await fetch('/api/rooms');
      const roomsData = await roomsResponse.json();
      setRooms(roomsData);
      
      // Obtener reservas
      const reservationsResponse = await fetch('/api/reservations');
      const reservationsData = await reservationsResponse.json();
      setReservations(reservationsData);
      
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      
      if (result.success) {
        setLastSync(new Date().toLocaleString());
        loadData(); // Recargar datos
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Error en sincronización:', error);
      alert('❌ Error en la sincronización');
    } finally {
      setSyncing(false);
    }
  };

  // Calcular estadísticas
  const totalRooms = rooms.length;
  const totalReservations = reservations.length;
  const confirmedReservations = reservations.filter(r => r.status === 'confirmed').length;
  const today = new Date().toISOString().split('T')[0];
  const guestsToday = reservations.filter(r => 
    r.check_in <= today && r.check_out >= today && r.status === 'confirmed'
  ).length;

  // Calcular ocupación
  const occupancyRate = totalRooms > 0 ? Math.round((confirmedReservations / (totalRooms * 30)) * 100) : 0;

  // Calcular datos financieros
  const totalRevenue = reservations.reduce((sum, r) => sum + (r.guest_paid || 0), 0);
  const totalCommissions = reservations.reduce((sum, r) => sum + (r.platform_commission || 0), 0);
  const totalNetIncome = reservations.reduce((sum, r) => sum + (r.net_income || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-3xl mr-3">🐬</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Delfín Check-in</h1>
                <p className="text-sm text-gray-600">Gestión inteligente de habitaciones</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar'}
              </button>
              <button className="text-gray-500 hover:text-gray-700">
                <Settings className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status de sincronización */}
        {lastSync && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Última sincronización: {lastSync}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Home className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Habitaciones</p>
                <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Huéspedes Hoy</p>
                <p className="text-2xl font-bold text-gray-900">{guestsToday}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CalendarDays className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Reservas Activas</p>
                <p className="text-2xl font-bold text-gray-900">{confirmedReservations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ocupación</p>
                <p className="text-2xl font-bold text-gray-900">{occupancyRate}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Facturación Total</p>
                <p className="text-2xl font-bold text-gray-900">€{totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Comisiones Pagadas</p>
                <p className="text-2xl font-bold text-gray-900">€{totalCommissions.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ganancia Neta</p>
                <p className="text-2xl font-bold text-gray-900">€{totalNetIncome.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link href="/rooms" className="group">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Gestionar Habitaciones
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Configura URLs de iCal y precios
                  </p>
                </div>
                <Home className="h-8 w-8 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/reservations" className="group">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Ver Reservas
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Calendario y gestión de reservas
                  </p>
                </div>
                <CalendarDays className="h-8 w-8 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/checkin" className="group">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Check-in Digital
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Formularios para huéspedes
                  </p>
                </div>
                <Users className="h-8 w-8 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/guest-registration" className="group">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Registro Oficial España
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Cumplimiento Ley 4/2015
                  </p>
                </div>
                <div className="h-8 w-8 text-gray-400 group-hover:text-blue-600 transition-colors">
                  🇪🇸
                </div>
              </div>
            </div>
          </Link>

          <Link href="/messages" className="group">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Mensajes Automáticos
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Plantillas y automatizaciones
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
          </Link>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Sincronización iCal
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {rooms.filter(r => r.ical_in_booking_url).length} habitaciones con Booking.com
                </p>
              </div>
              <RefreshCw className="h-8 w-8 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Actividad Reciente</h3>
          </div>
          <div className="p-6">
            {reservations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No hay reservas aún</p>
                <p className="text-sm text-gray-400 mt-2">
                  Configura los URLs de iCal en "Gestionar Habitaciones" y haz clic en "Sincronizar"
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reservations.slice(0, 5).map((reservation) => (
                  <div key={reservation.id} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        Nueva reserva - {reservation.guest_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(reservation.check_in).toLocaleDateString('es-ES')} - {new Date(reservation.check_out).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}