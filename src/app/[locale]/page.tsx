'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { ArrowUpCircle } from 'lucide-react';
import { getRoomNumber } from '@/lib/db';
import UnitLimitWarning from '@/components/UnitLimitWarning';
import { useTranslations, useLocale } from 'next-intl';
import {
  type DashboardFilterPeriod,
  getDateRangeForFilter,
  clipMetricRangeToToday,
  inclusiveDaysBetween,
  overlapNights,
  prorationFactor,
  reservationOverlapsPeriod,
  stayNights,
  safeNum,
  safeGuestCount,
  localTodayYMD,
} from '@/lib/dashboard-period';

type FilterPeriod = DashboardFilterPeriod;

export default function HomePage() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
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

  const getDateRange = (period: FilterPeriod) =>
    getDateRangeForFilter(period, customDateRange);

  const getFilteredReservations = () => {
    if (filterPeriod === 'total') {
      return reservations;
    }
    if (filterPeriod === 'custom' && (!customDateRange.from || !customDateRange.to)) {
      return reservations;
    }
    const dateRange = getDateRangeForFilter(filterPeriod, customDateRange);
    return reservations.filter((reservation) =>
      reservationOverlapsPeriod(reservation.check_in, reservation.check_out, dateRange.from, dateRange.to)
    );
  };

  const filteredReservations = getFilteredReservations();

  const handleLogout = async () => {
    try {
      // Llamar a la API de logout
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' // Importante: incluir cookies para que se eliminen
      })
      
      if (!response.ok) {
        console.error('Error en respuesta de logout:', response.status)
      }
      
      // ⚠️ CRÍTICO: Forzar recarga completa para limpiar cualquier caché
      // Esto asegura que todas las cookies se eliminen correctamente
      // NO usar document.cookie manualmente - la cookie es httpOnly y no se puede eliminar desde JS
      window.location.href = '/admin-login'
      
      // NOTA: Usamos window.location.href en lugar de router.push
      // porque router.push puede no limpiar completamente el estado
      // y las cookies pueden persistir en algunos casos
      
    } catch (error) {
      console.error('Error logging out:', error)
      // Redirigir de todas formas, incluso si hay error
      window.location.href = '/admin-login'
    }
  };

  const totalRooms = tenant?.stats?.rooms_used || rooms.length || 0;
  const totalReservations = filteredReservations.length;
  const confirmedReservations = filteredReservations.filter((r) => r.status === 'confirmed').length;

  const rawRange = getDateRangeForFilter(filterPeriod, customDateRange);
  const metricRange =
    filterPeriod === 'total'
      ? rawRange
      : clipMetricRangeToToday(rawRange.from, rawRange.to);
  const daysInPeriod = Math.max(1, inclusiveDaysBetween(metricRange.from, metricRange.to));

  const confirmed = filteredReservations.filter((r) => r.status === 'confirmed');

  /** Huéspedes: en Total, huéspedes actuales en estancia; en otros períodos, promedio diario (huéspedes-noche / días). */
  let guestsKpi: number;
  if (filterPeriod === 'total') {
    const now = new Date();
    guestsKpi = reservations
      .filter((r) => {
        if (r.status !== 'confirmed') return false;
        const checkIn = new Date(r.check_in);
        const checkOut = new Date(r.check_out);
        return checkIn <= now && checkOut > now;
      })
      .reduce((sum, r) => sum + safeGuestCount(r), 0);
  } else {
    const guestNights = confirmed.reduce(
      (sum, r) =>
        sum + safeGuestCount(r) * overlapNights(r.check_in, r.check_out, metricRange.from, metricRange.to),
      0
    );
    guestsKpi = Math.round(guestNights / daysInPeriod);
  }

  let occupancyRate: number;
  if (filterPeriod === 'total') {
    const yearsInPeriod = Math.max(1, Math.ceil(inclusiveDaysBetween(rawRange.from, rawRange.to) / 365));
    const totalOccupiedDays = confirmed.reduce((sum, r) => sum + stayNights(r.check_in, r.check_out), 0);
    const avgOccupiedDaysPerYear = totalOccupiedDays / yearsInPeriod;
    const totalRoomDaysPerYear = totalRooms * 365;
    occupancyRate =
      totalRoomDaysPerYear > 0 ? Math.round((avgOccupiedDaysPerYear / totalRoomDaysPerYear) * 100) : 0;
  } else {
    const occupiedRoomDays = confirmed.reduce(
      (sum, r) => sum + overlapNights(r.check_in, r.check_out, metricRange.from, metricRange.to),
      0
    );
    const totalRoomDays = totalRooms * daysInPeriod;
    occupancyRate =
      totalRoomDays > 0 ? Math.round((occupiedRoomDays / totalRoomDays) * 100) : 0;
  }

  const totalRevenue =
    filterPeriod === 'total'
      ? confirmed.reduce((sum, r) => sum + safeNum(r.guest_paid), 0)
      : confirmed.reduce(
          (sum, r) =>
            sum + safeNum(r.guest_paid) * prorationFactor(r.check_in, r.check_out, metricRange.from, metricRange.to),
          0
        );
  const totalCommissions =
    filterPeriod === 'total'
      ? confirmed.reduce((sum, r) => sum + safeNum(r.platform_commission), 0)
      : confirmed.reduce(
          (sum, r) =>
            sum +
            safeNum(r.platform_commission) *
              prorationFactor(r.check_in, r.check_out, metricRange.from, metricRange.to),
          0
        );
  const totalNetIncome =
    filterPeriod === 'total'
      ? confirmed.reduce((sum, r) => sum + safeNum(r.net_income), 0)
      : confirmed.reduce(
          (sum, r) =>
            sum +
            safeNum(r.net_income) * prorationFactor(r.check_in, r.check_out, metricRange.from, metricRange.to),
          0
        );

  // Función para formatear el período seleccionado
  const getPeriodLabel = () => {
    const dateRange = getDateRange(filterPeriod);
    const formatDate = (dateStr: string) => {
      if (!dateStr) return t('periodFilters.selectDateRange');
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return t('periodFilters.selectDateRange');
      return date.toLocaleDateString(locale, { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    };
    
    switch (filterPeriod) {
      case 'total':
        return t('periodFilters.totalSince2020');
      case 'annual':
        return t('periodFilters.currentYear');
      case 'today':
        return t('periodFilters.today');
      case 'thisWeek':
        return t('periodFilters.thisWeek');
      case 'last7Days':
        return t('periodFilters.last7Days');
      case 'thisMonth':
        return t('periodFilters.thisMonth');
      case 'last30Days':
        return t('periodFilters.last30Days');
      case 'custom':
        if (!customDateRange.from || !customDateRange.to) {
          return t('periodFilters.selectDateRange');
        }
        return `${formatDate(dateRange.from)} - ${formatDate(dateRange.to)}`;
      default:
        return t('periodFilters.totalSince2020');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="loading mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loadingDashboard')}</p>
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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('title')}</h1>
                <p className="text-xs sm:text-sm text-gray-600">{t('subtitle')}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <div className="text-xs sm:text-sm text-gray-600">
                <span className="inline-flex items-center">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-1 sm:mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="4" />
                  </svg>
                  {t('connected')}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Link
                  href="/upgrade-plan"
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg text-sm sm:text-base"
                >
                  <ArrowUpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-medium">{t('upgradePlan')}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm sm:text-base"
                >
                  {t('logout')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Banner MIR - Solo para usuarios sin módulo MIR activado */}
        {tenant && tenant.tenant && (!tenant.tenant.legal_module || tenant.tenant.plan_type === 'free') && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 sm:p-6 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-blue-900 mb-2">
                  💰 Módulo MIR - Solo 2€/mes (+ IVA)
                </h3>
                <p className="text-sm sm:text-base text-blue-800 mb-2">
                  <strong>Recordatorio:</strong> El envío automático de formularios de huéspedes al Ministerio del Interior es <strong>obligatorio</strong> en España.
                </p>
                <p className="text-sm sm:text-base text-blue-700">
                  Por solo <strong>2€/mes (+ IVA 21%)</strong> puedes tener el módulo MIR activado, que incluye check-in digital automático y envío automático de formularios al gobierno.
                </p>
              </div>
              <Link
                href="/upgrade-plan"
                className="whitespace-nowrap bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-blue-700 font-semibold text-sm sm:text-base transition-colors shadow-md hover:shadow-lg"
              >
                Activar Módulo MIR
              </Link>
            </div>
          </div>
        )}

        {/* Información del Plan */}
        {tenant && tenant.tenant && (
          <div className="card mb-6 sm:mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex flex-col gap-4">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div className="text-2xl sm:text-3xl">🏢</div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                    {tenant.tenant?.name || 'Admin Default'} —{' '}
                    {t(
                      `planTypeNames.${
                        ['free', 'checkin', 'standard', 'pro'].includes(String(tenant.tenant?.plan_type))
                          ? String(tenant.tenant?.plan_type)
                          : 'free'
                      }` as Parameters<typeof t>[0]
                    )}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 break-words">
                    {(() => {
                      const pt = tenant.tenant?.plan_type || 'free';
                      const ex = tenant.tenant?.plan_price_ex_vat;
                      const vatRate = tenant.tenant?.plan_vat_rate ?? 21;
                      const vatAmt = tenant.tenant?.plan_vat_amount;
                      const total = tenant.tenant?.plan_price_total ?? tenant.tenant?.plan_price ?? 0;
                      const line =
                        pt === 'free' || Number(total) === 0
                          ? t('planCardPricingFree')
                          : t('planCardPricingPaid', {
                              ex: Number(ex ?? 0).toFixed(2),
                              rate: vatRate,
                              vat: Number(vatAmt ?? 0).toFixed(2),
                              total: Number(total).toFixed(2),
                            });
                      const feats = tenant.tenant?.plan_features?.length
                        ? tenant.tenant.plan_features.join(' • ')
                        : t('planCardFeaturesFallback');
                      return `${line} • ${feats}`;
                    })()}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="text-left sm:text-right">
                  <div className="text-xs sm:text-sm text-gray-600">
                    {(tenant.tenant?.config as { lodgingType?: string } | undefined)?.lodgingType ===
                    'apartamentos'
                      ? t('roomUsageApartments')
                      : t('roomUsage')}
                  </div>
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
                            {t('limitReached', {
                              used: tenant.stats?.rooms_used || 0,
                              max: tenant.tenant.max_rooms
                            })}
                          </p>
                          <p className="text-xs text-red-700 mt-1">
                            {t('limitReachedAction')}{' '}
                            <Link href="/upgrade-plan" className="underline font-semibold">
                              {t('upgradeLink')}
                            </Link>.
                          </p>
                        </div>
                      ) : tenant.limits.rooms_usage_percentage >= 80 ? (
                        <div className="p-2 bg-orange-50 border border-orange-200 rounded-md">
                          <p className="text-xs sm:text-sm text-orange-800">
                            {t('nearLimit', {
                              used: tenant.stats?.rooms_used || 0,
                              max: tenant.tenant.max_rooms,
                              percentage: tenant.limits.rooms_usage_percentage
                            })}
                          </p>
                          <p className="text-xs text-orange-700 mt-1">
                            {t('nearLimitRemaining', {
                              remaining: tenant.stats?.rooms_remaining || 0
                            })}{' '}
                            <Link href="/upgrade-plan" className="underline font-semibold">
                              {t('nearLimitAction')}
                            </Link>{' '}
                            {t('nearLimitSuffix')}
                          </p>
                        </div>
                      ) : tenant.stats?.rooms_remaining !== undefined && tenant.stats.rooms_remaining > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          {t('unitsAvailableToAdd', {
                            remaining: tenant.stats.rooms_remaining
                          })}
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
                    <span className="font-medium">{t('updatePlan')}</span>
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
                  {t('videoTutorial.title')}
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {t('videoTutorial.description')}
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
                src="https://www.youtube.com/embed/Ttr6aefFLbg"
                title={t('videoTutorial.title')}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <div className="text-center">
              <a
                href="https://youtu.be/Ttr6aefFLbg"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
              >
                {t('videoTutorial.watchOnYouTube')}
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
              <h2 className="text-base sm:text-lg font-semibold text-black mb-2">
                {t('periodFilters.title')}
              </h2>
              <p className="text-xs sm:text-sm text-black">
                {t('periodFilters.showing')}{' '}
                <span className="font-bold text-black">{getPeriodLabel()}</span>
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
                {t('periodFilters.total')}
              </button>
              
              <button
                onClick={() => setFilterPeriod('annual')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'annual' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('periodFilters.annual')}
              </button>
              
              <button
                onClick={() => setFilterPeriod('today')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'today' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('periodFilters.today')}
              </button>
              
              <button
                onClick={() => setFilterPeriod('thisWeek')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'thisWeek' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('periodFilters.thisWeek')}
              </button>
              
              <button
                onClick={() => setFilterPeriod('last7Days')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'last7Days' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('periodFilters.last7Days')}
              </button>
              
              <button
                onClick={() => setFilterPeriod('thisMonth')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'thisMonth' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('periodFilters.thisMonth')}
              </button>
              
              <button
                onClick={() => setFilterPeriod('last30Days')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'last30Days' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('periodFilters.last30Days')}
              </button>
              
              <button
                onClick={() => setFilterPeriod('custom')}
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border transition-colors ${
                  filterPeriod === 'custom' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                }`}
              >
                {t('periodFilters.custom')}
              </button>
            </div>
          </div>
          
          {/* Selector de fechas personalizado */}
          {filterPeriod === 'custom' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-bold text-black mb-1">
                    {t('periodFilters.dateFrom')}
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
                    {t('periodFilters.dateTo')}
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
                      const today = localTodayYMD();
                      setCustomDateRange({ from: today, to: today });
                    }}
                    className="px-4 py-2 bg-gray-100 text-black rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {t('periodFilters.resetButton')}
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
              <div className="meta">{t('kpis.rooms')}</div>
              <div className="value">{totalRooms}</div>
              {tenant && (
                <div className="text-xs text-gray-600 mt-1">
                  {tenant.limits.rooms_remaining === -1 
                    ? t('unlimited') 
                    : t('available', { count: tenant.limits.rooms_remaining })
                  }
                </div>
              )}
            </div>
          </div>

          <div className="kpi">
            <div className="ic" style={{background:'#dcfce7'}}>👥</div>
            <div>
              <div className="meta">
                {filterPeriod === 'total' || filterPeriod === 'today'
                  ? t('kpis.guestsToday')
                  : t('kpis.guestsAvgPerDay')}
              </div>
              <div className="value">{guestsKpi}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="ic" style={{background:'#fef9c3'}}>📅</div>
            <div>
              <div className="meta">{t('kpis.activeReservations')}</div>
              <div className="value">{confirmedReservations}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="ic" style={{background:'#f5e8ff'}}>📈</div>
            <div>
              <div className="meta">{t('kpis.occupancy')}</div>
              <div className="value">{occupancyRate}%</div>
            </div>
          </div>
        </div>

        {/* Financial Stats */}
        <div className="kpis">
          <div className="kpi" style={{gridColumn: 'span 2'}}>
            <div className="ic" style={{background:'#e5f4ff'}}>💶</div>
            <div>
              <div className="meta">{t('kpis.revenue')}</div>
              <div className="value">€{totalRevenue.toFixed(2)}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="ic" style={{background:'#ffe4e6'}}>💳</div>
            <div>
              <div className="meta">{t('kpis.commissionsPaid')}</div>
              <div className="value">€{totalCommissions.toFixed(2)}</div>
            </div>
          </div>

          <div className="kpi">
            <div className="ic" style={{background:'#e0ecff'}}>📊</div>
            <div>
              <div className="meta">{t('kpis.netIncome')}</div>
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
                    {t('quickActions.reservations.title')}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {t('quickActions.reservations.description')}
                  </p>
                </div>
              <div className="text-xl sm:text-2xl flex-shrink-0 ml-2">📅</div>
            </div>
          </Link>
          <Link href="/guest-registrations-dashboard" className="card group">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {t('quickActions.guestRegistrations.title')}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {t('quickActions.guestRegistrations.description')}
                  </p>
                </div>
              <div className="text-xl sm:text-2xl flex-shrink-0 ml-2">🇪🇸</div>
            </div>
          </Link>
          <Link href="/cost-calculator" className="card group">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {t('quickActions.costCalculator.title')}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {t('quickActions.costCalculator.description')}
                </p>
              </div>
              <div className="text-xl sm:text-2xl flex-shrink-0 ml-2">🧮</div>
                </div>
          </Link>
          <Link href="/aeat" className="card group">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {t('quickActions.exportAEAT.title')}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {t('quickActions.exportAEAT.description')}
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
              {t('currentReservations.title')}
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
                <p className="text-gray-500">{t('currentReservations.noReservations')}</p>
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
                          <span>
                            👥 {t('currentReservations.people', {
                              count: reservation.guest_count || 0
                            })}
                          </span>
                          <span>
                            🏨 {t('currentReservations.room', {
                              number: getRoomNumber(reservation.room_id)
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {t('currentReservations.checkIn')}{' '}
                          {new Date(reservation.check_in).toLocaleDateString(locale, { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t('currentReservations.checkOut')}{' '}
                          {new Date(reservation.check_out).toLocaleDateString(locale, { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                {reservations.filter((r) => {
                  const checkIn = new Date(r.check_in);
                  const checkOut = new Date(r.check_out);
                  const now = new Date();
                  
                  // Reserva activa: check-in ya pasó Y check-out es después de ahora
                  return checkIn <= now && checkOut > now && r.status === 'confirmed';
                }).length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-gray-500">{t('currentReservations.noCurrentGuests')}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Próximas Reservas */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              {t('upcomingReservations.title')}
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
                <p className="text-gray-500">{t('upcomingReservations.noReservations')}</p>
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
                          <span>
                            👥 {t('upcomingReservations.people', {
                              count: reservation.guest_count || 0
                            })}
                          </span>
                          <span>
                            🏨 {t('upcomingReservations.room', {
                              number: getRoomNumber(reservation.room_id)
                            })}
                          </span>
                          <span>{t('upcomingReservations.checkInTime')}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(reservation.check_in).toLocaleDateString(locale, { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                      </p>
                        <p className="text-xs text-gray-500">
                          {t('upcomingReservations.checkOutLabel')}{' '}
                          {new Date(reservation.check_out).toLocaleDateString(locale, { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                    </div>
                  </div>
                ))}
                    {reservations.filter((r) => {
                  const checkIn = new Date(r.check_in);
                  const now = new Date();
                  
                  // Reserva futura: check-in es después de ahora
                  return checkIn > now && r.status === 'confirmed';
                    }).length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-gray-500">{t('upcomingReservations.noUpcomingReservations')}</p>
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