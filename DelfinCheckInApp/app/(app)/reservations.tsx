// =====================================================
// LISTA DE RESERVAS - Con crear reserva y búsqueda
// =====================================================

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  Search,
  Plus,
  X,
  CheckCircle2,
  BellRing,
  Pencil,
  Trash2,
  CalendarDays,
  ChevronRight,
} from 'lucide-react-native';
import { KeyboardAwareFormModal } from '@/components/KeyboardAwareFormModal';
import { t } from '@/lib/i18n';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  PendingReservationItem,
  Reservation,
  getReservationCheckIn,
  getReservationCheckOut,
  getReservationPrice,
  getReservationStatus,
} from '@/lib/reservations';

interface Room {
  id: string;
  name: string;
}

export default function ReservationsScreen() {
  const params = useLocalSearchParams<{ filter?: string; reservationId?: string }>();
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending'>(
    params.filter === 'pending' ? 'pending' : 'all'
  );
  const queryClient = useQueryClient();
  const [calendarFor, setCalendarFor] = useState<'check_in' | 'check_out' | null>(null);

  const [formData, setFormData] = useState({
    room_id: '',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guest_count: '1',
    check_in: '',
    check_out: '',
    total_price: '',
    guest_paid: '',
    platform_commission: '',
    currency: 'EUR',
    status: 'confirmed' as 'confirmed' | 'cancelled' | 'completed',
    channel: 'manual' as 'airbnb' | 'booking' | 'manual' | 'checkin_form',
  });

  // Obtener habitaciones
  const { data: roomsData } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const response = await api.get('/api/tenant/rooms');
      return response.data.rooms || [];
    },
  });

  const rooms: Room[] = roomsData || [];

  // Obtener reservas normales
  const { data: normalReservations } = useQuery({
    queryKey: ['reservations'],
    queryFn: async () => {
      const response = await api.get('/api/reservations');
      return response.data || [];
    },
  });

  const reservations = (normalReservations || []) as Reservation[];

  const { data: pendingData } = useQuery({
    queryKey: ['pending-reservations-review'],
    queryFn: async () => {
      const response = await api.get('/api/tenant/pending-reservations-review');
      return response.data as { count?: number; items?: PendingReservationItem[] };
    },
  });

  const pendingCount = typeof pendingData?.count === 'number' ? pendingData.count : 0;
  const pendingIds = useMemo(
    () => new Set((pendingData?.items || []).map((item) => item.id)),
    [pendingData]
  );

  useEffect(() => {
    setSelectedFilter(params.filter === 'pending' ? 'pending' : 'all');
  }, [params.filter]);

  const reviewMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const response = await api.post('/api/reservations/mark-reviewed', {
        reservationId,
      });
      return response.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reservations'] }),
        queryClient.invalidateQueries({ queryKey: ['pending-reservations-review'] }),
      ]);
    },
    onError: (error: any) => {
      Alert.alert(
        t('common.error'),
        error.response?.data?.error || t('reservations.mobile.markReviewedError')
      );
    },
  });

  // Filtrar reservas por búsqueda
  const filteredReservations = reservations.filter((r) => {
    const matchesPending =
      selectedFilter === 'all' ? true : Boolean(r.needs_review || pendingIds.has(String(r.id)));

    if (!matchesPending) return false;

    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      r.guest_name?.toLowerCase().includes(search) ||
      r.guest_email?.toLowerCase().includes(search) ||
      r.guest_phone?.toLowerCase().includes(search) ||
      r.reservation_code?.toLowerCase().includes(search) ||
      r.property_name?.toLowerCase().includes(search)
    );
  });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['reservations'] }),
      queryClient.refetchQueries({ queryKey: ['rooms'] }),
      queryClient.refetchQueries({ queryKey: ['pending-reservations-review'] }),
    ]);
    setRefreshing(false);
  };

  const createReservation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const total = parseFloat(data.total_price) || 0;
      const paid = parseFloat(data.guest_paid) || total;
      const response = await api.post('/api/reservations', {
        room_id: data.room_id,
        guest_name: data.guest_name,
        guest_email: data.guest_email || null,
        guest_phone: data.guest_phone || null,
        guest_count: parseInt(data.guest_count, 10) || 1,
        check_in: data.check_in,
        check_out: data.check_out,
        total_price: total,
        guest_paid: paid,
        platform_commission: parseFloat(data.platform_commission) || 0,
        currency: data.currency || 'EUR',
        status: data.status,
        channel: data.channel,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setShowCreateModal(false);
      resetForm();
      Alert.alert(t('common.success'), t('reservations.createSuccess'));
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.error || t('reservations.createErrorDefault'));
    },
  });

  const updateReservation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const response = await api.put('/api/reservations', {
        id: data.id,
        room_id: data.room_id,
        guest_name: data.guest_name,
        guest_email: data.guest_email || null,
        guest_phone: data.guest_phone || null,
        guest_count: parseInt(data.guest_count, 10) || 1,
        check_in: data.check_in,
        check_out: data.check_out,
        total_price: parseFloat(data.total_price) || 0,
        guest_paid: parseFloat(data.guest_paid) || parseFloat(data.total_price) || 0,
        platform_commission: parseFloat(data.platform_commission) || 0,
        currency: data.currency || 'EUR',
        status: data.status,
        channel: data.channel,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reservations-review'] });
      setShowCreateModal(false);
      setEditingReservationId(null);
      resetForm();
      Alert.alert(t('common.success'), t('reservations.updateSuccess'));
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.error || t('reservations.updateErrorDefault'));
    },
  });

  const deleteReservation = useMutation({
    mutationFn: async (reservationId: string) => {
      const response = await api.delete(`/api/reservations/${reservationId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['pending-reservations-review'] });
      Alert.alert(t('common.success'), t('reservations.deleteSuccess'));
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.error || t('reservations.deleteErrorDefault'));
    },
  });

  const handleCreate = () => {
    if (!formData.room_id || !formData.guest_name || !formData.check_in || !formData.check_out) {
      Alert.alert(t('common.error'), t('reservations.requiredFields'));
      return;
    }
    if (formData.check_in.localeCompare(formData.check_out) >= 0) {
      Alert.alert(t('common.error'), t('reservations.checkOutBeforeCheckIn'));
      return;
    }
    if (editingReservationId) {
      updateReservation.mutate({ ...formData, id: editingReservationId });
    } else {
      createReservation.mutate(formData);
    }
  };

  const resetForm = () => {
    setEditingReservationId(null);
    setFormData({
      room_id: '',
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      guest_count: '1',
      check_in: '',
      check_out: '',
      total_price: '',
      guest_paid: '',
      platform_commission: '',
      currency: 'EUR',
      status: 'confirmed',
      channel: 'manual',
    });
  };

  const openEditModal = (reservation: Reservation) => {
    setEditingReservationId(String(reservation.id));
    const gp = reservation.guest_paid;
    const pc = reservation.platform_commission;
    setFormData({
      room_id: String(reservation.room_id || ''),
      guest_name: reservation.guest_name || '',
      guest_email: reservation.guest_email || '',
      guest_phone: reservation.guest_phone || '',
      guest_count: String(reservation.guest_count || 1),
      check_in: (getReservationCheckIn(reservation) || '').split('T')[0],
      check_out: (getReservationCheckOut(reservation) || '').split('T')[0],
      total_price: String(getReservationPrice(reservation) || ''),
      guest_paid: gp != null ? String(gp) : String(getReservationPrice(reservation) || ''),
      platform_commission: pc != null ? String(pc) : '',
      currency: reservation.currency || 'EUR',
      status: (getReservationStatus(reservation) as 'confirmed' | 'cancelled' | 'completed') || 'confirmed',
      channel: (reservation.channel as typeof formData.channel) || 'manual',
    });
    setShowCreateModal(true);
  };

  const dateFromYmd = (ymd: string) => {
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return new Date();
    const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
    return new Date(y, m - 1, d);
  };

  const toIsoDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatDate = (dateStr: string) => {
    const d = dateFromYmd(dateStr);
    return d.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      case 'completed':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const handleMarkReviewed = (reservationId: string) => {
    Alert.alert(
      t('reservations.mobile.markReviewedConfirmTitle'),
      t('reservations.mobile.markReviewedConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: () => reviewMutation.mutate(reservationId),
        },
      ]
    );
  };

  const handleDeleteReservation = (reservation: Reservation) => {
    const reservationId = String(reservation.id);
    Alert.alert(
      t('reservations.deleteReservation'),
      t('reservations.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('common.confirm'),
              t('reservations.deleteWarning'),
              [
                { text: t('common.no'), style: 'cancel' },
                {
                  text: t('common.delete'),
                  style: 'destructive',
                  onPress: () => deleteReservation.mutate(reservationId),
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda y botón crear */}
      <View style={styles.header}>
        <View style={styles.searchBox}>
          <Search size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('reservations.searchPlaceholder')}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9ca3af"
          />
        </View>
        <Pressable
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={20} color="white" />
          <Text style={styles.createButtonText}>{t('common.create')}</Text>
        </Pressable>
      </View>

      <View style={styles.filtersRow}>
        <Pressable
          style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text
            style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}
          >
            Todas
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, selectedFilter === 'pending' && styles.filterChipPendingActive]}
          onPress={() => setSelectedFilter('pending')}
        >
          <BellRing size={16} color={selectedFilter === 'pending' ? '#b45309' : '#6b7280'} />
          <Text
            style={[
              styles.filterChipText,
              selectedFilter === 'pending' && styles.filterChipTextPendingActive,
            ]}
          >
            {t('navigation.pendingReservationsReviewDropdownTitle')} ({pendingCount})
          </Text>
        </Pressable>
      </View>

      {/* Lista de reservas */}
      <FlatList
        data={filteredReservations}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const status = getReservationStatus(item);
          const checkIn = getReservationCheckIn(item);
          const checkOut = getReservationCheckOut(item);
          const price = getReservationPrice(item);
          const needsReview = Boolean(item.needs_review || pendingIds.has(String(item.id)));
          const isHighlighted = params.reservationId === String(item.id);

          return (
            <View
              style={[
                styles.card,
                needsReview && styles.cardPending,
                isHighlighted && styles.cardHighlighted,
              ]}
            >
              {/* Header: Nombre y precio */}
              <View style={styles.cardHeader}>
                <View style={styles.namePriceContainer}>
                  <Text style={styles.guestName}>{item.guest_name}</Text>
                  {price > 0 && !isNaN(price) && <Text style={styles.price}>{price.toFixed(2)} €</Text>}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(status) },
                    ]}
                  >
                    {status === 'confirmed'
                      ? 'Confirmada'
                      : status === 'cancelled'
                      ? 'Cancelada'
                      : status === 'completed'
                      ? 'Completada'
                      : status}
                  </Text>
                </View>
              </View>

              {needsReview && (
                <View style={styles.pendingBanner}>
                  <View style={styles.pendingBannerTextWrap}>
                    <Text style={styles.pendingBannerTitle}>Pendiente de revisión</Text>
                    <Text style={styles.pendingBannerText}>
                      Reserva creada automáticamente desde el formulario de check-in.
                    </Text>
                  </View>
                  <Pressable
                    style={styles.pendingActionButton}
                    onPress={() => handleMarkReviewed(String(item.id))}
                    disabled={reviewMutation.isPending}
                  >
                    <CheckCircle2 size={16} color="white" />
                    <Text style={styles.pendingActionButtonText}>
                      {reviewMutation.isPending ? t('common.loading') : t('reservations.markReviewed')}
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* Información adicional */}
              <View style={styles.infoContainer}>
                {item.guest_email && (
                  <Text style={styles.infoText}>📧 {item.guest_email}</Text>
                )}
                {item.guest_phone && (
                  <Text style={styles.infoText}>📱 {item.guest_phone}</Text>
                )}
                <Text style={styles.infoText}>
                  🏠 {item.property_name || item.room_id || 'N/A'}
                </Text>
                {checkIn && checkOut && (
                  <Text style={styles.infoText}>
                    📅 {formatDate(checkIn)} - {formatDate(checkOut)}
                  </Text>
                )}
                {item.reservation_code && (
                  <Text style={styles.infoText}>
                    🔖 {item.reservation_code}
                  </Text>
                )}
              </View>
              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => openEditModal(item)}
                >
                  <Pencil size={16} color="#2563eb" />
                  <Text style={styles.editButtonText}>{t('common.edit')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.deleteActionButton]}
                  onPress={() => handleDeleteReservation(item)}
                  disabled={deleteReservation.isPending}
                >
                  <Trash2 size={16} color="#dc2626" />
                  <Text style={styles.deleteButtonText}>
                    {deleteReservation.isPending ? t('reservations.deleting') : t('common.delete')}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm ? t('reservations.noResultsTitle') : t('reservations.emptyTitle')}
            </Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
      />

      {/* Modal crear reserva */}
      <KeyboardAwareFormModal
        visible={showCreateModal}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingReservationId ? t('reservations.editReservation') : t('reservations.createReservation')}
              </Text>
              <Pressable
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <X size={24} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={styles.sectionHeading}>{t('reservations.createModal.reservationSection')}</Text>
              <Text style={styles.label}>{t('reservations.form.roomLabel')}</Text>
              <View style={styles.pickerContainer}>
                {rooms.map((room) => (
                  <Pressable
                    key={room.id}
                    style={[
                      styles.pickerOption,
                      formData.room_id === room.id && styles.pickerOptionSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, room_id: room.id })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.room_id === room.id && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {room.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>{t('reservations.form.statusLabel')}</Text>
              <View style={styles.pickerContainer}>
                {(
                  [
                    ['confirmed', t('reservations.statusConfirmed')],
                    ['cancelled', t('reservations.statusCancelled')],
                    ['completed', t('reservations.statusCompleted')],
                  ] as const
                ).map(([val, label]) => (
                  <Pressable
                    key={val}
                    style={[styles.pickerOption, formData.status === val && styles.pickerOptionSelected]}
                    onPress={() => setFormData({ ...formData, status: val })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.status === val && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionHeading}>{t('reservations.form.guestSectionTitle')}</Text>
              <Text style={styles.label}>{t('reservations.form.guestNameLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.guest_name}
                onChangeText={(text) => setFormData({ ...formData, guest_name: text })}
                placeholder={t('reservations.form.guestNamePlaceholder')}
              />

              <Text style={styles.label}>{t('reservations.form.guestEmailLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.guest_email}
                onChangeText={(text) => setFormData({ ...formData, guest_email: text })}
                placeholder={t('reservations.form.guestEmailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.label}>{t('reservations.form.guestPhoneLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.guest_phone}
                onChangeText={(text) => setFormData({ ...formData, guest_phone: text })}
                placeholder={t('reservations.form.guestPhonePlaceholder')}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>{t('reservations.form.guestCountLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.guest_count}
                onChangeText={(text) => setFormData({ ...formData, guest_count: text })}
                placeholder="1"
                keyboardType="numeric"
              />

              <Text style={styles.sectionHeading}>{t('reservations.form.datesSectionTitle')}</Text>
              <Text style={styles.label}>{t('reservations.form.checkInLabel')}</Text>
              <Pressable style={styles.datePickRow} onPress={() => setCalendarFor('check_in')}>
                <CalendarDays size={20} color="#2563eb" />
                <Text style={styles.datePickRowText}>
                  {formData.check_in
                    ? formatDate(formData.check_in)
                    : t('reservations.form.checkInLabel')}
                </Text>
                <ChevronRight size={18} color="#9ca3af" />
              </Pressable>

              <Text style={styles.label}>{t('reservations.form.checkOutLabel')}</Text>
              <Pressable style={styles.datePickRow} onPress={() => setCalendarFor('check_out')}>
                <CalendarDays size={20} color="#2563eb" />
                <Text style={styles.datePickRowText}>
                  {formData.check_out
                    ? formatDate(formData.check_out)
                    : t('reservations.form.checkOutLabel')}
                </Text>
                <ChevronRight size={18} color="#9ca3af" />
              </Pressable>

              <Text style={styles.sectionHeading}>{t('reservations.form.financialSectionTitle')}</Text>
              <Text style={styles.label}>{t('reservations.form.totalPriceLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.total_price}
                onChangeText={(text) => setFormData({ ...formData, total_price: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              <Text style={styles.label}>{t('reservations.form.guestPaidLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.guest_paid}
                onChangeText={(text) => setFormData({ ...formData, guest_paid: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              <Text style={styles.label}>{t('reservations.form.platformCommissionLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.platform_commission}
                onChangeText={(text) => setFormData({ ...formData, platform_commission: text })}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
              <Text style={styles.label}>{t('reservations.form.currencyLabel')}</Text>
              <View style={styles.pickerContainer}>
                {(
                  [
                    ['EUR', t('reservations.form.currencyEUR')],
                    ['USD', t('reservations.form.currencyUSD')],
                    ['GBP', t('reservations.form.currencyGBP')],
                  ] as const
                ).map(([val, label]) => (
                  <Pressable
                    key={val}
                    style={[styles.pickerOption, formData.currency === val && styles.pickerOptionSelected]}
                    onPress={() => setFormData({ ...formData, currency: val })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.currency === val && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionHeading}>{t('reservations.form.configSectionTitle')}</Text>
              <Text style={styles.label}>{t('reservations.form.channelLabel')}</Text>
              <View style={styles.pickerContainer}>
                {(
                  [
                    ['manual', t('reservations.channelManual')],
                    ['airbnb', t('reservations.channelAirbnb')],
                    ['booking', t('reservations.channelBooking')],
                    ['checkin_form', t('reservations.channelCheckinForm')],
                  ] as const
                ).map(([val, label]) => (
                  <Pressable
                    key={val}
                    style={[styles.pickerOption, formData.channel === val && styles.pickerOptionSelected]}
                    onPress={() => setFormData({ ...formData, channel: val })}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.channel === val && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.modalButtonTextCancel}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCreate]}
                onPress={handleCreate}
                disabled={createReservation.isPending || updateReservation.isPending}
              >
                <Text style={styles.modalButtonTextCreate}>
                  {editingReservationId
                    ? updateReservation.isPending
                      ? t('common.loading')
                      : t('common.save')
                    : createReservation.isPending
                      ? t('common.loading')
                      : t('common.create')}
                </Text>
              </Pressable>
            </View>
          </View>
      </KeyboardAwareFormModal>

      <Modal
        visible={calendarFor !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setCalendarFor(null)}
      >
        <View style={styles.dateModalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCalendarFor(null)} />
          <View style={styles.dateModalSheet} pointerEvents="box-none">
            <Text style={styles.dateModalTitle}>
              {calendarFor === 'check_in'
                ? t('reservations.form.checkInLabel')
                : t('reservations.form.checkOutLabel')}
            </Text>
            {calendarFor ? (
              <DateTimePicker
                value={dateFromYmd(formData[calendarFor])}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') {
                    const field = calendarFor;
                    setCalendarFor(null);
                    if (event.type !== 'set' || !date || !field) return;
                    setFormData((prev) => ({ ...prev, [field]: toIsoDate(date) }));
                    return;
                  }
                  if (date && calendarFor) {
                    setFormData((prev) => ({ ...prev, [calendarFor]: toIsoDate(date) }));
                  }
                }}
              />
            ) : null}
            {Platform.OS === 'ios' ? (
              <Pressable style={styles.dateModalDone} onPress={() => setCalendarFor(null)}>
                <Text style={styles.modalButtonTextCreate}>{t('common.confirm')}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  filterChipPendingActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#2563eb',
  },
  filterChipTextPendingActive: {
    color: '#b45309',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardPending: {
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  cardHighlighted: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  namePriceContainer: {
    flex: 1,
  },
  guestName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pendingBanner: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    gap: 10,
  },
  pendingBannerTextWrap: {
    gap: 2,
  },
  pendingBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
  },
  pendingBannerText: {
    fontSize: 13,
    color: '#92400e',
  },
  pendingActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#d97706',
    borderRadius: 10,
    paddingVertical: 10,
  },
  pendingActionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  infoContainer: {
    gap: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  editButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  deleteActionButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  editButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '700',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalBody: {
    padding: 20,
    maxHeight: Platform.OS === 'ios' ? 560 : 520,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e3a8a',
    marginTop: 16,
    marginBottom: 4,
  },
  dateModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dateModalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 24,
  },
  dateModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  dateModalDone: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  datePickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f9fafb',
  },
  datePickRowText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
  },
  inputText: {
    fontSize: 16,
    color: '#1f2937',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  pickerOptionSelected: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  pickerOptionTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonCreate: {
    backgroundColor: '#2563eb',
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalButtonTextCreate: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
