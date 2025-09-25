'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Settings, RefreshCw } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
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
  // Mostrar un valor fijo de habitaciones en el dashboard (MVP)
  const totalRooms = 6;
  const totalReservations = reservations.length;
  const confirmedReservations = reservations.filter(r => r.status === 'confirmed').length;
  const today = new Date().toISOString().split('T')[0];
  const guestsToday = reservations.filter(r => 
    r.check_in <= today && r.check_out >= today && r.status === 'confirmed'
  ).length;

  // Calcular ocupación
  const occupancyRate = totalRooms > 0 ? Math.round((confirmedReservations / (totalRooms * 30)) * 100) : 0;

  // Calcular datos financieros con validación segura
  const safeNumber = (value: any) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = parseFloat(String(value));
    return isNaN(num) ? 0 : num;
  };

  const totalRevenue = reservations.reduce((sum, r) => sum + safeNumber(r.guest_paid), 0);
  const totalCommissions = reservations.reduce((sum, r) => sum + safeNumber(r.platform_commission), 0);
  const totalNetIncome = reservations.reduce((sum, r) => sum + safeNumber(r.net_income), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
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
        <div className="kpis">
          <div className="kpi">
            <div className="ic" style={{background:'#e0ecff'}}>🏠</div>
            <div>
              <div className="meta">Habitaciones</div>
              <div className="value">{totalRooms}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="ic" style={{background:'#dcfce7'}}>👥</div>
            <div>
              <div className="meta">Huéspedes Hoy</div>
              <div className="value">{guestsToday}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="ic" style={{background:'#fef9c3'}}>📅</div>
            <div>
              <div className="meta">Reservas Activas</div>
              <div className="value">{confirmedReservations}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="ic" style={{background:'#f5e8ff'}}>📈</div>
            <div>
              <div className="meta">Ocupación</div>
              <div className="value">{occupancyRate}%</div>
            </div>
          </div>
        </div>

        {/* Financial Stats */}
        <div className="kpis">
          <div className="kpi" style={{gridColumn: 'span 2'}}>
            <div className="ic" style={{background:'#e5f4ff'}}>💶</div>
            <div>
              <div className="meta">Facturación</div>
              <div className="value">€{totalRevenue.toFixed(2)}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="ic" style={{background:'#ffe4e6'}}>💳</div>
            <div>
              <div className="meta">Comisiones Pagadas</div>
              <div className="value">€{totalCommissions.toFixed(2)}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="ic" style={{background:'#e0ecff'}}>📊</div>
            <div>
              <div className="meta">Ganancia Neta</div>
              <div className="value">€{totalNetIncome.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Acciones rápidas (MVP) */}
        <div className="pricing">
          <Link href="/reservations" className="card group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Reservas
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Gestionar reservas y calendario
                </p>
              </div>
              <div className="text-2xl">📅</div>
            </div>
          </Link>
          <Link href="/guest-registrations-dashboard" className="card group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Registros de formularios
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Ver registros y generar XML
                </p>
              </div>
              <div className="text-2xl">🇪🇸</div>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
          {reservations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay reservas aún</p>
              <p className="text-sm text-gray-400 mt-2">
                Asegúrate de tener tus calendarios conectados y haz clic en "Sincronizar"
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
      </main>
      </div>
    </AdminLayout>
  );
}/ /   D e p l o y m e n t   t r i g g e r   0 9 / 2 5 / 2 0 2 5   1 3 : 1 2 : 0 6  
 / *   W e b h o o k   t e s t   0 9 / 2 5 / 2 0 2 5   1 3 : 3 4 : 2 9   * /  
 