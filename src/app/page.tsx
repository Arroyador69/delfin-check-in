'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { ArrowUpCircle } from 'lucide-react';
import { getRoomNumber } from '@/lib/db';
import UnitLimitWarning from '@/components/UnitLimitWarning';

type FilterPeriod = 'total' | 'annual' | 'today' | 'thisWeek' | 'last7Days' | 'thisMonth' | 'last30Days' | 'custom';

export default function HomePage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [tenant, setTenant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('total');
  const [customDateRange, setCustomDateRange] = useState<{from: string, to: string}>({
    from: '',
    to: ''
  });
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  // Recalcular cuando cambie el filtro
  useEffect(() => {
    // Forzar re-render cuando cambie el filtro
    console.log(`🔄 Filtro cambiado a: ${filterPeriod}`);
  }, [filterPeriod, customDateRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Obtener información del tenant
      try {
        const tenantResponse = await fetch('/api/tenant');
        if (tenantResponse.ok) {
          const tenantData = await tenantResponse.json();
          setTenant(tenantData);
        } else {
          console.warn('Error obteniendo tenant:', tenantResponse.status);
          setTenant(null);
        }
      } catch (error) {
        console.warn('Error en API tenant:', error);
        setTenant(null);
      }
      
      // Obtener habitaciones
      try {
        const roomsResponse = await fetch('/api/rooms');
        if (roomsResponse.ok) {
          const roomsData = await roomsResponse.json();
          setRooms(roomsData);
        } else {
          setRooms([]);
        }
      } catch (error) {
        console.warn('Error obteniendo habitaciones:', error);
        setRooms([]);
      }
      
      // Obtener reservas
      try {
        const reservationsResponse = await fetch('/api/reservations');
        if (reservationsResponse.ok) {
          const reservationsData = await reservationsResponse.json();
          setReservations(reservationsData);
        } else {
          setReservations([]);
        }
      } catch (error) {
        console.warn('Error obteniendo reservas:', error);
        setReservations([]);
      }
      
    } catch (error) {
      console.error('Error general cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener el rango de fechas según el filtro
  const getDateRange = (period: FilterPeriod) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    switch (period) {
      case 'total':
        return { from: '2020-01-01', to: todayStr }; // Desde el inicio hasta hoy
      
      case 'annual':
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear(), 11, 31);
        return { 
          from: startOfYear.toISOString().split('T')[0], 
          to: endOfYear.toISOString().split('T')[0] 
        };
      
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
        return { from: '2020-01-01', to: todayStr };
    }
  };

  // Filtrar reservas según el período seleccionado
  const getFilteredReservations = () => {
    // Para "Total", mostrar TODAS las reservas sin filtrar
    if (filterPeriod === 'total') {
      console.log(`🔍 Filtro: ${filterPeriod} - MOSTRANDO TODAS LAS RESERVAS`);
      console.log(`📊 Total reservas: ${reservations.length}`);
      return reservations;
    }
    
    if (filterPeriod === 'custom' && (!customDateRange.from || !customDateRange.to)) {
      console.log(`🔍 Filtro: ${filterPeriod} - RANGO PERSONALIZADO VACÍO, MOSTRANDO TODAS`);
      return reservations;
    }
    
    const dateRange = getDateRange(filterPeriod);
    
    // Debug: Mostrar información del filtro
    console.log(`🔍 Filtro: ${filterPeriod}`);
    console.log(`📅 Rango: ${dateRange.from} - ${dateRange.to}`);
    console.log(`📊 Total reservas: ${reservations.length}`);
    
    const filtered = reservations.filter(reservation => {
      const checkIn = new Date(reservation.check_in);
      const checkOut = new Date(reservation.check_out);
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      
      // Ajustar fechas para comparación correcta (solo fecha, sin hora)
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(23, 59, 59, 999);
      
      // Incluir reservas que se solapan con el rango de fechas
      const overlaps = checkIn <= toDate && checkOut >= fromDate;
      
      if (overlaps) {
        console.log(`✅ Reserva incluida: ${reservation.guest_name} (${reservation.check_in} - ${reservation.check_out})`);
      }
      
      return overlaps;
    });
    
    console.log(`✅ Reservas filtradas: ${filtered.length}`);
    return filtered;
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
  
  const guestsToday = filteredReservations.filter(r => {
    const checkIn = new Date(r.check_in);
    const checkOut = new Date(r.check_out);
    const now = new Date();
    
    // Huéspedes actuales: check-in ya pasó Y check-out es después de ahora
    return checkIn <= now && checkOut > now && r.status === 'confirmed';
  }).length;

  // Calcular ocupación basada en el período filtrado
  const dateRange = getDateRange(filterPeriod);
  const daysInPeriod = Math.ceil((new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  // Calcular ocupación basada en el período filtrado
  let occupancyRate;
  if (filterPeriod === 'total') {
    // Para Total, calcular ocupación promedio anual (más realista)
    const yearsInPeriod = Math.max(1, Math.ceil(daysInPeriod / 365));
    const totalOccupiedDays = filteredReservations.filter(r => r.status === 'confirmed').reduce((sum, r) => {
      const checkIn = new Date(r.check_in);
      const checkOut = new Date(r.check_out);
      const days = Math.max(0, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
      return sum + days;
    }, 0);
    
    const avgOccupiedDaysPerYear = totalOccupiedDays / yearsInPeriod;
    const totalRoomDaysPerYear = totalRooms * 365;
    occupancyRate = totalRoomDaysPerYear > 0 ? Math.round((avgOccupiedDaysPerYear / totalRoomDaysPerYear) * 100) : 0;
    
    console.log(`📊 Total - Años: ${yearsInPeriod}, Días ocupados total: ${totalOccupiedDays}, Promedio anual: ${avgOccupiedDaysPerYear}, Ocupación: ${occupancyRate}%`);
  } else {
    // Para otros períodos, usar el cálculo normal
    const totalRoomDays = totalRooms * daysInPeriod;
    const occupiedRoomDays = filteredReservations.filter(r => r.status === 'confirmed').reduce((sum, r) => {
      const checkIn = new Date(r.check_in);
      const checkOut = new Date(r.check_out);
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      
      
      const start = checkIn > fromDate ? checkIn : fromDate;
      const end = checkOut < toDate ? checkOut : toDate;
      const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      return sum + days;
    }, 0);
    
    occupancyRate = totalRoomDays > 0 ? Math.round((occupiedRoomDays / totalRoomDays) * 100) : 0;
    console.log(`📊 ${filterPeriod} - Días período: ${daysInPeriod}, Días ocupados: ${occupiedRoomDays}, Ocupación: ${occupancyRate}%`);
  }

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
      if (!dateStr) return 'Fecha no seleccionada';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    };
    
    switch (filterPeriod) {
      case 'total':
        return 'Total (desde 2020)';
      case 'annual':
        return 'Año actual';
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
        if (!customDateRange.from || !customDateRange.to) {
          return 'Selecciona un rango de fechas';
        }
        return `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`;
      default:
        return 'Total (desde 2020)';
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
        {/* Advertencia de límite de unidades */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <UnitLimitWarning />
        </div>
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4">
            <div className="flex items-center">
              <div className="text-2xl sm:text-3xl mr-2 sm:mr-3">🐬</div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Delfín Check-in</h1>
                <p className="text-xs sm:text-sm text-gray-600">Gestión inteligente de habitaciones</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <div className="text-xs sm:text-sm text-gray-600">
                <span className="inline-flex items-center">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="4" />
                  </svg>
                  Conectado
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Link
                  href="/upgrade-plan"
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg text-sm sm:text-base"
                >
                  <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-medium">Mejorar Plan</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm sm:text-base"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Información del Plan */}
        {tenant && tenant.tenant && (
          <div className="card mb-6 sm:mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex flex-col gap-4">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="text-2xl sm:text-3xl">🏢</div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                    {tenant.tenant?.name || 'Admin Default'} - Plan {tenant.tenant?.plan_name || 'Básico'}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 break-words">
                    €{tenant.tenant?.plan_price || 29}/mes • {tenant.tenant?.plan_features?.join(' • ') || 'Características básicas'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-left sm:text-right">
                  <div className="text-xs sm:text-sm text-gray-600">Uso de habitaciones</div>
                  <div className="text-base sm:text-lg font-bold text-gray-900">
                    {tenant.stats?.rooms_used || 0}/{tenant.tenant?.max_rooms === -1 ? '∞' : (tenant.tenant?.max_rooms || 2)}
                  </div>
                  {tenant.tenant?.max_rooms !== -1 && (
                    <div className="w-24 sm:w-32 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          (tenant.limits?.rooms_usage_percentage || 0) >= 100 
                            ? 'bg-red-600' 
                            : (tenant.limits?.rooms_usage_percentage || 0) >= 80 
                            ? 'bg-orange-500' 
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${tenant.limits?.rooms_usage_percentage || 0}%` }}
                      ></div>
                    </div>
                  )}
                  {/* Mensajes informativos de límites */}
                  {tenant.limits && tenant.tenant && tenant.tenant.max_rooms !== -1 && (
                    <div className="mt-2">
                      {tenant.limits.rooms_usage_percentage >= 100 ? (
                        <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-xs sm:text-sm text-red-800 font-medium">
                            ⚠️ Límite alcanzado: Has usado todas las habitaciones de tu plan ({tenant.stats?.rooms_used || 0}/{tenant.tenant.max_rooms}).
                          </p>
                          <p className="text-xs text-red-700 mt-1">
                            Para añadir más habitaciones, actualiza tu plan desde la página de <Link href="/upgrade-plan" className="underline font-semibold">Mejora de Plan</Link>.
                          </p>
                        </div>
                      ) : tenant.limits.rooms_usage_percentage >= 80 ? (
                        <div className="p-2 bg-orange-50 border border-orange-200 rounded-md">
                          <p className="text-xs sm:text-sm text-orange-800">
                            ⚡ Estás cerca del límite: {tenant.stats?.rooms_used || 0}/{tenant.tenant.max_rooms} habitaciones ({tenant.limits.rooms_usage_percentage}% usado).
                          </p>
                          <p className="text-xs text-orange-700 mt-1">
                            Te quedan {tenant.stats?.rooms_remaining || 0} habitaciones disponibles. Considera <Link href="/upgrade-plan" className="underline font-semibold">actualizar tu plan</Link> si necesitas más capacidad.
                          </p>
                        </div>
                      ) : tenant.stats?.rooms_remaining !== undefined && tenant.stats.rooms_remaining > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          ✅ {tenant.stats.rooms_remaining} habitaciones disponibles para añadir
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {tenant.limits && !tenant.limits.can_add_rooms && (
                  <Link
                    href="/upgrade-plan"
                    className="px-3 sm:px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-md hover:from-orange-600 hover:to-red-600 transition-all duration-200 flex items-center justify-center space-x-2 text-sm sm:text-base shadow-md"
                  >
                    <ArrowUpCircle className="w-4 h-4" />
                    <span className="font-medium">Actualizar Plan</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Video Tutorial */}
        <div className="card mb-6 sm:mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex flex-col gap-4">
            <div className="flex items-center space-x-3">
              <div className="text-2xl sm:text-3xl">🎥</div>
              <div className="flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  Video Tutorial - Panel de Usuario
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Aprende a usar todas las funcionalidades de Delfín Check-in
                </p>
              </div>
            </div>
            <div className="w-full" style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px' }}>
              <iframe
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: '12px'
                }}
                src="https://www.youtube.com/embed/pHm49uVLYVc"
                title="Video Tutorial - Panel de Usuario Delfín Check-in"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="text-center">
              <a
                href="https://youtu.be/pHm49uVLYVc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
              >
                Ver en YouTube
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Filtros de Período */}
        <div className="card mb-6 sm:mb-8">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-black mb-2">📊 Filtros de Período</h2>
              <p className="text-xs sm:text-sm text-black">
                Mostrando datos para: <span className="font-bold text-black">{getPeriodLabel()}</span>
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Botones de períodos predefinidos */}
              <button
                onClick={() => setFilterPeriod('total')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'total' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                📊 Total
              </button>
              
              <button
                onClick={() => setFilterPeriod('annual')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'annual' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                📅 Anual
              </button>
              
              <button
                onClick={() => setFilterPeriod('today')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'today' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                📅 Hoy
              </button>
              
              <button
                onClick={() => setFilterPeriod('thisWeek')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'thisWeek' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                📆 Esta semana
              </button>
              
              <button
                onClick={() => setFilterPeriod('last7Days')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'last7Days' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                ⏰ Últimos 7 días
              </button>
              
              <button
                onClick={() => setFilterPeriod('thisMonth')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'thisMonth' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                🗓️ Este mes
              </button>
              
              <button
                onClick={() => setFilterPeriod('last30Days')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'last30Days' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                📈 Últimos 30 días
              </button>
              
              <button
                onClick={() => setFilterPeriod('custom')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'custom' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
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
                    className="px-4 py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors"
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
              {tenant && (
                <div className="text-xs text-gray-600 mt-1">
                  {tenant.limits.rooms_remaining === -1 
                    ? 'Ilimitadas' 
                    : `${tenant.limits.rooms_remaining} disponibles`
                  }
                </div>
              )}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Link href="/reservations" className="card group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Reservas
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Gestionar reservas y calendario
                  </p>
                </div>
              <div className="text-xl sm:text-2xl flex-shrink-0 ml-2">📅</div>
            </div>
          </Link>
          <Link href="/guest-registrations-dashboard" className="card group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Registros de formularios
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    Ver registros y generar XML
                  </p>
                </div>
              <div className="text-xl sm:text-2xl flex-shrink-0 ml-2">🇪🇸</div>
            </div>
          </Link>
          <Link href="/cost-calculator" className="card group">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Calculadora de Costos
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Calcular costos reales por huésped
                </p>
              </div>
              <div className="text-xl sm:text-2xl flex-shrink-0 ml-2">🧮</div>
                </div>
          </Link>
          <Link href="/aeat" className="card group">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Exportar AEAT
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Generar archivos para Hacienda
                </p>
              </div>
              <div className="text-xl sm:text-2xl flex-shrink-0 ml-2">🏛️</div>
            </div>
          </Link>
        </div>

        {/* Reservas Actuales y Próximas - SIEMPRE muestran datos de hoy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mt-8">
          {/* Reservas Actuales */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              Reservas Actuales
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({reservations.filter(r => {
                  const checkIn = new Date(r.check_in);
                  const checkOut = new Date(r.check_out);
                  const now = new Date();
                  
                  // Reserva activa: check-in ya pasó Y check-out es después de ahora
                  return checkIn <= now && checkOut > now && r.status === 'confirmed';
                }).length})
              </span>
            </h3>
            {reservations.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">No hay reservas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reservations
                  .filter(r => {
                    const checkIn = new Date(r.check_in);
                    const checkOut = new Date(r.check_out);
                    const now = new Date();
                    
                    // Reserva activa: check-in ya pasó Y check-out es después de ahora
                    return checkIn <= now && checkOut > now && r.status === 'confirmed';
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
                          <span>🏨 Hab. {getRoomNumber(reservation.room_id)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          🟢 Check-in: {new Date(reservation.check_in).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-500">
                          🔴 Check-out: {new Date(reservation.check_out).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
                {reservations.filter(r => {
                  const checkIn = new Date(r.check_in);
                  const checkOut = new Date(r.check_out);
                  const now = new Date();
                  
                  // Reserva activa: check-in ya pasó Y check-out es después de ahora
                  return checkIn <= now && checkOut > now && r.status === 'confirmed';
                }).length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-gray-500">No hay huéspedes actuales</p>
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
                ({reservations.filter(r => {
                  const checkIn = new Date(r.check_in);
                  const now = new Date();
                  
                  // Reserva futura: check-in es después de ahora
                  return checkIn > now && r.status === 'confirmed';
                }).length})
              </span>
            </h3>
            {reservations.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">No hay reservas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reservations
                  .filter(r => {
                    const checkIn = new Date(r.check_in);
                    const now = new Date();
                    
                    // Reserva futura: check-in es después de ahora
                    return checkIn > now && r.status === 'confirmed';
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
                          <span>🏨 Hab. {getRoomNumber(reservation.room_id)}</span>
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
                        <p className="text-xs text-gray-500">
                          🔴 Check-out: {new Date(reservation.check_out).toLocaleDateString('es-ES', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                    </div>
                  </div>
                ))}
                {reservations.filter(r => {
                  const checkIn = new Date(r.check_in);
                  const now = new Date();
                  
                  // Reserva futura: check-in es después de ahora
                  return checkIn > now && r.status === 'confirmed';
                }).length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-gray-500">No hay reservas próximas</p>
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