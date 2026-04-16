// =====================================================
// ENLACES DE PAGO - Crear y gestionar enlaces
// =====================================================

import { View, Text, FlatList, StyleSheet, RefreshControl, Pressable, Modal, ScrollView, TextInput, Alert } from 'react-native';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { Plus, X, Copy, CheckCircle, XCircle } from 'lucide-react-native';
import { Clipboard } from 'react-native';
import { getLocaleTag, t } from '@/lib/i18n';

interface PaymentLink {
  id: number;
  link_code: string;
  link_name: string | null;
  resource_type: 'room' | 'property';
  resource_id: number;
  check_in_date: string;
  check_out_date: string;
  /** Puede venir como string (NUMERIC) o null según BD/API */
  total_price: number | string | null | undefined;
  base_price_per_night: number | null;
  cleaning_fee: number;
  expected_guests: number;
  expires_at: string | null;
  max_uses: number;
  usage_count: number;
  is_paid: boolean;
  link_url?: string;
  created_at: string;
}

interface RoomSlot {
  property_id: number | null;
  room_id: string;
  room_name: string;
  property_name: string | null;
  is_placeholder: boolean;
}

interface Property {
  id: number;
  property_name: string;
}

export default function PaymentLinksScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    link_name: '',
    resource_type: 'room' as 'room' | 'property',
    resource_id: '',
    check_in_date: '',
    check_out_date: '',
    total_price: '',
    base_price_per_night: '',
    cleaning_fee: '0',
    expected_guests: '2',
    expires_at: '',
    internal_notes: '',
  });

  // Obtener enlaces de pago
  const { data: linksData, isLoading } = useQuery({
    queryKey: ['payment-links'],
    queryFn: async () => {
      const response = await api.get('/api/payment-links');
      return response.data;
    },
  });

  const links: PaymentLink[] = linksData?.links || [];

  // Obtener slots de habitaciones
  const { data: slotsData } = useQuery({
    queryKey: ['property-slots'],
    queryFn: async () => {
      const response = await api.get('/api/tenant/property-slots');
      return response.data.slots || [];
    },
  });

  const slots: RoomSlot[] = slotsData || [];

  // Obtener propiedades
  const { data: propertiesData } = useQuery({
    queryKey: ['properties'],
    queryFn: async () => {
      const response = await api.get('/api/tenant/properties');
      return response.data.properties || [];
    },
  });

  const properties: Property[] = propertiesData || [];

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['payment-links'] }),
      queryClient.refetchQueries({ queryKey: ['property-slots'] }),
      queryClient.refetchQueries({ queryKey: ['properties'] }),
    ]);
    setRefreshing(false);
  };

  const createLink = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/api/payment-links', {
        link_name: data.link_name || null,
        resource_type: data.resource_type,
        resource_id: parseInt(data.resource_id),
        check_in_date: data.check_in_date,
        check_out_date: data.check_out_date,
        total_price: parseFloat(data.total_price),
        base_price_per_night: data.base_price_per_night ? parseFloat(data.base_price_per_night) : null,
        cleaning_fee: parseFloat(data.cleaning_fee),
        expected_guests: parseInt(data.expected_guests),
        expires_at: data.expires_at || null,
        max_uses: 1,
        internal_notes: data.internal_notes || null,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-links'] });
      setShowCreateModal(false);
      resetForm();
      Alert.alert(t('common.success'), t('settings.paymentLinks.createSuccess'));
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.error || t('settings.paymentLinks.errorCreate'));
    },
  });

  const deleteLink = useMutation({
    mutationFn: async (linkCode: string) => {
      const response = await api.delete(`/api/payment-links/${linkCode}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-links'] });
      Alert.alert(t('common.success'), t('settings.paymentLinks.deleteSuccess'));
    },
    onError: (error: any) => {
      Alert.alert(t('common.error'), error.response?.data?.error || t('settings.paymentLinks.errorDelete'));
    },
  });

  const handleCreate = () => {
    if (!formData.resource_id || !formData.check_in_date || !formData.check_out_date || !formData.total_price) {
      Alert.alert(t('common.error'), t('settings.paymentLinks.requiredFields'));
      return;
    }
    createLink.mutate(formData);
  };

  const handleCopy = async (url: string, linkCode: string) => {
    Clipboard.setString(url);
    setCopiedLink(linkCode);
    setTimeout(() => setCopiedLink(null), 2000);
    Alert.alert(t('common.success'), t('settings.paymentLinks.urlCopied'));
  };

  const handleDelete = (linkCode: string) => {
    Alert.alert(
      t('settings.paymentLinks.deleteLink'),
      t('settings.paymentLinks.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteLink.mutate(linkCode),
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      link_name: '',
      resource_type: 'room',
      resource_id: '',
      check_in_date: '',
      check_out_date: '',
      total_price: '',
      base_price_per_night: '',
      cleaning_fee: '0',
      expected_guests: '2',
      expires_at: '',
      internal_notes: '',
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(getLocaleTag(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPriceEur = (raw: unknown) => {
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
    if (!Number.isFinite(n)) return '—';
    return `${n.toFixed(2)} €`;
  };

  const getResourceName = (link: PaymentLink) => {
    if (link.resource_type === 'room') {
      const slot = slots.find(s => String(s.room_id) === String(link.resource_id));
      return slot?.room_name || slot?.property_name || t('reservations.roomFallback', { number: link.resource_id });
    } else {
      const property = properties.find(p => p.id === link.resource_id);
      return property?.property_name || t('settings.paymentLinks.propertyFallback', { id: link.resource_id });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('settings.paymentLinks.title')}</Text>
        <Pressable
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={20} color="white" />
          <Text style={styles.createButtonText}>{t('settings.paymentLinks.newLink')}</Text>
        </Pressable>
      </View>

      {/* Lista de enlaces */}
      {isLoading && !linksData ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : (
        <FlatList
          data={links}
          keyExtractor={(item) => item.link_code}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.linkName}>
                    {item.link_name || item.link_code}
                  </Text>
                  <View style={styles.statusContainer}>
                    {item.is_paid ? (
                      <View style={[styles.statusBadge, styles.statusPaid]}>
                        <CheckCircle size={16} color="#10b981" />
                        <Text style={styles.statusTextPaid}>{t('settings.paymentLinks.paid')}</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusBadge, styles.statusUnpaid]}>
                        <XCircle size={16} color="#ef4444" />
                        <Text style={styles.statusTextUnpaid}>{t('mobile.paymentLinks.unpaid')}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.link_code)}
                >
                  <X size={18} color="#ef4444" />
                </Pressable>
              </View>

              <Text style={styles.resourceName}>
                {getResourceName(item)}
              </Text>

              <View style={styles.datesContainer}>
                <Text style={styles.dateText}>
                  📅 {formatDate(item.check_in_date)} - {formatDate(item.check_out_date)}
                </Text>
              </View>

              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>{t('settings.paymentLinks.totalPriceLabel')}</Text>
                <Text style={styles.priceValue}>{formatPriceEur(item.total_price)}</Text>
              </View>

              <View style={styles.usageContainer}>
                <Text style={styles.usageText}>
                  {t('mobile.paymentLinks.uses')}: {item.usage_count} / {item.max_uses}
                </Text>
              </View>

              {item.link_url && (
                <Pressable
                  style={styles.copyButton}
                  onPress={() => handleCopy(item.link_url!, item.link_code)}
                >
                  <Copy size={16} color="#2563eb" />
                  <Text style={styles.copyButtonText}>
                    {copiedLink === item.link_code ? t('mobile.paymentLinks.copiedLabel') : t('settings.paymentLinks.copyLink')}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('settings.paymentLinks.noLinks')}</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Modal crear enlace */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('settings.paymentLinks.createFormTitle')}</Text>
              <Pressable onPress={() => setShowCreateModal(false)}>
                <X size={24} color="#6b7280" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>{t('settings.paymentLinks.linkNameLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.link_name}
                onChangeText={(text) => setFormData({ ...formData, link_name: text })}
                placeholder={t('settings.paymentLinks.linkNamePlaceholder')}
              />

              <Text style={styles.label}>{t('settings.paymentLinks.resourceTypeLabel')}</Text>
              <View style={styles.pickerContainer}>
                <Pressable
                  style={[
                    styles.pickerOption,
                    formData.resource_type === 'room' && styles.pickerOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, resource_type: 'room', resource_id: '' })}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      formData.resource_type === 'room' && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {t('settings.paymentLinks.room')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.pickerOption,
                    formData.resource_type === 'property' && styles.pickerOptionSelected,
                  ]}
                  onPress={() => setFormData({ ...formData, resource_type: 'property', resource_id: '' })}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      formData.resource_type === 'property' && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {t('settings.paymentLinks.property')}
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.label}>
                {formData.resource_type === 'room' ? t('settings.paymentLinks.roomLabel') : t('settings.paymentLinks.propertyLabel')}
              </Text>
              <View style={styles.pickerContainer}>
                {(formData.resource_type === 'room' ? slots : properties).map((item) => (
                  <Pressable
                    key={formData.resource_type === 'room' ? (item as RoomSlot).room_id : (item as Property).id}
                    style={[
                      styles.pickerOption,
                      formData.resource_id === String(formData.resource_type === 'room' ? (item as RoomSlot).room_id : (item as Property).id) &&
                        styles.pickerOptionSelected,
                    ]}
                    onPress={() =>
                      setFormData({
                        ...formData,
                        resource_id: String(formData.resource_type === 'room' ? (item as RoomSlot).room_id : (item as Property).id),
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.resource_id === String(formData.resource_type === 'room' ? (item as RoomSlot).room_id : (item as Property).id) &&
                          styles.pickerOptionTextSelected,
                      ]}
                    >
                      {formData.resource_type === 'room'
                        ? (item as RoomSlot).room_name || (item as RoomSlot).property_name
                        : (item as Property).property_name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>{t('settings.paymentLinks.checkInLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.check_in_date}
                onChangeText={(text) => setFormData({ ...formData, check_in_date: text })}
                placeholder={t('settings.paymentLinks.dateIsoPlaceholder')}
              />

              <Text style={styles.label}>{t('settings.paymentLinks.checkOutLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.check_out_date}
                onChangeText={(text) => setFormData({ ...formData, check_out_date: text })}
                placeholder={t('settings.paymentLinks.dateIsoPlaceholder')}
              />

              <Text style={styles.label}>{t('settings.paymentLinks.totalPriceLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.total_price}
                onChangeText={(text) => setFormData({ ...formData, total_price: text })}
                placeholder={t('settings.paymentLinks.priceDecimalPlaceholder')}
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>{t('settings.paymentLinks.pricePerNightLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.base_price_per_night}
                onChangeText={(text) => setFormData({ ...formData, base_price_per_night: text })}
                placeholder={t('settings.paymentLinks.priceDecimalPlaceholder')}
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>{t('settings.paymentLinks.cleaningFeeLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.cleaning_fee}
                onChangeText={(text) => setFormData({ ...formData, cleaning_fee: text })}
                placeholder={t('settings.paymentLinks.priceDecimalPlaceholder')}
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>{t('settings.paymentLinks.expectedGuestsLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.expected_guests}
                onChangeText={(text) => setFormData({ ...formData, expected_guests: text })}
                placeholder={t('settings.paymentLinks.expectedGuestsPlaceholder')}
                keyboardType="numeric"
              />

              <Text style={styles.label}>{t('settings.paymentLinks.expiryLabel')}</Text>
              <TextInput
                style={styles.input}
                value={formData.expires_at}
                onChangeText={(text) => setFormData({ ...formData, expires_at: text })}
                placeholder={t('settings.paymentLinks.dateTimeIsoPlaceholder')}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCreate]}
                onPress={handleCreate}
                disabled={createLink.isPending}
              >
                <Text style={styles.modalButtonTextCreate}>
                  {createLink.isPending ? t('common.loading') : t('settings.paymentLinks.createLink')}
                </Text>
              </Pressable>
            </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  linkName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  statusContainer: {
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
  },
  statusPaid: {
    backgroundColor: '#10b98120',
  },
  statusUnpaid: {
    backgroundColor: '#ef444420',
  },
  statusTextPaid: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10b981',
  },
  statusTextUnpaid: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  deleteButton: {
    padding: 4,
  },
  resourceName: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
    marginBottom: 8,
  },
  datesContainer: {
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  priceLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  usageContainer: {
    marginBottom: 8,
  },
  usageText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
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

