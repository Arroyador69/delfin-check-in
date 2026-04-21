import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { openUpgradePlanInBrowser, suggestedUpgradeTargetPlan } from '@/lib/upgrade-plan';

type RepSettings = {
  enabled: boolean;
  reviewUrl: string;
  guestEmailLocale: 'es' | 'en';
  guestMessageEs: string;
  guestMessageEn: string;
};

type ReputationProperty = {
  id: number;
  property_name: string;
  google_review_url: string;
  room_id: string | null;
};

type PropertySlot = {
  room_id: string;
  room_name: string;
  property_id: number | null;
};

const defaultSettings: RepSettings = {
  enabled: false,
  reviewUrl: '',
  guestEmailLocale: 'es',
  guestMessageEs: '',
  guestMessageEn: '',
};

export default function ReputationSettingsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<RepSettings>(defaultSettings);
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [propertyUrlDraft, setPropertyUrlDraft] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['reputation-google'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/reputation-google');
      return res.data as { success?: boolean; settings?: RepSettings; isPro?: boolean };
    },
  });

  const { data: propsData } = useQuery({
    queryKey: ['reputation-google-properties'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/reputation-google/properties');
      return res.data as { success?: boolean; properties?: ReputationProperty[] };
    },
    enabled: Boolean(data?.isPro),
  });

  useEffect(() => {
    if (data?.settings) {
      setDraft({
        enabled: Boolean(data.settings.enabled),
        reviewUrl: data.settings.reviewUrl || '',
        guestEmailLocale: data.settings.guestEmailLocale === 'en' ? 'en' : 'es',
        guestMessageEs: data.settings.guestMessageEs || '',
        guestMessageEn: data.settings.guestMessageEn || '',
      });
    }
  }, [data]);

  useEffect(() => {
    const props = (propsData?.properties || []).filter((p) => Number.isFinite(Number(p.id)) && Number(p.id) > 0);
    if (props.length === 0) {
      setSelectedPropertyId(null);
      setPropertyUrlDraft('');
      return;
    }
    const initialId = selectedPropertyId && props.some((p) => p.id === selectedPropertyId) ? selectedPropertyId : props[0].id;
    setSelectedPropertyId(initialId);
    const found = props.find((p) => p.id === initialId);
    setPropertyUrlDraft(found?.google_review_url || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propsData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put('/api/tenant/reputation-google', draft);
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reputation-google'] });
      Alert.alert(t('common.success'), t('reputationGoogle.saved'));
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.error || e?.message || t('mobile.settings.saveFailed'));
    },
  });

  const savePropertyUrlMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPropertyId) throw new Error('propertyId missing');
      const res = await api.put('/api/tenant/reputation-google/properties', {
        propertyId: selectedPropertyId,
        googleReviewUrl: propertyUrlDraft,
      });
      return res.data as { success?: boolean; error?: string };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reputation-google-properties'] });
      Alert.alert(t('common.success'), t('reputationGoogle.propertySaved'));
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.error || e?.message || t('mobile.settings.saveFailed'));
    },
  });

  const isPro = Boolean(data?.isPro);
  const properties = (propsData?.properties || []).filter((p) => Number.isFinite(Number(p.id)) && Number(p.id) > 0);
  const selectedProperty = selectedPropertyId ? properties.find((p) => p.id === selectedPropertyId) : null;

  const { data: limitsData } = useQuery({
    queryKey: ['tenant-limits'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/limits');
      return res.data as { success?: boolean; tenant?: { limits?: { maxRooms?: number } }; currentRooms?: any[] };
    },
    enabled: Boolean(isPro),
  });

  const { data: slotsData } = useQuery({
    queryKey: ['tenant-property-slots'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/property-slots');
      return res.data as { success?: boolean; slots?: PropertySlot[] };
    },
    enabled: Boolean(isPro),
  });

  const maxRooms = Number(limitsData?.tenant?.limits?.maxRooms);
  const currentRooms = Array.isArray(limitsData?.currentRooms) ? limitsData!.currentRooms!.length : 0;
  const canCreateMoreUnits = Number.isFinite(maxRooms) && (maxRooms === -1 || currentRooms < maxRooms);
  const slots = (slotsData?.slots || []).map((s: any) => ({
    room_id: String((s as any).room_id),
    room_name: String((s as any).room_name || ''),
    property_id: (s as any).property_id != null ? Number((s as any).property_id) : null,
  }));

  const createPropertyMutation = useMutation({
    mutationFn: async (args: { room_id: string; room_name: string }) => {
      if (!canCreateMoreUnits) {
        throw new Error('limit');
      }
      const roomId = args.room_id;
      const payload: any = {
        room_id: Number.isFinite(Number(roomId)) ? Number(roomId) : roomId,
        property_name: args.room_name || `Unidad ${roomId}`,
        description: '',
        photos: [],
        max_guests: 2,
        bedrooms: 1,
        bathrooms: 1,
        amenities: [],
        base_price: 50,
        cleaning_fee: 0,
        security_deposit: 0,
        minimum_nights: 1,
        maximum_nights: 30,
        availability_rules: {},
        is_active: true,
      };
      const res = await api.post('/api/tenant/properties', payload);
      return res.data as { success?: boolean; error?: string };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tenant-property-slots'] }),
        queryClient.invalidateQueries({ queryKey: ['reputation-google-properties'] }),
        queryClient.invalidateQueries({ queryKey: ['tenant-limits'] }),
      ]);
      Alert.alert(t('common.success'), t('reputationGoogle.slotCreated'));
    },
    onError: (e: any) => {
      if (e?.message === 'limit') {
        Alert.alert(t('common.error'), t('reputationGoogle.slotsLimitReached'));
        return;
      }
      Alert.alert(t('common.error'), e?.response?.data?.error || e?.message || t('mobile.settings.saveFailed'));
    },
  });

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('reputationGoogle.title')}</Text>
          <Text style={styles.subtitle}>{t('mobile.settings.hubReputationSubtitle')}</Text>
        </View>
      </View>

      {!isPro ? (
        <View style={styles.card}>
          <Text style={styles.warn}>{t('mobile.settings.repNotPro')}</Text>
          <Pressable
            style={styles.upgradeCta}
            onPress={() =>
              void openUpgradePlanInBrowser(undefined, {
                planId: suggestedUpgradeTargetPlan(session?.user?.tenant?.planId),
                roomCount: Math.max(1, session?.user?.tenant?.currentRooms ?? 1),
              })
            }
          >
            <Text style={styles.upgradeCtaText}>{t('mobile.settings.upgradePlanButton')}</Text>
          </Pressable>
          <Text style={styles.upgradeHint}>{t('mobile.settings.upgradePlanHint')}</Text>
        </View>
      ) : null}

      <View style={[styles.card, !isPro && styles.dim]}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>{t('reputationGoogle.labelEnabled')}</Text>
          <Switch
            value={draft.enabled}
            onValueChange={(v) => setDraft((d) => ({ ...d, enabled: v }))}
            disabled={!isPro || isLoading}
          />
        </View>
        <Text style={styles.label}>{t('reputationGoogle.labelUrl')}</Text>
        <TextInput
          style={styles.input}
          value={draft.reviewUrl}
          onChangeText={(v) => setDraft((d) => ({ ...d, reviewUrl: v }))}
          placeholder="https://g.page/..."
          autoCapitalize="none"
          editable={isPro}
        />
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>{t('reputationGoogle.propertyLinksTitle')}</Text>
          <Text style={styles.sectionSubtitle}>{t('reputationGoogle.propertyLinksSubtitle')}</Text>

          {properties.length === 0 ? (
            <Text style={styles.sectionEmpty}>{t('reputationGoogle.propertyLinksEmpty')}</Text>
          ) : (
            <>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>{t('reputationGoogle.propertyLinksSelect')}</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    style={[styles.smallBtn, (!isPro || properties.length < 2) && styles.disabled]}
                    disabled={!isPro || properties.length < 2}
                    onPress={() => {
                      if (properties.length < 2) return;
                      const idx = properties.findIndex((p) => p.id === selectedPropertyId);
                      const prev = idx <= 0 ? properties[properties.length - 1] : properties[idx - 1];
                      setSelectedPropertyId(prev.id);
                      setPropertyUrlDraft(prev.google_review_url || '');
                    }}
                  >
                    <Text style={styles.smallBtnText}>‹</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.smallBtn, (!isPro || properties.length < 2) && styles.disabled]}
                    disabled={!isPro || properties.length < 2}
                    onPress={() => {
                      if (properties.length < 2) return;
                      const idx = properties.findIndex((p) => p.id === selectedPropertyId);
                      const next = idx < 0 || idx === properties.length - 1 ? properties[0] : properties[idx + 1];
                      setSelectedPropertyId(next.id);
                      setPropertyUrlDraft(next.google_review_url || '');
                    }}
                  >
                    <Text style={styles.smallBtnText}>›</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.propertyLine}>
                {selectedProperty
                  ? `${selectedProperty.property_name || `#${selectedProperty.id}`} · ID ${selectedProperty.id}`
                  : t('reputationGoogle.propertyLinksSelect')}
              </Text>

              <Text style={styles.label}>{t('reputationGoogle.propertyLinksUrl')}</Text>
              <TextInput
                style={styles.input}
                value={propertyUrlDraft}
                onChangeText={(v) => setPropertyUrlDraft(v)}
                placeholder="https://g.page/..."
                autoCapitalize="none"
                editable={isPro}
              />
              <Text style={styles.sectionHint}>{t('reputationGoogle.propertyLinksHint')}</Text>
              <Text style={styles.sectionHint}>{t('reputationGoogle.propertyLinksFallback')}</Text>

              <Pressable
                style={[styles.secondaryBtn, (!isPro || savePropertyUrlMutation.isPending) && styles.disabled]}
                disabled={!isPro || savePropertyUrlMutation.isPending}
                onPress={() => savePropertyUrlMutation.mutate()}
              >
                <Text style={styles.secondaryBtnText}>{t('reputationGoogle.propertyLinksSave')}</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>{t('reputationGoogle.slotsTitle')}</Text>
          <Text style={styles.sectionSubtitle}>{t('reputationGoogle.slotsSubtitle')}</Text>
          {Number.isFinite(maxRooms) ? (
            <Text style={styles.sectionHint}>
              {t('reputationGoogle.slotsUsage', { used: currentRooms, max: maxRooms === -1 ? '∞' : maxRooms })}
            </Text>
          ) : null}

          {slots.length === 0 ? (
            <Text style={styles.sectionEmpty}>{t('reputationGoogle.slotsEmpty')}</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {slots.map((s) => {
                const mapped = s.property_id != null;
                return (
                  <View key={s.room_id} style={styles.slotRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.slotName}>{s.room_name || `#${s.room_id}`}</Text>
                      <Text style={styles.slotMeta}>{mapped ? t('reputationGoogle.slotMapped') : t('reputationGoogle.slotUnmapped')}</Text>
                    </View>
                    {!mapped ? (
                      <Pressable
                        style={[styles.slotBtn, (!isPro || !canCreateMoreUnits || createPropertyMutation.isPending) && styles.disabled]}
                        disabled={!isPro || !canCreateMoreUnits || createPropertyMutation.isPending}
                        onPress={() => createPropertyMutation.mutate({ room_id: s.room_id, room_name: s.room_name })}
                      >
                        <Text style={styles.slotBtnText}>
                          {createPropertyMutation.isPending ? t('reputationGoogle.creating') : t('reputationGoogle.slotCreate')}
                        </Text>
                      </Pressable>
                    ) : (
                      <View style={styles.slotReadyPill}>
                        <Text style={styles.slotReadyText}>{t('reputationGoogle.slotReady')}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
              {!canCreateMoreUnits ? (
                <Text style={styles.limitWarn}>{t('reputationGoogle.slotsLimitReached')}</Text>
              ) : null}
            </View>
          )}
        </View>
        <Text style={styles.label}>{t('reputationGoogle.labelLocale')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            {(['es', 'en'] as const).map((loc) => (
              <Pressable
                key={loc}
                style={[styles.chip, draft.guestEmailLocale === loc && styles.chipOn]}
                onPress={() => isPro && setDraft((d) => ({ ...d, guestEmailLocale: loc }))}
              >
                <Text style={draft.guestEmailLocale === loc ? styles.chipOnText : styles.chipText}>
                  {loc === 'es' ? t('reputationGoogle.localeEs') : t('reputationGoogle.localeEn')}
                </Text>
              </Pressable>
            ))}
        </View>
        <Text style={styles.label}>{t('reputationGoogle.labelMessageEs')}</Text>
        <TextInput
          style={styles.textarea}
          multiline
          value={draft.guestMessageEs}
          onChangeText={(v) => setDraft((d) => ({ ...d, guestMessageEs: v }))}
          editable={isPro}
        />
        <Text style={styles.label}>{t('reputationGoogle.labelMessageEn')}</Text>
        <TextInput
          style={styles.textarea}
          multiline
          value={draft.guestMessageEn}
          onChangeText={(v) => setDraft((d) => ({ ...d, guestMessageEn: v }))}
          editable={isPro}
        />
        <Pressable
          style={[styles.primaryBtn, (!isPro || saveMutation.isPending) && styles.disabled]}
          disabled={!isPro || saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
        >
          <Text style={styles.primaryBtnText}>{t('reputationGoogle.save')}</Text>
        </Pressable>
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', gap: 10, padding: 16 },
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
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dim: { opacity: 0.55 },
  warn: { fontSize: 14, color: '#b45309', fontWeight: '700' },
  upgradeCta: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradeCtaText: { color: 'white', fontWeight: '800', fontSize: 15 },
  upgradeHint: {
    marginTop: 10,
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  sectionBox: {
    marginTop: 6,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#111827' },
  sectionSubtitle: { marginTop: 3, fontSize: 11, color: '#6b7280', lineHeight: 15, marginBottom: 10 },
  sectionHint: { marginTop: 2, fontSize: 11, color: '#6b7280', lineHeight: 15 },
  sectionEmpty: { fontSize: 11, color: '#6b7280', lineHeight: 16 },
  propertyLine: { fontSize: 12, color: '#111827', fontWeight: '800', marginBottom: 10 },
  smallBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: { fontSize: 18, fontWeight: '900', color: '#111827', marginTop: -1 },
  textarea: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    backgroundColor: '#f9fafb',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  chipOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontWeight: '700', color: '#374151' },
  chipOnText: { fontWeight: '800', color: 'white' },
  secondaryBtn: { marginTop: 10, paddingVertical: 12, borderRadius: 12, backgroundColor: '#2563eb', alignItems: 'center' },
  secondaryBtnText: { color: 'white', fontWeight: '900' },
  slotRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  slotName: { fontSize: 12, fontWeight: '900', color: '#111827' },
  slotMeta: { marginTop: 2, fontSize: 11, color: '#6b7280' },
  slotBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#059669',
  },
  slotBtnText: { color: 'white', fontWeight: '900', fontSize: 12 },
  slotReadyPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
  },
  slotReadyText: { color: '#047857', fontWeight: '900', fontSize: 12 },
  limitWarn: {
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
    color: '#92400e',
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 16,
  },
  primaryBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#059669', alignItems: 'center' },
  primaryBtnText: { color: 'white', fontWeight: '900' },
  disabled: { opacity: 0.5 },
});
