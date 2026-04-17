'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Link, useRouter, usePathname } from '@/i18n/navigation';
import { Plus, X, Calendar, User, Bed, Euro, CreditCard, Download, Phone, Users, Globe, Edit, Mail } from 'lucide-react';
import { useTenant, hasCheckinInstructionsEmailAccess } from '@/hooks/useTenant';
import { getRoomNumber } from '@/lib/db';
import { useTranslations, useLocale } from 'next-intl';
import LocalizedDateInput from '@/components/LocalizedDateInput';
import { PENDING_RESERVATIONS_REVIEW_CHANGED } from '@/components/PendingReservationReviewBadge';
import { toIntlDateLocale, type Locale as AppLocale } from '@/i18n/config';
import {
  buildChannelSelectOptions,
  normalizeBookingChannels,
  defaultBookingChannelsConfig,
  type BookingChannelsConfig,
} from '@/lib/booking-channels';
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
  channel: string;
  needs_review?: boolean;
  total_price: number;
  guest_paid: number;
  platform_commission: number;
  net_income: number;
  currency: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
  checkin_instructions_sent_at?: string | null;
  checkin_instructions_opened_at?: string | null;
}

interface Room {
  id: string;
  name: string;
  basePrice: number;
}

// Fallbacks en español para el formulario de reserva (si las traducciones no se resuelven)
const RESERVATION_FORM_FALLBACKS: Record<string, string> = {
  'createModal.title': 'Nueva reserva manual',
  'createModal.reservationSection': 'Información de la reserva',
  'editModal.title': 'Editar reserva',
  'editModal.reservationSection': 'Información de la reserva',
  'form.roomLabel': 'Habitación *',
  'form.roomPlaceholder': 'Seleccionar habitación',
  'form.statusLabel': 'Estado *',
  'form.guestSectionTitle': 'Información del huésped',
  'form.guestNameLabel': 'Nombre del huésped *',
  'form.guestNamePlaceholder': 'Nombre completo',
  'form.guestEmailLabel': 'Email del huésped',
  'form.guestEmailPlaceholder': 'email@ejemplo.com',
  'form.guestEmailHint':
    'Necesario para enviar las instrucciones de check-in por email (planes Standard y Pro).',
  'form.guestPhoneLabel': 'Teléfono del huésped',
  'form.guestPhonePlaceholder': '+34 600 000 000',
  'form.guestCountLabel': 'Número de personas *',
  'form.additionalInfoSectionTitle': 'Información adicional',
  'form.datesSectionTitle': 'Fechas de estancia',
  'form.checkInLabel': 'Fecha de llegada *',
  'form.checkOutLabel': 'Fecha de salida *',
  'form.financialSectionTitle': 'Información financiera',
  'form.totalPriceLabel': 'Precio total',
  'form.guestPaidLabel': 'Pagó huésped',
  'form.platformCommissionLabel': 'Comisión plataforma',
  'form.configSectionTitle': 'Configuración de reserva',
  'form.channelLabel': 'Canal de reserva *',
  'form.currencyLabel': 'Moneda',
  'form.cancel': 'Cancelar',
  'form.creating': 'Creando...',
  'form.createSubmit': 'Crear reserva',
  'form.updating': 'Actualizando...',
  'form.updateSubmit': 'Actualizar reserva',
  'channelManual': 'Manual',
  'channelAirbnb': 'Airbnb',
  'channelBooking': 'Booking.com',
  'form.perNight': '/noche',
  'form.currencyEUR': 'EUR (Euro)',
  'form.currencyUSD': 'USD (Dólar)',
  'form.currencyGBP': 'GBP (Libra)',
};

export default function ReservationsPage() {
  const t = useTranslations('reservations');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { tenant } = useTenant();
  const canSendCheckinEmail = hasCheckinInstructionsEmailAccess(tenant);

  const safeT = (key: string): string => {
    try {
      const value = t(key);
      if (typeof value === 'string' && value !== key && !/^[\w.]+\.[\w.]+$/.test(value)) return value;
    } catch {}
    return RESERVATION_FORM_FALLBACKS[key] ?? key;
  };

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
  const [checkinModalReservation, setCheckinModalReservation] = useState<Reservation | null>(null);
  const [checkinModalStep, setCheckinModalStep] = useState<1 | 2>(1);
  const [checkinSending, setCheckinSending] = useState(false);
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
    channel: 'manual',
  });

  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [markingReviewedId, setMarkingReviewedId] = useState<string | null>(null);
  const pathname = usePathname();
  const editReservationOpenedRef = useRef<string | null>(null);
  const [bookingChannelCfg, setBookingChannelCfg] = useState<BookingChannelsConfig | null>(null);

  const openEditReservationModal = useCallback((reservation: Reservation) => {
    setReservationToEdit(reservation);
    setFormData({
      room_id: reservation.room_id,
      guest_name: reservation.guest_name,
      guest_email: reservation.guest_email || '',
      guest_phone: reservation.guest_phone || '',
      guest_count: reservation.guest_count || 1,
      check_in: reservation.check_in.split('T')[0],
      check_out: reservation.check_out.split('T')[0],
      total_price: reservation.total_price?.toString() || '',
      guest_paid: reservation.guest_paid?.toString() || '',
      platform_commission: reservation.platform_commission?.toString() || '',
      currency: reservation.currency || 'EUR',
      status: reservation.status || 'confirmed' as 'confirmed' | 'cancelled' | 'completed',
      channel: reservation.channel || 'manual',
    });
    setShowEditModal(true);
    if (reservation.needs_review) setShowPendingOnly(true);
  }, []);

  useEffect(() => {
    if (searchParams?.get('review') === 'pending') {
      setShowPendingOnly(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const editId = searchParams?.get('editReservation');
    if (!editId) {
      editReservationOpenedRef.current = null;
      return;
    }
    if (loading) return;
    const r = reservations.find((x) => x.id === editId);
    if (!r) {
      if (reservations.length > 0) {
        router.replace(pathname);
      }
      return;
    }
    if (editReservationOpenedRef.current === editId) return;
    editReservationOpenedRef.current = editId;
    openEditReservationModal(r);
    router.replace(pathname);
  }, [searchParams, loading, reservations, router, pathname, openEditReservationModal]);

  // Cargar datos al montar el componente
  // La autenticación ya está manejada por el middleware
  useEffect(() => {
    fetchReservations();
    fetchRooms();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/tenant/booking-channels', { credentials: 'include' });
        const d = await r.json();
        if (!cancelled && d.success && d.bookingChannels) {
          setBookingChannelCfg(normalizeBookingChannels(d.bookingChannels));
        }
      } catch {
        if (!cancelled) setBookingChannelCfg(defaultBookingChannelsConfig());
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const listForTable = useMemo(() => {
    if (!showPendingOnly) return displayReservations;
    return displayReservations.filter((r) => r.needs_review);
  }, [displayReservations, showPendingOnly]);

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
          needs_review: !!reservation.needs_review,
          checkin_instructions_sent_at: reservation.checkin_instructions_sent_at ?? null,
          checkin_instructions_opened_at: reservation.checkin_instructions_opened_at ?? null,
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
        throw new Error(errorData.error || t('createErrorDefault'));
      }

      const newReservation = await response.json();
      setReservations(prev => [newReservation, ...prev]);
      setShowCreateModal(false);
      resetForm();
      alert(t('createSuccess'));
    } catch (error: any) {
      console.error('Error creating reservation:', error);
      alert(t('createError', { message: String(error.message || error) }));
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
      channel: 'manual',
    });
  };

  const mergedChannelOptions = useMemo(() => {
    const labelFor = (id: string) => {
      const keyMap: Record<string, string> = {
        manual: 'channelManual',
        checkin_form: 'channelCheckinForm',
        airbnb: 'channelAirbnb',
        booking: 'channelBooking',
        vrbo: 'channelVrbo',
        expedia: 'channelExpedia',
        tripadvisor: 'channelTripadvisor',
      };
      const tr = keyMap[id];
      if (tr) {
        try {
          return t(tr);
        } catch {
          return id;
        }
      }
      const cust = bookingChannelCfg?.custom.find((c) => c.id === id);
      return cust?.label ?? id;
    };
    const cfg = bookingChannelCfg ?? defaultBookingChannelsConfig();
    const base = buildChannelSelectOptions(cfg, labelFor);
    const seen = new Set(base.map((o) => o.value));
    const out = [...base];
    if (formData.channel && !seen.has(formData.channel)) {
      out.push({ value: formData.channel, label: labelFor(formData.channel) });
    }
    return out;
  }, [bookingChannelCfg, formData.channel, t]);

  const handleMarkReviewed = async (reservation: Reservation) => {
    setMarkingReviewedId(reservation.id);
    try {
      const response = await fetch('/api/reservations/mark-reviewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: reservation.id }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || t('markReviewedError'));
      }
      setReservations((prev) =>
        prev.map((r) => (r.id === reservation.id ? { ...r, needs_review: false } : r))
      );
      window.dispatchEvent(new Event(PENDING_RESERVATIONS_REVIEW_CHANGED));
      alert(t('markReviewedSuccess'));
    } catch (e: unknown) {
      alert(t('markReviewedErrorMsg', { message: String(e instanceof Error ? e.message : e) }));
    } finally {
      setMarkingReviewedId(null);
    }
  };

  const handleEditClick = (reservation: Reservation) => {
    openEditReservationModal(reservation);
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
        throw new Error(errorData.error || t('updateErrorDefault'));
      }

      const updatedReservation = await response.json();
      
      // Actualizar la lista de reservas
      setReservations(prev => 
        prev.map(res => 
          res.id === updatedReservation.id ? updatedReservation : res
        )
      );

      window.dispatchEvent(new Event(PENDING_RESERVATIONS_REVIEW_CHANGED));
      setShowEditModal(false);
      setReservationToEdit(null);
      resetForm();
      alert(t('updateSuccess'));
    } catch (error: any) {
      console.error('Error updating reservation:', error);
      alert(t('updateError', { message: String(error.message || error) }));
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
        throw new Error(errorData.error || t('deleteErrorDefault'));
      }

      // Eliminar de la lista local
      setReservations(prev => prev.filter(r => r.id !== reservationToDelete.id));
      setShowDeleteModal(false);
      setReservationToDelete(null);
      setConfirmDelete(false);
      alert(t('deleteSuccess'));
    } catch (error: any) {
      console.error('Error deleting reservation:', error);
      alert(t('deleteError', { message: String(error.message || error) }));
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
    return new Date(date).toLocaleDateString(toIntlDateLocale(locale as AppLocale));
  };

  const formatDateTime = (date: string | null | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleString(toIntlDateLocale(locale as AppLocale), {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const openCheckinMailModal = (r: Reservation) => {
    setCheckinModalStep(1);
    setCheckinModalReservation(r);
  };

  const closeCheckinMailModal = () => {
    setCheckinModalReservation(null);
    setCheckinModalStep(1);
    setCheckinSending(false);
  };

  const confirmSendCheckinInstructions = async () => {
    if (!checkinModalReservation) return;
    setCheckinSending(true);
    try {
      const res = await fetch(
        `/api/reservations/${checkinModalReservation.id}/send-checkin-instructions`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'x-ui-locale': locale },
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || t('checkinMail.errorGeneric'));
      }
      closeCheckinMailModal();
      await fetchReservations();
      alert(t('checkinMail.success'));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('checkinMail.errorGeneric'));
    } finally {
      setCheckinSending(false);
    }
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
      case 'confirmed': return t('statusConfirmed');
      case 'cancelled': return t('statusCancelled');
      case 'completed': return t('statusCompleted');
      default: return status;
    }
  };

  const getChannelText = (channel: string) => {
    const keyMap: Record<string, string> = {
      manual: 'channelManual',
      checkin_form: 'channelCheckinForm',
      airbnb: 'channelAirbnb',
      booking: 'channelBooking',
      vrbo: 'channelVrbo',
      expedia: 'channelExpedia',
      tripadvisor: 'channelTripadvisor',
    };
    const tr = keyMap[channel];
    if (tr) {
      try {
        return t(tr);
      } catch {
        return channel;
      }
    }
    const cust = bookingChannelCfg?.custom.find((c) => c.id === channel);
    if (cust) return cust.label;
    return channel;
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
          <p className="text-gray-600 text-lg font-medium">{t('loading')}</p>
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
                <h3 className="text-lg font-bold text-red-800">❌ {t('error')}</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p className="font-medium">{error}</p>
                  <p className="mt-4">
                    <button 
                      onClick={fetchReservations}
                      className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-pink-700 font-semibold transition-all duration-200 transform hover:scale-105"
                    >
                      🔄 {tCommon('retry')}
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
              {t('title')}
            </span>
          </h1>
          <p className="text-gray-600 text-sm sm:text-lg">{t('subtitle') || 'Crea y gestiona las reservas de tus clientes'}</p>
        </div>

        {/* Barra de búsqueda */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-200 mb-4 sm:mb-6 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🔍</span>
              {t('searchTitle')}
            </h3>
            {isSearching && (
              <button
                onClick={clearSearch}
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {t('clearSearch')}
              </button>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                {t('searchLabel')}
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t('searchPlaceholder')}
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
              {tCommon('search')}
            </button>
          </div>
          
          {isSearching && (
            <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <p className="text-sm text-blue-800 font-semibold">
                <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🔍</span>{' '}
                {t('searchActive', { term: searchTerm, count: filteredReservations.length })}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-blue-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📋</span>
                {t('managementTitle')}
              </h2>
              <p className="text-sm text-gray-600 font-medium">
                {t('managementSubtitle')}
              </p>
              <p className="text-xs text-gray-600 mt-2 max-w-3xl leading-relaxed">
                {t('checkinFormInfoBody')}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPendingOnly((v) => !v)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                    showPendingOnly
                      ? 'bg-amber-100 border-amber-300 text-amber-900'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {showPendingOnly ? t('showAllReservations') : t('filterPendingOnly')}
                </button>
              </div>
              {listForTable.length > 0 && (
                <p className="text-xs text-blue-700 mt-1 font-semibold">
                  {t('resultsCount', {
                    count: listForTable.length,
                    total: reservations.length,
                  })}
                </p>
              )}
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 flex items-center space-x-2 font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              <Plus className="h-5 w-5" />
              <span>{t('createReservation')}</span>
            </button>
          </div>
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    🏠 {t('columns.room')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    👤 {t('columns.guest')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    📞 {t('columns.phone')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    👥 {t('columns.guests')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    📅 {t('columns.arrival')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    📤 {t('columns.departure')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    🎯 {t('columns.status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    💰 {t('columns.guestPaid')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    💎 {t('columns.commission')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    💵 {t('columns.netIncome')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    🌐 {t('columns.channel')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    ✉️ {t('columns.checkinMail')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    ⚙️ {t('columns.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {listForTable.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-12 text-center">
                      <div className="bg-gradient-to-r from-blue-100 to-purple-100 p-8 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                        <Bed className="w-12 h-12 text-blue-600" />
                      </div>
                      <div className="text-gray-700">
                        {isSearching ? (
                          <>
                            <h3 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-2">
                              {t('noResultsTitle')}
                            </h3>
                            <p className="text-gray-600 text-sm sm:text-base mb-4">
                              {t('noResultsDescription', { term: searchTerm })}
                            </p>
                            <button
                              onClick={clearSearch}
                              className="mt-3 text-blue-600 hover:text-blue-800 underline"
                            >
                              {t('noResultsShowAll')}
                            </button>
                          </>
                        ) : showPendingOnly && reservations.length > 0 ? (
                          <>
                            <div className="text-lg mb-2 font-semibold">{t('noPendingReviewTitle')}</div>
                            <div className="text-sm mb-4">{t('noPendingReviewBody')}</div>
                            <button
                              type="button"
                              onClick={() => setShowPendingOnly(false)}
                              className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
                            >
                              {t('showAllReservations')}
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="text-lg mb-2">{t('emptyTitle')}</div>
                            <div className="text-sm">{t('emptyDescription')}</div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  listForTable.map((reservation) => (
                  <tr key={reservation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rooms.find(r => r.id === reservation.room_id)?.name ||
                        t('roomFallback', { number: getRoomNumber(reservation.room_id) })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium flex flex-wrap items-center gap-2">
                          {reservation.guest_name}
                          {reservation.needs_review ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                              {t('badgeNeedsReview')}
                            </span>
                          ) : null}
                        </div>
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
                    <td className="px-4 py-4 text-sm text-gray-800 align-top min-w-[10rem] max-w-[11rem]">
                      <div className="flex flex-col gap-1.5">
                        {reservation.checkin_instructions_sent_at ? (
                          <>
                            <span className="text-xs font-medium text-green-800">
                              {t('checkinMail.sentShort')}:{' '}
                              {formatDateTime(reservation.checkin_instructions_sent_at)}
                            </span>
                            <span className="text-[11px] text-gray-500 leading-snug">
                              {reservation.checkin_instructions_opened_at
                                ? `${t('checkinMail.openedShort')}: ${formatDateTime(reservation.checkin_instructions_opened_at)}`
                                : t('checkinMail.openUnknown')}
                            </span>
                          </>
                        ) : !String(reservation.guest_email || '').trim() ? (
                          <span className="text-[11px] text-amber-700 leading-snug">{t('checkinMail.noEmail')}</span>
                        ) : (
                          <span className="text-[11px] text-gray-400">—</span>
                        )}
                        {canSendCheckinEmail ? (
                          <button
                            type="button"
                            onClick={() => openCheckinMailModal(reservation)}
                            disabled={
                              !!reservation.checkin_instructions_sent_at ||
                              !String(reservation.guest_email || '').trim()
                            }
                            title={t('checkinMail.sendTitle')}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <Mail className="h-3.5 w-3.5 shrink-0" />
                            {t('checkinMail.send')}
                          </button>
                        ) : (
                          <Link
                            href="/plans"
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                            title={t('checkinMail.upgrade')}
                          >
                            <Mail className="h-3.5 w-3.5 shrink-0 opacity-60" />
                            {t('checkinMail.send')}
                            <span className="text-[10px]" aria-hidden>
                              🔒
                            </span>
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {reservation.needs_review ? (
                        <button
                          type="button"
                          onClick={() => handleMarkReviewed(reservation)}
                          disabled={markingReviewedId === reservation.id}
                          className="mb-2 block w-full sm:w-auto rounded-lg border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                        >
                          {markingReviewedId === reservation.id ? t('markReviewing') : t('markReviewed')}
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleEditClick(reservation)}
                        className="text-gray-700 hover:text-gray-900 mr-3"
                        title={t('actions.viewTitle')}
                      >
                        {t('actions.view')}
                      </button>
                      {/* Botón Check-in retirado a petición del usuario */}
                      <button
                        onClick={() => handleEditClick(reservation)}
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 hover:from-blue-100 hover:to-indigo-100 px-3 py-1.5 rounded-lg mr-2 flex items-center transition-all duration-200 transform hover:scale-105 font-semibold text-sm"
                        title={t('actions.editTitle')}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        {t('actions.edit')}
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(reservation)}
                        disabled={deleting === reservation.id}
                        className="bg-gradient-to-r from-red-50 to-pink-50 text-red-700 hover:from-red-100 hover:to-pink-100 px-3 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 font-semibold text-sm"
                      >
                        {deleting === reservation.id ? t('actions.deleting') : t('actions.delete')}
                      </button>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {reservations.length === 0 && !error && !isSearching && (
          <div className="text-center py-12 bg-white">
            <div className="text-black text-lg mb-4 font-medium">
              {t('emptyTitle')}
            </div>
            <p className="text-black mb-6">
              {t('emptySyncDescription')}
            </p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
            >
              <Plus className="h-5 w-5" />
              <span>{t('emptyPrimaryCta')}</span>
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
                  {safeT('createModal.title')}
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
                  {safeT('createModal.reservationSection')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🛏️ {safeT('form.roomLabel')}
                    </label>
                    <select
                      required
                      value={formData.room_id}
                      onChange={(e) => setFormData({...formData, room_id: e.target.value})}
                      className="w-full px-3 py-2 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium transition-all"
                    >
                      <option value="">{safeT('form.roomPlaceholder')}</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>
                          {room.name} - €{room.basePrice}{safeT('form.perNight')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ✅ {safeT('form.statusLabel')}
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-3 py-2 border-2 border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium transition-all"
                    >
                      <option value="confirmed">✅ {getStatusText('confirmed')}</option>
                      <option value="completed">✨ {getStatusText('completed')}</option>
                      <option value="cancelled">❌ {getStatusText('cancelled')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Información del huésped */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-xl border-2 border-green-200">
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                  <span className="text-lg mr-2">👤</span>
                  {safeT('form.guestSectionTitle')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      👤 {safeT('form.guestNameLabel')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.guest_name}
                      onChange={(e) => setFormData({...formData, guest_name: e.target.value})}
                      placeholder={safeT('form.guestNamePlaceholder')}
                      className="w-full px-3 py-2 border-2 border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white font-medium transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📧 {safeT('form.guestEmailLabel')}
                    </label>
                    <input
                      type="email"
                      value={formData.guest_email}
                      onChange={(e) => setFormData({...formData, guest_email: e.target.value})}
                      placeholder={safeT('form.guestEmailPlaceholder')}
                      className="w-full px-3 py-2 border-2 border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white font-medium text-black placeholder-gray-500 transition-all"
                    />
                    <p className="text-xs text-gray-600 mt-1.5">{safeT('form.guestEmailHint')}</p>
                  </div>
                </div>

                {/* Información adicional del huésped */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📞 {safeT('form.guestPhoneLabel')}
                    </label>
                    <input
                      type="tel"
                      value={formData.guest_phone}
                      onChange={(e) => setFormData({...formData, guest_phone: e.target.value})}
                      placeholder={safeT('form.guestPhonePlaceholder')}
                      className="w-full px-3 py-2 border-2 border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white font-medium text-black placeholder-gray-500 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      👥 {safeT('form.guestCountLabel')}
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
                  {safeT('form.datesSectionTitle')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📥 {safeT('form.checkInLabel')}
                    </label>
                    <LocalizedDateInput
                      required
                      value={formData.check_in}
                      onChange={(e) => setFormData({...formData, check_in: e.target.value})}
                      className="w-full px-3 py-2 border-2 border-orange-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white font-medium text-black transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📤 {safeT('form.checkOutLabel')}
                    </label>
                    <LocalizedDateInput
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
                  {safeT('form.financialSectionTitle')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      💵 {safeT('form.totalPriceLabel')}
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
                      💳 {safeT('form.guestPaidLabel')}
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
                      💎 {safeT('form.platformCommissionLabel')}
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
                  {safeT('form.configSectionTitle')}
                </h4>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📡 {safeT('form.channelLabel')}
                  </label>
                  <select
                    required
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    className="w-full px-3 py-2 border-2 border-indigo-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-medium transition-all"
                  >
                    {mergedChannelOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
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
                  ❌ {safeT('form.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  {creating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {safeT('form.creating')}
                    </>
                  ) : (
                    <>
                      <span className="text-lg mr-2">✨</span>
                      {safeT('form.createSubmit')}
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
                    {safeT('editModal.title')}
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
                  {safeT('editModal.reservationSection')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Bed className="h-4 w-4 inline mr-2" />
                      {safeT('form.roomLabel')}
                    </label>
                    <select
                      required
                      value={formData.room_id}
                      onChange={(e) => setFormData({...formData, room_id: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    >
                      <option value="">{safeT('form.roomPlaceholder')}</option>
                      {rooms.map(room => (
                        <option key={room.id} value={room.id}>
                          {room.name} - €{room.basePrice}{safeT('form.perNight')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      {safeT('form.statusLabel')}
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    >
                      <option value="confirmed">{getStatusText('confirmed')}</option>
                      <option value="completed">{getStatusText('completed')}</option>
                      <option value="cancelled">{getStatusText('cancelled')}</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Información del huésped */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>👤</span>
                  {safeT('form.guestSectionTitle')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      {safeT('form.guestNameLabel')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.guest_name}
                      onChange={(e) => setFormData({...formData, guest_name: e.target.value})}
                      placeholder={safeT('form.guestNamePlaceholder')}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      {safeT('form.guestEmailLabel')}
                    </label>
                    <input
                      type="email"
                      value={formData.guest_email}
                      onChange={(e) => setFormData({...formData, guest_email: e.target.value})}
                      placeholder={safeT('form.guestEmailPlaceholder')}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                    <p className="text-xs text-gray-600 mt-1.5">{safeT('form.guestEmailHint')}</p>
                  </div>
                </div>
              </div>

              {/* Información adicional del huésped */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>📞</span>
                  {safeT('form.additionalInfoSectionTitle')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Phone className="h-4 w-4 inline mr-2" />
                      {safeT('form.guestPhoneLabel')}
                    </label>
                    <input
                      type="tel"
                      value={formData.guest_phone}
                      onChange={(e) => setFormData({...formData, guest_phone: e.target.value})}
                      placeholder={safeT('form.guestPhonePlaceholder')}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Users className="h-4 w-4 inline mr-2" />
                      {safeT('form.guestCountLabel')}
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
                  {safeT('form.datesSectionTitle')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-2" />
                      {safeT('form.checkInLabel')}
                    </label>
                    <LocalizedDateInput
                      required
                      value={formData.check_in}
                      onChange={(e) => setFormData({...formData, check_in: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="h-4 w-4 inline mr-2" />
                      {safeT('form.checkOutLabel')}
                    </label>
                    <LocalizedDateInput
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
                  {safeT('form.financialSectionTitle')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Euro className="h-4 w-4 inline mr-2" />
                      {safeT('form.totalPriceLabel')}
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
                      {safeT('form.guestPaidLabel')}
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
                      {safeT('form.platformCommissionLabel')}
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
                  {safeT('form.configSectionTitle')}
                </h3>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Globe className="h-4 w-4 inline mr-2" />
                    {safeT('form.channelLabel')}
                  </label>
                  <select
                    required
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  >
                    {mergedChannelOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
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
                  {safeT('form.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 flex items-center justify-center font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  {updating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {safeT('form.updating')}
                    </>
                  ) : (
                    <>
                      <Edit className="h-5 w-5 mr-2" />
                      ✨ {safeT('form.updateSubmit')}
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
                {t('deleteModal.title')}
              </h3>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  {t('deleteModal.question')}
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium text-gray-900">{reservationToDelete.guest_name}</p>
                  <p className="text-sm text-gray-600">{reservationToDelete.guest_email}</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(reservationToDelete.check_in)} - {formatDate(reservationToDelete.check_out)}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t('deleteModal.roomLine', {
                      room: rooms.find(r => r.id === reservationToDelete.room_id)?.name || reservationToDelete.room_id
                    })}
                  </p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-red-800">{t('deleteModal.irreversibleTitle')}</h4>
                    <p className="text-sm text-red-700 mt-1">
                      {t('deleteModal.irreversibleDescription')}
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
                    <span className="font-medium text-red-600">
                      {t('deleteModal.checkboxMain')}
                    </span>
                    <span className="block text-gray-500 mt-1">
                      {t('deleteModal.checkboxSub')}
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
                {safeT('form.cancel')}
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting === reservationToDelete.id || !confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {deleting === reservationToDelete.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('deleteModal.deleting')}
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {t('deleteModal.confirm')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {checkinModalReservation && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-indigo-100">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-start gap-2">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 pr-2">
                <Mail className="h-5 w-5 text-indigo-600 shrink-0" />
                {checkinModalStep === 1
                  ? t('checkinMail.modalStep1Title')
                  : t('checkinMail.modalStep2Title')}
              </h3>
              <button
                type="button"
                onClick={closeCheckinMailModal}
                className="text-gray-500 hover:text-gray-800 p-1 rounded-lg hover:bg-gray-100"
                aria-label={t('checkinMail.modalCancel')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm text-gray-700">
              {checkinModalStep === 1 ? (
                <>
                  <p>{t('checkinMail.modalStep1Intro')}</p>
                  <ul className="list-disc pl-5 space-y-1.5">
                    <li>
                      <span className="font-semibold">{t('checkinMail.modalGuest')}:</span>{' '}
                      {checkinModalReservation.guest_name}
                    </li>
                    <li>
                      <span className="font-semibold">{t('checkinMail.modalEmail')}:</span>{' '}
                      {checkinModalReservation.guest_email}
                    </li>
                    <li>
                      <span className="font-semibold">{t('checkinMail.modalRoom')}:</span>{' '}
                      {rooms.find((r) => r.id === checkinModalReservation.room_id)?.name ||
                        t('roomFallback', { number: getRoomNumber(checkinModalReservation.room_id) })}
                    </li>
                  </ul>
                </>
              ) : (
                <p className="text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 leading-relaxed">
                  {t('checkinMail.modalStep2Warning')}
                </p>
              )}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closeCheckinMailModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                {t('checkinMail.modalCancel')}
              </button>
              {checkinModalStep === 1 ? (
                <button
                  type="button"
                  onClick={() => setCheckinModalStep(2)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {t('checkinMail.modalNext')}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setCheckinModalStep(1)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    {t('checkinMail.modalBack')}
                  </button>
                  <button
                    type="button"
                    disabled={checkinSending}
                    onClick={confirmSendCheckinInstructions}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkinSending ? t('checkinMail.sending') : t('checkinMail.modalSend')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
