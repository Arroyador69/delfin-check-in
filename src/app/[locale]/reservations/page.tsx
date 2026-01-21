'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Calendar, User, Bed, Euro, CreditCard, Download, Phone, Users, Globe, Edit } from 'lucide-react';
import { getRoomNumber } from '@/lib/db';
// Base de datos: Neon PostgreSQL

interface Reservation {
  id: string;
  external_id: string;
  room_id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_count?: number;
  check_in: string;
  check_out: string;
  channel: 'airbnb' | 'booking' | 'manual';
  total_price: number;
  guest_paid: number;
  platform_commission: number;
  net_income: number;
  currency: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
}

interface Room {
  id: string;
  name: string;
  basePrice: number;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState<Reservation | null>(null);
  const [reservationToEdit, setReservationToEdit] = useState<Reservation | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [formData, setFormData] = useState({
    room_id: '',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guest_count: 1,
    check_in: '',
    check_out: '',
    total_price: '',
    guest_paid: '',
    platform_commission: '',
    currency: 'EUR',
    status: 'confirmed' as 'confirmed' | 'cancelled' | 'completed',
    channel: 'manual' as 'airbnb' | 'booking' | 'manual',
  });

  // Cargar datos al montar el componente
  // La autenticación ya está manejada por el middleware
  useEffect(() => {
    fetchReservations();
    fetchRooms();
  }, []);

  // Limpiar búsqueda cuando se actualicen las reservas
  useEffect(() => {
    if (isSearching) {
      handleSearch();
    }
  }, [reservations, rooms]);

  // Función de búsqueda
  const handleSearch = () => {
    if (!searchTerm.trim()) {
      setFilteredReservations([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const term = searchTerm.toLowerCase().trim();
    
    const filtered = reservations.filter(reservation => {
      // Buscar en nombre del huésped
      if (reservation.guest_name?.toLowerCase().includes(term)) return true;
      
      // Buscar en teléfono
      if (reservation.guest_phone?.toLowerCase().includes(term)) return true;
      
      // Buscar en email
      if (reservation.guest_email?.toLowerCase().includes(term)) return true;
      
      // Buscar en ID externo (booking, airbnb)
      if (reservation.external_id?.toLowerCase().includes(term)) return true;
      
      // Buscar en canal (booking, airbnb, manual)
      if (reservation.channel?.toLowerCase().includes(term)) return true;
      
      // Buscar en nombre de habitación
      const room = rooms.find(r => r.id === reservation.room_id);
      if (room?.name?.toLowerCase().includes(term)) return true;
      
      return false;
    });
    
    setFilteredReservations(filtered);
  };

  // Limpiar búsqueda
  const clearSearch = () => {
    setSearchTerm('');
    setFilteredReservations([]);
    setIsSearching(false);
  };

  // Obtener las reservas a mostrar (filtradas o todas)
  const displayReservations = isSearching ? filteredReservations : reservations;

  const fetchReservations = async () => {
    try {
      setError(null);
      const response = await fetch('/api/reservations');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener las reservas');
      }

      // Sanitizar los datos para evitar errores de toFixed
      const sanitizedReservations = (data || []).map((reservation: any) => {
        // Asegurar que todos los campos numéricos sean válidos
        const safeNumber = (val: any) => {
          if (val === null || val === undefined || val === '') return 0;
          const num = parseFloat(String(val));
          return isNaN(num) ? 0 : num;
        };

        return {
          ...reservation,
          guest_paid: safeNumber(reservation.guest_paid),
          total_price: safeNumber(reservation.total_price),
          platform_commission: safeNumber(reservation.platform_commission),
          net_income: safeNumber(reservation.net_income),
        };
      });

      setReservations(sanitizedReservations);
    } catch (error: any) {
      console.error('Error fetching reservations:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      console.log('🔍 DEBUG: Iniciando fetchRooms...');
      const response = await fetch('/api/tenant/rooms');
      const data = await response.json();
      
      console.log('🔍 DEBUG: Respuesta de /api/tenant/rooms:', response.status, data);
      
      if (response.ok && data.success) {
        console.log('🔍 DEBUG: Habitaciones obtenidas:', data.rooms);
        // La API devuelve { success: true, rooms: [...] }
        setRooms(data.rooms || []);
      } else {
        console.error('❌ DEBUG: Error en respuesta:', data);
      }
    } catch (error) {
      console.error('❌ DEBUG: Error fetching rooms:', error);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.room_id || !formData.guest_name || !formData.check_in || !formData.check_out) {
      alert('Por favor, completa todos los campos obligatorios');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          total_price: parseFloat(formData.total_price) || 0,
          guest_paid: parseFloat(formData.guest_paid) || parseFloat(formData.total_price) || 0,
          platform_commission: parseFloat(formData.platform_commission) || 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear la reserva');
      }

      const newReservation = await response.json();
      setReservations(prev => [newReservation, ...prev]);
      setShowCreateModal(false);
      resetForm();
      alert('Reserva creada exitosamente');
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      alert(`Error al crear la reserva: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      room_id: '',
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      guest_count: 1,
      check_in: '',
      check_out: '',
      total_price: '',
      guest_paid: '',
      platform_commission: '',
      currency: 'EUR',
      status: 'confirmed' as 'confirmed' | 'cancelled' | 'completed',
      channel: 'manual' as 'airbnb' | 'booking' | 'manual',
    });
  };

  const handleEditClick = (reservation: Reservation) => {
    setReservationToEdit(reservation);
    setFormData({
      room_id: reservation.room_id,
      guest_name: reservation.guest_name,
      guest_email: reservation.guest_email || '',
      guest_phone: reservation.guest_phone || '',
      guest_count: reservation.guest_count || 1,
      check_in: reservation.check_in.split('T')[0], // Solo la fecha
      check_out: reservation.check_out.split('T')[0], // Solo la fecha
      total_price: reservation.total_price?.toString() || '',
      guest_paid: reservation.guest_paid?.toString() || '',
      platform_commission: reservation.platform_commission?.toString() || '',
      currency: reservation.currency || 'EUR',
      status: reservation.status || 'confirmed' as 'confirmed' | 'cancelled' | 'completed',
      channel: reservation.channel || 'manual',
    });
    setShowEditModal(true);
  };

  const handleUpdateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservationToEdit) return;

    setUpdating(true);
    try {
      const response = await fetch('/api/reservations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: reservationToEdit.id,
          ...formData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar la reserva');
      }

      const updatedReservation = await response.json();
      
      // Actualizar la lista de reservas
      setReservations(prev => 
        prev.map(res => 
          res.id === updatedReservation.id ? updatedReservation : res
        )
      );

      setShowEditModal(false);
      setReservationToEdit(null);
      resetForm();
      
      alert('✅ Reserva actualizada correctamente');
    } catch (error: any) {
      console.error('Error updating reservation:', error);
      alert(`❌ Error al actualizar la reserva: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteClick = (reservation: Reservation) => {
    setReservationToDelete(reservation);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!reservationToDelete) return;

    setDeleting(reservationToDelete.id);
    try {
      const response = await fetch(`/api/reservations/${reservationToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar la reserva');
      }

      // Eliminar de la lista local
      setReservations(prev => prev.filter(r => r.id !== reservationToDelete.id));
      setShowDeleteModal(false);
      setReservationToDelete(null);
      setConfirmDelete(false);
      alert('Reserva eliminada exitosamente');
    } catch (error: any) {
      console.error('Error deleting reservation:', error);
      alert(`Error al eliminar la reserva: ${error.message}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setReservationToDelete(null);
    setConfirmDelete(false);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'cancelled': return 'Cancelada';
      case 'completed': return 'Completada';
      default: return status;
    }
  };

  const getChannelText = (channel: string) => {
    switch (channel) {
      case 'airbnb': return 'Airbnb';
      case 'booking': return 'Booking.com';
      case 'manual': return 'Manual';
      default: return channel;
    }
  };

  // Función helper para formatear números de forma segura
  const safeFormatCurrency = (value: any): string => {
    try {
      if (value === null || value === undefined || value === '') {
        return '0.00';
      }
      
      const num = typeof value === 'number' ? value : parseFloat(String(value));
      
      if (isNaN(num)) {
        return '0.00';
      }
      
      return num.toFixed(2);
    } catch (error) {
      console.warn('Error formatting currency:', error);
      return '0.00';
    }
  };

  // La autenticación se valida en middleware; no usamos estado de carga aquí


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">Cargando reservas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-red-200 p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-bold text-red-800">❌ Error al cargar las reservas</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p className="font-medium">{error}</p>
                  <p className="mt-4">
                    <button 
                      onClick={fetchReservations}
                      className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-pink-700 font-semibold transition-all duration-200 transform hover:scale-105"
                    >
                      🔄 Intentar de nuevo
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
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
            <span className="text-4xl sm:text-6xl mr-2 sm:mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📅</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Gestión de Reservas
            </span>
          </h1>
          <p className="text-gray-600 text-sm sm:text-lg">Crea y gestiona las reservas de tus clientes</p>
        </div>

        {/* Barra de búsqueda */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 mb-4 sm:mb-6 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🔍</span>
              Buscar Reservas
            </h3>
            {isSearching && (
              <button
                onClick={clearSearch}
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                Buscar por nombre, teléfono, email, habitación, booking, airbnb...
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Ej: Juan, +34612345678, habitación 1, booking123..."
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={handleSearch}
              disabled={!searchTerm.trim()}
              className="px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Buscar
            </button>
          </div>
          
          {isSearching && (
            <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-800 font-semibold">
                <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🔍</span> Búsqueda activa: "{searchTerm}" - {filteredReservations.length} resultado{filteredReservations.length !== 1 ? 's' : ''} encontrado{filteredReservations.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📋</span>
                Gestión de Reservas
              </h2>
              <p className="text-sm text-gray-600 font-medium">Crear y gestionar reservas de clientes</p>
              {displayReservations.length > 0 && (
                <p className="text-xs text-blue-700 mt-1 font-semibold">
                  {displayReservations.length} reserva{displayReservations.length !== 1 ? 's' : ''} encontrada{displayReservations.length !== 1 ? 's' : ''}
                  {isSearching && ` (de ${reservations.length} total)`}
                </p>
              )}
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 flex items-center space-x-2 font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <Plus className="h-5 w-5" />
              <span>Nueva Reserva</span>
            </button>
          </div>
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    🏠 Habitación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    👤 Huésped
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    📞 Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    👥 Personas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    📅 Llegada
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    📤 Salida
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    🎯 Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    💰 Pagó Huésped
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    💎 Comisión
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    💵 Tu Ganancia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    🌐 Canal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    ⚙️ Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {displayReservations.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-12 text-center">
                      <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-8 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                        <Bed className="w-12 h-12 text-blue-600" />
                      </div>
                      <div className="text-gray-700">
                        {isSearching ? (
                          <>
                            <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">No se encontraron resultados</h3>
                            <p className="text-gray-600 text-sm sm:text-base mb-4">No hay reservas que coincidan con "{searchTerm}"</p>
                            <button
                              onClick={clearSearch}
                              className="mt-3 text-blue-600 hover:text-blue-800 underline"
                            >
                              Ver todas las reservas
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="text-lg mb-2">No hay reservas disponibles</div>
                            <div className="text-sm">Las reservas aparecerán aquí cuando las crees</div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayReservations.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rooms.find(r => r.id === reservation.room_id)?.name || `Habitación ${getRoomNumber(reservation.room_id)}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{reservation.guest_name}</div>
                        {reservation.guest_email && (
                          <div className="text-xs text-gray-500">{reservation.guest_email}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reservation.guest_phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {reservation.guest_count || 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(reservation.check_in)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(reservation.check_out)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reservation.status)}`}>
                        {getStatusText(reservation.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      €{safeFormatCurrency(reservation.guest_paid || reservation.total_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      €{safeFormatCurrency(reservation.platform_commission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                      €{safeFormatCurrency(reservation.net_income)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getChannelText(reservation.channel)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditClick(reservation)}
                        className="text-gray-700 hover:text-gray-900 mr-3"
                        title="Ver/editar reserva"
                      >
                        Ver
                      </button>
                      {/* Botón Check-in retirado a petición del usuario */}
                      <button
                        onClick={() => handleEditClick(reservation)}
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 px-3 py-1.5 rounded-lg mr-2 flex items-center transition-all duration-200 transform hover:scale-105 font-semibold text-sm"
                        title="Editar reserva"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(reservation)}
                        disabled={deleting === reservation.id}
                        className="bg-gradient-to-r from-red-50 to-pink-50 text-red-700 hover:from-red-100 hover:to-pink-100 px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 font-semibold text-sm"
                      >
                        {deleting === reservation.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {displayReservations.length === 0 && !error && !isSearching && (
          <div className="text-center py-12 bg-white">
            <div className="text-black text-lg mb-4 font-medium">No hay reservas disponibles</div>
            <p className="text-black mb-6">Las reservas aparecerán aquí cuando se sincronicen desde Airbnb y Booking.com o las crees manualmente</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
            >
              <Plus className="h-5 w-5" />
              <span>Crear Primera Reserva</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal para crear nueva reserva */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-2 border-blue-200">
            <div className="flex items-center justify-between p-6 border-b-2 border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
              <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                <span className="text-3xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>➕</span>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Nueva Reserva Manual
                </span>
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-all duration-200 transform hover:scale-110"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateReservation} className="p-6 space-y-6 bg-gradient-to-br from-white to-blue-50">
              {/* Información de la habitación */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-xl border-2 border-blue-200">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                  <span className="text-lg mr-2">🏠</span>
                  Información de la Reserva
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🛏️ Habitación *
                    </label>
                    <select
                      required
                      value={formData.room_id}
                      onChange={(e) => setFormData({...formData, room_id: e.target.value})}
                      className="w-full px-3 py-2 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium transition-all"
                    >
                      <option value="">Seleccionar habitación</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>
                          {room.name} - €{room.basePrice}/noche
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ✅ Estado *
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-3 py-2 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium transition-all"
                    >
                      <option value="confirmed">✅ Confirmada</option>
                      <option value="completed">✨ Completada</option>
                      <option value="cancelled">❌ Cancelada</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Información del huésped */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-xl border-2 border-green-200">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                  <span className="text-lg mr-2">👤</span>
                  Información del Huésped
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      👤 Nombre del huésped *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.guest_name}
                      onChange={(e) => setFormData({...formData, guest_name: e.target.value})}
                      placeholder="Nombre completo"
                      className="w-full px-3 py-2 border-2 border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white font-medium transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📧 Email del huésped
                    </label>
                    <input
                      type="email"
                      value={formData.guest_email}
                      onChange={(e) => setFormData({...formData, guest_email: e.target.value})}
                      placeholder="email@ejemplo.com"
                      className="w-full px-3 py-2 border-2 border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white font-medium text-black placeholder-gray-500 transition-all"
                    />
                  </div>
                </div>

                {/* Información adicional del huésped */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📞 Teléfono del huésped
                    </label>
                    <input
                      type="tel"
                      value={formData.guest_phone}
                      onChange={(e) => setFormData({...formData, guest_phone: e.target.value})}
                      placeholder="+34 600 000 000"
                      className="w-full px-3 py-2 border-2 border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white font-medium text-black placeholder-gray-500 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      👥 Número de personas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      required
                      value={formData.guest_count}
                      onChange={(e) => setFormData({...formData, guest_count: parseInt(e.target.value) || 1})}
                      className="w-full px-3 py-2 border-2 border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white font-medium transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Fechas */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-100 p-4 rounded-xl border-2 border-orange-200">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                  <span className="text-lg mr-2">📅</span>
                  Fechas de Estancia
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📥 Fecha de llegada *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.check_in}
                      onChange={(e) => setFormData({...formData, check_in: e.target.value})}
                      className="w-full px-3 py-2 border-2 border-orange-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-medium text-black transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📤 Fecha de salida *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.check_out}
                      onChange={(e) => setFormData({...formData, check_out: e.target.value})}
                      className="w-full px-3 py-2 border-2 border-orange-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-medium text-black transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Información financiera */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-100 p-4 rounded-xl border-2 border-yellow-200">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                  <span className="text-lg mr-2">💰</span>
                  Información Financiera
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      💵 Precio total
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.total_price}
                      onChange={(e) => setFormData({...formData, total_price: e.target.value})}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border-2 border-yellow-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white font-medium transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      💳 Pagó huésped
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.guest_paid}
                      onChange={(e) => setFormData({...formData, guest_paid: e.target.value})}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border-2 border-yellow-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white font-medium transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      💎 Comisión plataforma
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.platform_commission}
                      onChange={(e) => setFormData({...formData, platform_commission: e.target.value})}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border-2 border-yellow-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white font-medium transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Canal y Moneda */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-100 p-4 rounded-xl border-2 border-indigo-200">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                  <span className="text-lg mr-2">🌐</span>
                  Configuración de Reserva
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📡 Canal de reserva *
                    </label>
                    <select
                      required
                      value={formData.channel}
                      onChange={(e) => setFormData({...formData, channel: e.target.value as 'airbnb' | 'booking' | 'manual'})}
                      className="w-full px-3 py-2 border-2 border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium transition-all"
                    >
                      <option value="manual">📝 Manual</option>
                      <option value="airbnb">🏠 Airbnb</option>
                      <option value="booking">🌐 Booking.com</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      💱 Moneda
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value})}
                      className="w-full px-3 py-2 border-2 border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium transition-all"
                    >
                      <option value="EUR">🇪🇺 EUR (Euro)</option>
                      <option value="USD">🇺🇸 USD (Dólar)</option>
                      <option value="GBP">🇬🇧 GBP (Libra)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex justify-end space-x-3 pt-4 border-t-2 border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all duration-200 transform hover:scale-105"
                >
                  ❌ Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <span className="text-lg mr-2">✨</span>
                      Crear Reserva
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de edición de reserva */}
      {showEditModal && reservationToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-blue-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                <span className="text-3xl sm:text-4xl mr-2" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>✏️</span>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Editar Reserva
                </span>
              </h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setReservationToEdit(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition-all hover:scale-110"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateReservation} className="p-6 space-y-6">
              {/* Información de la habitación */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🏠</span>
                  Información de la Reserva
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Bed className="h-4 w-4 inline mr-2" />
                      Habitación *
                    </label>
                    <select
                      required
                      value={formData.room_id}
                      onChange={(e) => setFormData({...formData, room_id: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    >
                      <option value="">Seleccionar habitación</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>
                          {room.name} - €{room.basePrice}/noche
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      Estado *
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    >
                      <option value="confirmed">Confirmada</option>
                      <option value="completed">Completada</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Información del huésped */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>👤</span>
                  Información del Huésped
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      Nombre del huésped *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.guest_name}
                      onChange={(e) => setFormData({...formData, guest_name: e.target.value})}
                      placeholder="Nombre completo"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      Email del huésped
                    </label>
                    <input
                      type="email"
                      value={formData.guest_email}
                      onChange={(e) => setFormData({...formData, guest_email: e.target.value})}
                      placeholder="email@ejemplo.com"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Información adicional del huésped */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📞</span>
                  Información Adicional
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Phone className="h-4 w-4 inline mr-2" />
                      Teléfono del huésped
                    </label>
                    <input
                      type="tel"
                      value={formData.guest_phone}
                      onChange={(e) => setFormData({...formData, guest_phone: e.target.value})}
                      placeholder="+34 600 000 000"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Users className="h-4 w-4 inline mr-2" />
                      Número de personas *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      required
                      value={formData.guest_count}
                      onChange={(e) => setFormData({...formData, guest_count: parseInt(e.target.value) || 1})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Fechas */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-xl border border-orange-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📅</span>
                  Fechas de Estancia
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-2" />
                      Fecha de llegada *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.check_in}
                      onChange={(e) => setFormData({...formData, check_in: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-2" />
                      Fecha de salida *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.check_out}
                      onChange={(e) => setFormData({...formData, check_out: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Información financiera */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>💰</span>
                  Información Financiera
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Euro className="h-4 w-4 inline mr-2" />
                      Precio total
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.total_price}
                      onChange={(e) => setFormData({...formData, total_price: e.target.value})}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <CreditCard className="h-4 w-4 inline mr-2" />
                      Pagó huésped
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.guest_paid}
                      onChange={(e) => setFormData({...formData, guest_paid: e.target.value})}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Euro className="h-4 w-4 inline mr-2" />
                      Comisión plataforma
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.platform_commission}
                      onChange={(e) => setFormData({...formData, platform_commission: e.target.value})}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Canal y Moneda */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl border border-indigo-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🌐</span>
                  Configuración de Reserva
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Globe className="h-4 w-4 inline mr-2" />
                      Canal de reserva *
                    </label>
                    <select
                      required
                      value={formData.channel}
                      onChange={(e) => setFormData({...formData, channel: e.target.value as 'airbnb' | 'booking' | 'manual'})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    >
                      <option value="manual">📝 Manual</option>
                      <option value="airbnb">🏠 Airbnb</option>
                      <option value="booking">🌐 Booking.com</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Euro className="h-4 w-4 inline mr-2" />
                      Moneda
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    >
                      <option value="EUR">EUR (Euro)</option>
                      <option value="USD">USD (Dólar)</option>
                      <option value="GBP">GBP (Libra)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setReservationToEdit(null);
                    resetForm();
                  }}
                  className="px-6 sm:px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center justify-center font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <Edit className="h-5 w-5 mr-2" />
                      ✨ Actualizar Reserva
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && reservationToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <svg className="h-6 w-6 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Confirmar Eliminación
              </h3>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  ¿Estás seguro de que quieres eliminar esta reserva?
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-900">{reservationToDelete.guest_name}</p>
                  <p className="text-sm text-gray-600">{reservationToDelete.guest_email}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(reservationToDelete.check_in)} - {formatDate(reservationToDelete.check_out)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Habitación: {rooms.find(r => r.id === reservationToDelete.room_id)?.name || reservationToDelete.room_id}
                  </p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-red-800">Esta acción no se puede deshacer</h4>
                    <p className="text-sm text-red-700 mt-1">
                      La reserva será eliminada permanentemente de la base de datos.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Checkbox de confirmación doble */}
              <div className="mb-4">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmDelete}
                    onChange={(e) => setConfirmDelete(e.target.checked)}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    <span className="font-medium text-red-600">Confirmo que quiero eliminar esta reserva</span>
                    <span className="block text-gray-500 mt-1">
                      Marca esta casilla para habilitar el botón de eliminación
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                disabled={deleting === reservationToDelete.id}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting === reservationToDelete.id || !confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {deleting === reservationToDelete.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar Reserva
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
