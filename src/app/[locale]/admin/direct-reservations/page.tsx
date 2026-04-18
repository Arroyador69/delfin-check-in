'use client';

import { useState, useEffect } from 'react';
import { Calendar, Users, Euro, CheckCircle, XCircle, Clock, TrendingUp, Eye, Bed } from 'lucide-react';
import { DirectReservation, ReservationStats } from '@/lib/direct-reservations-types';
import { useTranslations, useLocale } from 'next-intl';
import { toIntlDateLocale, type Locale as AppLocale } from '@/i18n/config';

export default function DirectReservationsDashboard() {
  const t = useTranslations('directReservations');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const [reservations, setReservations] = useState<DirectReservation[]>([]);
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');
  const [selectedReservation, setSelectedReservation] = useState<DirectReservation | null>(null);

  useEffect(() => {
    loadReservations();
    loadStats();
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tenant/direct-reservations');
      
      const data = await response.json();
      if (data.success) {
        setReservations(data.reservations);
      }
    } catch (error) {
      console.error('Error loading direct reservations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/tenant/reservation-stats');
      
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error loading direct reservation stats:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200';
      case 'pending':
        return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200';
      case 'cancelled':
        return 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200';
      default:
        return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-200';
      case 'pending':
        return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200';
      case 'failed':
        return 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border border-red-200';
      default:
        return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border border-gray-200';
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    if (filter === 'all') return true;
    return reservation.reservation_status === filter;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(toIntlDateLocale(locale as AppLocale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-5xl font-bold mb-2 sm:mb-4">
            <span className="text-4xl sm:text-6xl mr-2 sm:mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🏠</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('title')}
            </span>
          </h1>
          <p className="text-gray-600 text-sm sm:text-lg">
            {t('subtitle')}
          </p>
        </div>

        {/* Botón Ver Propiedades */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => { window.location.href = `/${locale}/settings/properties`; }}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl shadow-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 flex items-center gap-2 sm:gap-3 font-semibold text-sm sm:text-base"
          >
            <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
            <span>{t('viewPropertiesButton')}</span>
          </button>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-200 hover:shadow-xl transition-all duration-200 transform hover:scale-105">
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-blue-100 to-indigo-100 p-3 rounded-xl">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {t('stats.totalReservations')}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{stats.total_reservations}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-green-200 hover:shadow-xl transition-all duration-200 transform hover:scale-105">
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 p-3 rounded-xl">
                  <Euro className="w-8 h-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {t('stats.totalRevenue')}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{stats.total_revenue.toFixed(2)}€</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-200 hover:shadow-xl transition-all duration-200 transform hover:scale-105">
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-3 rounded-xl">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {t('stats.totalCommission')}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{stats.total_commission.toFixed(2)}€</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-orange-200 hover:shadow-xl transition-all duration-200 transform hover:scale-105">
              <div className="flex items-center">
                <div className="bg-gradient-to-r from-orange-100 to-amber-100 p-3 rounded-xl">
                  <Users className="w-8 h-8 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {t('stats.confirmedReservations')}
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{stats.confirmed_reservations}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-blue-200">
          <div className="flex flex-wrap gap-2 sm:gap-4 justify-center">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                filter === 'all' 
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🌐 {t('filters.all', { count: reservations.length })}
            </button>
            <button
              onClick={() => setFilter('confirmed')}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                filter === 'confirmed' 
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ✅ {t('filters.confirmed', {
                count: reservations.filter(r => r.reservation_status === 'confirmed').length
              })}
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                filter === 'pending' 
                  ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ⏳ {t('filters.pending', {
                count: reservations.filter(r => r.reservation_status === 'pending').length
              })}
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                filter === 'cancelled' 
                  ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ❌ {t('filters.cancelled', {
                count: reservations.filter(r => r.reservation_status === 'cancelled').length
              })}
            </button>
          </div>
        </div>

        {/* Lista de reservas */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    📋 {t('table.headers.reservation')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    👤 {t('table.headers.guest')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    📅 {t('table.headers.dates')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    🎯 {t('table.headers.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    💳 {t('table.headers.payment')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    💰 {t('table.headers.total')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    ⚙️ {t('table.headers.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-8 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                        <Bed className="w-12 h-12 text-blue-600" />
                      </div>
                      <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">
                        {t('table.emptyTitle')}
                      </h3>
                      <p className="text-gray-600 text-sm sm:text-base">
                        {t('table.emptyDescription')}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(reservation.reservation_status)}
                          <div className="ml-3">
                            <div className="text-sm font-semibold text-gray-900">
                              {reservation.reservation_code}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatDate(reservation.created_at)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {reservation.guest_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {reservation.guest_email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(reservation.check_in_date)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(reservation.check_out_date)}
                        </div>
                        <div className="text-xs text-gray-400 font-medium">
                          {t('table.nights', { count: reservation.nights })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(reservation.reservation_status)}`}>
                          {t(`statuses.${reservation.reservation_status}` as const)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPaymentStatusColor(reservation.payment_status)}`}>
                          {t(`paymentStatuses.${reservation.payment_status}` as const)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          {reservation.total_amount.toFixed(2)}€
                        </div>
                        <div className="text-xs text-gray-500">
                          {t('table.ownerShare', {
                            amount: reservation.property_owner_amount.toFixed(2)
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedReservation(reservation)}
                          className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 px-3 py-2 rounded-lg transition-all duration-200 transform hover:scale-105 font-semibold"
                        >
                          👁️ {t('table.viewDetails')}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de detalles */}
        {selectedReservation && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-blue-200">
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl sm:text-3xl font-bold">
                    <span className="text-3xl sm:text-4xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📋</span>
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {t('details.title')}
                    </span>
                  </h2>
                  <button
                    onClick={() => setSelectedReservation(null)}
                    className="text-gray-400 hover:text-gray-600 transition-all hover:scale-110"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Información básica */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                    <h3 className="text-lg sm:text-xl font-semibold mb-3 flex items-center gap-2">
                      <span className="text-xl sm:text-2xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>ℹ️</span>
                      {t('details.basicInfoSection')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">
                          {t('details.codeLabel')}:
                        </span>
                        <span className="ml-2 text-gray-900 font-bold">
                          {selectedReservation.reservation_code}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          {t('details.statusLabel')}:
                        </span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedReservation.reservation_status)}`}>
                          {t(`statuses.${selectedReservation.reservation_status}` as const)}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          {t('details.paymentLabel')}:
                        </span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${getPaymentStatusColor(selectedReservation.payment_status)}`}>
                          {t(`paymentStatuses.${selectedReservation.payment_status}` as const)}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          {t('details.createdAtLabel')}:
                        </span>
                        <span className="ml-2 text-gray-900">
                          {formatDate(selectedReservation.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Información del huésped */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                    <h3 className="text-lg sm:text-xl font-semibold mb-3 flex items-center gap-2">
                      <span className="text-xl sm:text-2xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>👤</span>
                      {t('details.guestSection')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">
                          {t('details.guestNameLabel')}:
                        </span>
                        <span className="ml-2 text-gray-900 font-bold">
                          {selectedReservation.guest_name}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          {t('details.guestEmailLabel')}:
                        </span>
                        <span className="ml-2 text-gray-900">
                          {selectedReservation.guest_email}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          {t('details.guestPhoneLabel')}:
                        </span>
                        <span className="ml-2 text-gray-900">
                          {selectedReservation.guest_phone || t('details.notProvided')}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          {t('details.guestNationalityLabel')}:
                        </span>
                        <span className="ml-2 text-gray-900">
                          {selectedReservation.guest_nationality || t('details.notSpecified')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detalles de la estancia */}
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
                    <h3 className="text-lg sm:text-xl font-semibold mb-3 flex items-center gap-2">
                      <span className="text-xl sm:text-2xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🏨</span>
                      {t('details.staySection')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">
                          {t('details.checkInLabel')}:
                        </span>
                        <span className="ml-2 text-gray-900 font-bold">
                          {formatDate(selectedReservation.check_in_date)}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          {t('details.checkOutLabel')}:
                        </span>
                        <span className="ml-2 text-gray-900 font-bold">
                          {formatDate(selectedReservation.check_out_date)}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          {t('details.nightsLabel')}:
                        </span>
                        <span className="ml-2 text-gray-900 font-bold">
                          {selectedReservation.nights}
                        </span>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          {t('details.guestsLabel')}:
                        </span>
                        <span className="ml-2 text-gray-900 font-bold">
                          {selectedReservation.guests}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Desglose de precios */}
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-200">
                    <h3 className="text-lg sm:text-xl font-semibold mb-3 flex items-center gap-2">
                      <span className="text-xl sm:text-2xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>💰</span>
                      {t('details.pricesSection')}
                    </h3>
                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-700">
                            {t('details.basePriceLine', { nights: selectedReservation.nights })}
                          </span>
                          <span className="font-semibold text-gray-900">
                            {(selectedReservation.base_price * selectedReservation.nights).toFixed(2)}€
                          </span>
                        </div>
                        {selectedReservation.cleaning_fee > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-700">
                              {t('details.cleaningFeeLabel')}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {selectedReservation.cleaning_fee.toFixed(2)}€
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold border-t pt-2 text-gray-900">
                          <span>{t('details.subtotalLabel')}</span>
                          <span>{selectedReservation.subtotal.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between text-red-600 font-semibold">
                          <span>
                            {t('details.commissionLine', {
                              percent: (selectedReservation.delfin_commission_rate * 100).toFixed(1)
                            })}
                          </span>
                          <span>-{selectedReservation.delfin_commission_amount.toFixed(2)}€</span>
                        </div>
                        <div className="flex justify-between text-green-600 font-bold border-t pt-2 text-lg">
                          <span>{t('details.ownerShareLabel')}</span>
                          <span>{selectedReservation.property_owner_amount.toFixed(2)}€</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Solicitudes especiales */}
                  {selectedReservation.special_requests && (
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-200">
                      <h3 className="text-lg sm:text-xl font-semibold mb-3 flex items-center gap-2">
                        <span className="text-xl sm:text-2xl" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>💬</span>
                        {t('details.specialRequestsSection')}
                      </h3>
                      <p className="text-sm text-gray-700 bg-white p-4 rounded-lg border border-gray-200">
                        {selectedReservation.special_requests}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-4 mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedReservation(null)}
                    className="px-6 sm:px-8 py-3 bg-gradient-to-r from-gray-600 to-slate-600 text-white rounded-xl hover:from-gray-700 hover:to-slate-700 font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    {tCommon('close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



