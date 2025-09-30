'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';

type FilterPeriod = 'today' | 'thisWeek' | 'last7Days' | 'thisMonth' | 'last30Days' | 'custom';

export default function HomePage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('thisMonth');
  const [customDateRange, setCustomDateRange] = useState<{from: string, to: string}>({
    from: '',
    to: ''
  });
  const router = useRouter();

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

  // Función para obtener el rango de fechas según el filtro
  const getDateRange = (period: FilterPeriod) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (period) {
      case 'today':
        return { from: todayStr, to: todayStr };
      
      case 'thisWeek':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return { 
          from: startOfWeek.toISOString().split('T')[0], 
          to: endOfWeek.toISOString().split('T')[0] 
        };
      
      case 'last7Days':
        const last7Days = new Date(today);
        last7Days.setDate(today.getDate() - 7);
        return { 
          from: last7Days.toISOString().split('T')[0], 
          to: todayStr 
        };
      
      case 'thisMonth':
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { 
          from: startOfMonth.toISOString().split('T')[0], 
          to: endOfMonth.toISOString().split('T')[0] 
        };
      
      case 'last30Days':
        const last30Days = new Date(today);
        last30Days.setDate(today.getDate() - 30);
        return { 
          from: last30Days.toISOString().split('T')[0], 
          to: todayStr 
        };
      
      case 'custom':
        return customDateRange;
      
      default:
        return { from: todayStr, to: todayStr };
    }
  };

  // Filtrar reservas según el período seleccionado
  const getFilteredReservations = () => {
    if (filterPeriod === 'custom' && (!customDateRange.from || !customDateRange.to)) {
      return reservations;
    }
    
    const dateRange = getDateRange(filterPeriod);
    return reservations.filter(reservation => {
      const checkIn = new Date(reservation.check_in);
      const checkOut = new Date(reservation.check_out);
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      
      // Incluir reservas que se solapan con el rango de fechas
      return (checkIn <= toDate && checkOut >= fromDate);
    });
  };

  const filteredReservations = getFilteredReservations();

  const handleLogout = async () => {
    try {
      // Llamar a la API de logout
      await fetch('/api/auth/logout', { method: 'POST' })
      
      // Eliminar cookie manualmente
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      
      // Redirigir al login
      router.push('/admin-login')
    } catch (error) {
      console.error('Error logging out:', error)
      // Redirigir de todas formas
      router.push('/admin-login')
    }
  };

  // Calcular estadísticas basadas en reservas filtradas
  const totalRooms = 6;
  const totalReservations = filteredReservations.length;
  const confirmedReservations = filteredReservations.filter(r => r.status === 'confirmed').length;
  const today = new Date().toISOString().split('T')[0];
  const guestsToday = filteredReservations.filter(r => 
    r.check_in <= today && r.check_out >= today && r.status === 'confirmed'
  ).length;

  // Calcular ocupación basada en el período filtrado
  const dateRange = getDateRange(filterPeriod);
  const daysInPeriod = Math.ceil((new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const totalRoomDays = totalRooms * daysInPeriod;
  const occupiedRoomDays = filteredReservations.filter(r => r.status === 'confirmed').reduce((sum, r) => {
    const checkIn = new Date(r.check_in);
    const checkOut = new Date(r.check_out);
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    
    // Calcular días ocupados en el período
    const start = checkIn > fromDate ? checkIn : fromDate;
    const end = checkOut < toDate ? checkOut : toDate;
    const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return sum + days;
  }, 0);
  
  const occupancyRate = totalRoomDays > 0 ? Math.round((occupiedRoomDays / totalRoomDays) * 100) : 0;

  // Calcular datos financieros con validación segura
  const safeNumber = (value: any) => {
    if (value === null || value === undefined || value === '') return 0;
    const num = parseFloat(String(value));
    return isNaN(num) ? 0 : num;
  };

  const totalRevenue = filteredReservations.reduce((sum, r) => sum + safeNumber(r.guest_paid), 0);
  const totalCommissions = filteredReservations.reduce((sum, r) => sum + safeNumber(r.platform_commission), 0);
  const totalNetIncome = filteredReservations.reduce((sum, r) => sum + safeNumber(r.net_income), 0);

  // Función para formatear el período seleccionado
  const getPeriodLabel = () => {
    const dateRange = getDateRange(filterPeriod);
    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    };
    
    switch (filterPeriod) {
      case 'today':
        return 'Hoy';
      case 'thisWeek':
        return 'Esta semana';
      case 'last7Days':
        return 'Últimos 7 días';
      case 'thisMonth':
        return 'Este mes';
      case 'last30Days':
        return 'Últimos 30 días';
      case 'custom':
        return `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`;
      default:
        return 'Este mes';
    }
  };

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
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filtros de Período */}
        <div className="card mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">📊 Filtros de Período</h2>
              <p className="text-sm text-gray-600">
                Mostrando datos para: <span className="font-semibold text-blue-600">{getPeriodLabel()}</span>
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Botones de períodos predefinidos */}
              <button
                onClick={() => setFilterPeriod('today')}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'today' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                📅 Hoy
              </button>
              
              <button
                onClick={() => setFilterPeriod('thisWeek')}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'thisWeek' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                📆 Esta semana
              </button>
              
              <button
                onClick={() => setFilterPeriod('last7Days')}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'last7Days' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                ⏰ Últimos 7 días
              </button>
              
              <button
                onClick={() => setFilterPeriod('thisMonth')}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'thisMonth' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                🗓️ Este mes
              </button>
              
              <button
                onClick={() => setFilterPeriod('last30Days')}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'last30Days' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                📈 Últimos 30 días
              </button>
              
              <button
                onClick={() => setFilterPeriod('custom')}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'custom' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                🎯 Personalizado
              </button>
            </div>
          </div>
          
          {/* Selector de fechas personalizado */}
          {filterPeriod === 'custom' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-black mb-1">
                    📅 Fecha desde
                  </label>
                  <input
                    type="date"
                    value={customDateRange.from}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, from: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-bold text-black mb-1">
                    📅 Fecha hasta
                  </label>
                  <input
                    type="date"
                    value={customDateRange.to}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, to: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setCustomDateRange({ from: today, to: today });
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    🔄 Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <Link href="/cost-calculator" className="card group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Calculadora de Costos
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Calcular costos reales por huésped
                </p>
              </div>
              <div className="text-2xl">🧮</div>
            </div>
          </Link>
          <Link href="/aeat" className="card group">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Exportar AEAT
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Generar archivos para Hacienda
                </p>
              </div>
              <div className="text-2xl">🏛️</div>
            </div>
          </Link>
        </div>

        {/* Reservas Actuales y Próximas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Reservas Actuales */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              Reservas Actuales
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredReservations.filter(r => {
                  const checkIn = new Date(r.check_in);
                  const checkOut = new Date(r.check_out);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return checkIn <= today && checkOut > today && r.status === 'confirmed';
                }).length})
              </span>
            </h3>
            {filteredReservations.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">No hay reservas en el período seleccionado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReservations
                  .filter(r => {
                    const checkIn = new Date(r.check_in);
                    const checkOut = new Date(r.check_out);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return checkIn <= today && checkOut > today && r.status === 'confirmed';
                  })
                  .slice(0, 5)
                  .map((reservation) => (
                    <div key={reservation.id} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {reservation.guest_name}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-600 mt-1">
                          <span>👥 {reservation.guest_count || 'N/A'} personas</span>
                          <span>🏨 Hab. {reservation.room_id || 'N/A'}</span>
                          <span>🚪 Check-out: 12:00</span>
                        </div>
                      </div>
                    </div>
                  ))}
                {filteredReservations.filter(r => {
                  const checkIn = new Date(r.check_in);
                  const checkOut = new Date(r.check_out);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return checkIn <= today && checkOut > today && r.status === 'confirmed';
                }).length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-gray-500">No hay huéspedes actuales en el período seleccionado</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Próximas Reservas */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              Próximas Reservas
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({filteredReservations.filter(r => {
                  const checkIn = new Date(r.check_in);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return checkIn > today && r.status === 'confirmed';
                }).length})
              </span>
            </h3>
            {filteredReservations.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">No hay reservas en el período seleccionado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReservations
                  .filter(r => {
                    const checkIn = new Date(r.check_in);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return checkIn > today && r.status === 'confirmed';
                  })
                  .sort((a, b) => new Date(a.check_in).getTime() - new Date(b.check_in).getTime())
                  .slice(0, 5)
                  .map((reservation) => (
                    <div key={reservation.id} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {reservation.guest_name}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-600 mt-1">
                          <span>👥 {reservation.guest_count || 'N/A'} personas</span>
                          <span>🏨 Hab. {reservation.room_id || 'N/A'}</span>
                          <span>🚪 Check-in: 16:00</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(reservation.check_in).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                {filteredReservations.filter(r => {
                  const checkIn = new Date(r.check_in);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return checkIn > today && r.status === 'confirmed';
                }).length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-gray-500">No hay reservas próximas en el período seleccionado</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      </div>
    </AdminLayout>
  );
}