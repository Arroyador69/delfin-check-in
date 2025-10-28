'use client';

import { useState, useEffect } from 'react';
import { Calendar, Users, Euro, CreditCard, CheckCircle, XCircle, Clock, TrendingUp, Eye } from 'lucide-react';
import { DirectReservation, ReservationStats } from '@/lib/direct-reservations-types';

export default function DirectReservationsDashboard() {
  const [reservations, setReservations] = useState<DirectReservation[]>([]);
  const [stats, setStats] = useState<ReservationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, confirmed, pending, cancelled
  const [selectedReservation, setSelectedReservation] = useState<DirectReservation | null>(null);

  useEffect(() => {
    loadReservations();
    loadStats();
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tenant/direct-reservations', {
        headers: {
          'x-tenant-id': 'default' // TODO: Obtener del contexto de usuario
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setReservations(data.reservations);
      }
    } catch (error) {
      console.error('Error cargando reservas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/tenant/reservation-stats', {
        headers: {
          'x-tenant-id': 'default'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
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
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredReservations = reservations.filter(reservation => {
    if (filter === 'all') return true;
    return reservation.reservation_status === filter;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reservas Directas</h1>
          <p className="text-gray-600 mt-2">Gestiona las reservas directas de tus propiedades</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.href = '/settings/properties'}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Ver Propiedades
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Reservas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_reservations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Euro className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_revenue.toFixed(2)}€</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Comisión Delfin</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_commission.toFixed(2)}€</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Reservas Confirmadas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.confirmed_reservations}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todas ({reservations.length})
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'confirmed' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Confirmadas ({reservations.filter(r => r.reservation_status === 'confirmed').length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'pending' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pendientes ({reservations.filter(r => r.reservation_status === 'pending').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'cancelled' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Canceladas ({reservations.filter(r => r.reservation_status === 'cancelled').length})
          </button>
        </div>
      </div>

      {/* Lista de reservas */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reserva
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Huésped
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fechas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReservations.map((reservation) => (
                <tr key={reservation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(reservation.reservation_status)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
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
                      <div className="text-sm font-medium text-gray-900">
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
                    <div className="text-xs text-gray-400">
                      {reservation.nights} noches
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.reservation_status)}`}>
                      {reservation.reservation_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(reservation.payment_status)}`}>
                      {reservation.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {reservation.total_amount.toFixed(2)}€
                    </div>
                    <div className="text-xs text-gray-500">
                      Tu parte: {reservation.property_owner_amount.toFixed(2)}€
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setSelectedReservation(reservation)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Ver detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalles */}
      {selectedReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Detalles de la Reserva</h2>
                <button
                  onClick={() => setSelectedReservation(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Información básica */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Información de la Reserva</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Código:</span> {selectedReservation.reservation_code}
                    </div>
                    <div>
                      <span className="font-medium">Estado:</span> {selectedReservation.reservation_status}
                    </div>
                    <div>
                      <span className="font-medium">Pago:</span> {selectedReservation.payment_status}
                    </div>
                    <div>
                      <span className="font-medium">Fecha creación:</span> {formatDate(selectedReservation.created_at)}
                    </div>
                  </div>
                </div>

                {/* Información del huésped */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Información del Huésped</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Nombre:</span> {selectedReservation.guest_name}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {selectedReservation.guest_email}
                    </div>
                    <div>
                      <span className="font-medium">Teléfono:</span> {selectedReservation.guest_phone || 'No proporcionado'}
                    </div>
                    <div>
                      <span className="font-medium">Nacionalidad:</span> {selectedReservation.guest_nationality || 'No especificada'}
                    </div>
                  </div>
                </div>

                {/* Detalles de la estancia */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Detalles de la Estancia</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Check-in:</span> {formatDate(selectedReservation.check_in_date)}
                    </div>
                    <div>
                      <span className="font-medium">Check-out:</span> {formatDate(selectedReservation.check_out_date)}
                    </div>
                    <div>
                      <span className="font-medium">Noches:</span> {selectedReservation.nights}
                    </div>
                    <div>
                      <span className="font-medium">Huéspedes:</span> {selectedReservation.guests}
                    </div>
                  </div>
                </div>

                {/* Desglose de precios */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Desglose de Precios</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Precio base ({selectedReservation.nights} noches):</span>
                        <span>{(selectedReservation.base_price * selectedReservation.nights).toFixed(2)}€</span>
                      </div>
                      {selectedReservation.cleaning_fee > 0 && (
                        <div className="flex justify-between">
                          <span>Tarifa de limpieza:</span>
                          <span>{selectedReservation.cleaning_fee.toFixed(2)}€</span>
                        </div>
                      )}
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Subtotal:</span>
                        <span>{selectedReservation.subtotal.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Comisión Delfin ({(selectedReservation.delfin_commission_rate * 100).toFixed(1)}%):</span>
                        <span>-{selectedReservation.delfin_commission_amount.toFixed(2)}€</span>
                      </div>
                      <div className="flex justify-between text-green-600 font-medium border-t pt-2">
                        <span>Tu parte:</span>
                        <span>{selectedReservation.property_owner_amount.toFixed(2)}€</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Solicitudes especiales */}
                {selectedReservation.special_requests && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Solicitudes Especiales</h3>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {selectedReservation.special_requests}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
                <button
                  onClick={() => setSelectedReservation(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
