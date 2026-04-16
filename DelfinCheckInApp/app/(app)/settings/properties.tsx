import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Switch,
  Alert,
  Linking,
  Clipboard,
  Platform,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { X } from 'lucide-react-native';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { KeyboardAwareFormModal } from '@/components/KeyboardAwareFormModal';

type TenantPropertyRow = {
  id: number | null;
  tenant_id?: string;
  property_name: string;
  description?: string | null;
  photos?: unknown[];
  max_guests?: number;
  bedrooms?: number;
  bathrooms?: number;
  base_price?: number;
  cleaning_fee?: number;
  security_deposit?: number;
  minimum_nights?: number;
  maximum_nights?: number;
  is_active?: boolean;
  room_id?: string | null;
  is_placeholder?: boolean;
};

type Draft = {
  property_name: string;
  description: string;
  max_guests: string;
  base_price: string;
  cleaning_fee: string;
  security_deposit: string;
  minimum_nights: string;
  maximum_nights: string;
  bedrooms: string;
  bathrooms: string;
  is_active: boolean;
};

const emptyDraft: Draft = {
  property_name: '',
  description: '',
  max_guests: '2',
  base_price: '',
  cleaning_fee: '0',
  security_deposit: '0',
  minimum_nights: '1',
  maximum_nights: '30',
  bedrooms: '1',
  bathrooms: '1',
  is_active: true,
};

function rowToDraft(p: TenantPropertyRow): Draft {
  return {
    property_name: p.property_name || '',
    description: String(p.description ?? ''),
    max_guests: String(p.max_guests ?? 2),
    base_price: String(p.base_price ?? ''),
    cleaning_fee: String(p.cleaning_fee ?? 0),
    security_deposit: String(p.security_deposit ?? 0),
    minimum_nights: String(p.minimum_nights ?? 1),
    maximum_nights: String(p.maximum_nights ?? 30),
    bedrooms: String(p.bedrooms ?? 1),
    bathrooms: String(p.bathrooms ?? 1),
    is_active: p.is_active !== false,
  };
}

export default function PropertiesSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [editing, setEditing] = useState<TenantPropertyRow | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const tenantId = session?.user?.tenant?.id || '';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenant-properties-settings'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/properties');
      return res.data as { success?: boolean; properties?: TenantPropertyRow[] };
    },
  });

  const list = data?.properties ?? [];
  const displayList = useMemo(() => list.filter((p) => !p.is_placeholder), [list]);

  function openEdit(p: TenantPropertyRow) {
    setEditing(p);
    setDraft(rowToDraft(p));
  }

  function closeEdit() {
    setEditing(null);
    setDraft(emptyDraft);
  }

  function getBookingUrl(propertyId: number): string {
    return `https://book.delfincheckin.com/${tenantId}/${propertyId}`;
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error('no editor');
      const basePrice = parseFloat(String(draft.base_price).replace(',', '.'));
      if (!draft.property_name.trim() || !(basePrice > 0)) {
        throw new Error('validation');
      }
      const payload = {
        property_name: draft.property_name.trim(),
        description: draft.description.trim(),
        max_guests: parseInt(draft.max_guests, 10) || 2,
        bedrooms: parseInt(draft.bedrooms, 10) || 1,
        bathrooms: parseInt(draft.bathrooms, 10) || 1,
        base_price: basePrice,
        cleaning_fee: parseFloat(String(draft.cleaning_fee).replace(',', '.')) || 0,
        security_deposit: parseFloat(String(draft.security_deposit).replace(',', '.')) || 0,
        minimum_nights: parseInt(draft.minimum_nights, 10) || 1,
        maximum_nights: parseInt(draft.maximum_nights, 10) || 30,
        is_active: draft.is_active,
      };

      if (editing.id != null) {
        await api.put(`/api/tenant/properties?id=${editing.id}`, payload);
        return;
      }

      if (!editing.room_id) {
        throw new Error('no room');
      }

      await api.post('/api/tenant/properties', {
        ...payload,
        photos: [],
        amenities: [],
        availability_rules: {},
        room_id: editing.room_id,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenant-properties-settings'] });
      await queryClient.invalidateQueries({ queryKey: ['payment-links'] });
      Alert.alert(t('common.success'), t('mobile.settings.propertiesSaved'));
      closeEdit();
    },
    onError: (e: unknown) => {
      const msg =
        e && typeof e === 'object' && 'message' in e && (e as { message?: string }).message === 'validation'
          ? t('mobile.settings.propertiesSaveError')
          : e && typeof e === 'object' && 'response' in e
            ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error || '')
            : '';
      Alert.alert(t('common.error'), msg || t('mobile.settings.propertiesSaveError'));
    },
  });

  function copyLink(url: string) {
    Clipboard.setString(url);
    Alert.alert(t('common.success'), t('mobile.settings.propertiesLinkCopied'));
  }

  const isPlaceholder = Boolean(editing?.is_placeholder || editing?.id == null);
  const modalTitle = isPlaceholder ? t('mobile.settings.propertiesNewSlotTitle') : t('mobile.settings.propertiesEditTitle');

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>{'\u2039'}</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('settings.tabs.properties')}</Text>
            <Text style={styles.subtitle}>{t('mobile.settings.hubPropertiesSubtitle')}</Text>
            <Text style={styles.hint}>{t('mobile.settings.propertiesTapToEdit')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          {isLoading ? (
            <ActivityIndicator color="#2563eb" />
          ) : isError ? (
            <Text style={styles.muted}>{t('common.error')}</Text>
          ) : displayList.length === 0 ? (
            <Text style={styles.muted}>{t('mobile.settings.propertiesEmpty')}</Text>
          ) : (
            displayList.map((p, idx) => (
              <Pressable
                key={p.id != null ? `p-${p.id}` : `ph-${p.room_id ?? idx}`}
                style={[styles.row, idx > 0 && styles.rowBorder]}
                onPress={() => openEdit(p)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{p.property_name}</Text>
                  {p.is_placeholder ? (
                    <Text style={styles.badge}>{t('mobile.settings.propertyDraftHint')}</Text>
                  ) : p.is_active === false ? (
                    <Text style={styles.badge}>{t('settings.paymentLinks.inactive')}</Text>
                  ) : (
                    <Text style={styles.badgeOk}>{t('settings.paymentLinks.active')}</Text>
                  )}
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>

      <KeyboardAwareFormModal visible={editing != null} onRequestClose={closeEdit}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <Pressable onPress={closeEdit} hitSlop={12}>
              <X size={24} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalBody}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          >
            {!isPlaceholder && editing?.id != null ? (
              <View style={styles.linkBlock}>
                <Text style={styles.label}>{t('mobile.settings.propertiesBookingLink')}</Text>
                <Text selectable style={styles.linkUrl}>
                  {getBookingUrl(editing.id)}
                </Text>
                <View style={styles.linkActions}>
                  <Pressable style={styles.linkBtn} onPress={() => copyLink(getBookingUrl(editing.id!))}>
                    <Text style={styles.linkBtnText}>{t('mobile.settings.propertiesCopyLink')}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.linkBtn}
                    onPress={() => void Linking.openURL(getBookingUrl(editing.id!))}
                  >
                    <Text style={styles.linkBtnText}>{t('mobile.settings.propertiesOpenInBrowser')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Text style={styles.label}>{t('mobile.settings.propertiesFieldName')}</Text>
            <TextInput
              style={styles.input}
              value={draft.property_name}
              onChangeText={(v) => setDraft((d) => ({ ...d, property_name: v }))}
            />

            <Text style={styles.label}>{t('mobile.settings.propertiesFieldDescription')}</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              multiline
              textAlignVertical="top"
              value={draft.description}
              onChangeText={(v) => setDraft((d) => ({ ...d, description: v }))}
            />

            <Text style={styles.label}>{t('mobile.settings.propertiesFieldMaxGuests')}</Text>
            <TextInput
              style={styles.input}
              value={draft.max_guests}
              onChangeText={(v) => setDraft((d) => ({ ...d, max_guests: v }))}
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('mobile.settings.propertiesFieldBasePrice')}</Text>
            <TextInput
              style={styles.input}
              value={draft.base_price}
              onChangeText={(v) => setDraft((d) => ({ ...d, base_price: v }))}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>{t('mobile.settings.propertiesFieldCleaningFee')}</Text>
            <TextInput
              style={styles.input}
              value={draft.cleaning_fee}
              onChangeText={(v) => setDraft((d) => ({ ...d, cleaning_fee: v }))}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>{t('mobile.settings.propertiesFieldDeposit')}</Text>
            <TextInput
              style={styles.input}
              value={draft.security_deposit}
              onChangeText={(v) => setDraft((d) => ({ ...d, security_deposit: v }))}
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>{t('mobile.settings.propertiesFieldMinNights')}</Text>
            <TextInput
              style={styles.input}
              value={draft.minimum_nights}
              onChangeText={(v) => setDraft((d) => ({ ...d, minimum_nights: v }))}
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('mobile.settings.propertiesFieldMaxNights')}</Text>
            <TextInput
              style={styles.input}
              value={draft.maximum_nights}
              onChangeText={(v) => setDraft((d) => ({ ...d, maximum_nights: v }))}
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('mobile.settings.propertiesFieldBedrooms')}</Text>
            <TextInput
              style={styles.input}
              value={draft.bedrooms}
              onChangeText={(v) => setDraft((d) => ({ ...d, bedrooms: v }))}
              keyboardType="numeric"
            />

            <Text style={styles.label}>{t('mobile.settings.propertiesFieldBathrooms')}</Text>
            <TextInput
              style={styles.input}
              value={draft.bathrooms}
              onChangeText={(v) => setDraft((d) => ({ ...d, bathrooms: v }))}
              keyboardType="numeric"
            />

            {!isPlaceholder ? (
              <View style={styles.switchRow}>
                <Text style={styles.labelInline}>{t('mobile.settings.propertiesActive')}</Text>
                <Switch value={draft.is_active} onValueChange={(v) => setDraft((d) => ({ ...d, is_active: v }))} />
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable style={[styles.footerBtn, styles.footerCancel]} onPress={closeEdit}>
              <Text style={styles.footerCancelText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              style={[styles.footerBtn, styles.footerSave, saveMutation.isPending && styles.disabled]}
              onPress={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.footerSaveText}>{t('common.save')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAwareFormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 22, fontWeight: '900', color: '#111827', marginTop: -2 },
  title: { fontSize: 18, fontWeight: '900', color: '#111827' },
  subtitle: { marginTop: 2, fontSize: 12, color: '#6b7280' },
  hint: { marginTop: 6, fontSize: 11, color: '#9ca3af', lineHeight: 15 },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 80,
  },
  muted: { color: '#6b7280', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  badge: { marginTop: 4, fontSize: 11, color: '#6b7280', fontWeight: '600' },
  badgeOk: { marginTop: 4, fontSize: 11, color: '#059669', fontWeight: '700' },
  chevron: { fontSize: 22, color: '#9ca3af', paddingLeft: 8 },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#111827', flex: 1, paddingRight: 8 },
  modalBody: { paddingHorizontal: 16, maxHeight: 520 },
  label: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 12, marginBottom: 6 },
  labelInline: { fontSize: 14, fontWeight: '700', color: '#374151' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    color: '#111827',
  },
  textarea: { minHeight: 72 },
  linkBlock: {
    marginBottom: 8,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  linkUrl: { fontSize: 12, color: '#0369a1', marginTop: 4 },
  linkActions: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  linkBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2563eb',
    borderRadius: 10,
  },
  linkBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCancel: { backgroundColor: '#f3f4f6' },
  footerCancelText: { fontWeight: '700', color: '#6b7280' },
  footerSave: { backgroundColor: '#059669' },
  footerSaveText: { fontWeight: '800', color: 'white' },
  disabled: { opacity: 0.6 },
});
