import { View, Text, StyleSheet, Switch, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import {
  BOOKING_CHANNELS_CORE,
  BOOKING_CHANNELS_OTA_PRESETS,
  defaultBookingChannelsConfig,
  normalizeBookingChannels,
  newCustomChannelId,
  type BookingChannelsConfig,
} from '@/lib/booking-channels';

export default function BookingChannelsSettingsBlock() {
  const queryClient = useQueryClient();
  const [cfg, setCfg] = useState<BookingChannelsConfig | null>(null);
  const [otherName, setOtherName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['booking-channels'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/booking-channels');
      return res.data as { success?: boolean; bookingChannels?: unknown };
    },
  });

  useEffect(() => {
    const raw = data?.bookingChannels;
    setCfg(raw ? normalizeBookingChannels(raw) : defaultBookingChannelsConfig());
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (next: BookingChannelsConfig) => {
      await api.put('/api/tenant/booking-channels', { bookingChannels: next });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['booking-channels'] });
      Alert.alert(t('common.success'), t('settings.bookingChannels.saved'));
    },
    onError: () => Alert.alert(t('common.error'), t('settings.bookingChannels.saveError')),
  });

  if (isLoading && !cfg) {
    return (
      <View style={styles.card}>
        <ActivityIndicator style={{ marginVertical: 12 }} />
      </View>
    );
  }

  const c = cfg ?? defaultBookingChannelsConfig();

  const toggleOta = (id: string) => {
    const has = c.presets.includes(id);
    let presets = [...c.presets];
    if (has) presets = presets.filter((x) => x !== id);
    else presets.push(id);
    for (const core of BOOKING_CHANNELS_CORE) {
      if (!presets.includes(core)) presets.push(core);
    }
    setCfg({ ...c, presets: [...new Set(presets)] });
  };

  const addCustom = () => {
    const label = otherName.trim();
    if (!label) return;
    const id = newCustomChannelId();
    setCfg({ ...c, custom: [...c.custom, { id, label }] });
    setOtherName('');
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('settings.bookingChannels.title')}</Text>
      <Text style={styles.muted}>{t('settings.bookingChannels.description')}</Text>

      <Text style={styles.subLabel}>{t('settings.bookingChannels.coreLabel')}</Text>
      <View style={styles.chipRow}>
        {BOOKING_CHANNELS_CORE.map((id) => (
          <View key={id} style={styles.chip}>
            <Text style={styles.chipText}>{t(`settings.bookingChannels.preset.${id}`)}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.microHint}>{t('settings.bookingChannels.coreHint')}</Text>

      <Text style={styles.subLabel}>{t('settings.bookingChannels.otasLabel')}</Text>
      {BOOKING_CHANNELS_OTA_PRESETS.map((id) => (
        <View key={id} style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t(`settings.bookingChannels.preset.${id}`)}</Text>
          <Switch
            value={c.presets.includes(id)}
            onValueChange={() => toggleOta(id)}
            trackColor={{ false: '#e5e7eb', true: '#93c5fd' }}
            thumbColor={c.presets.includes(id) ? '#2563eb' : '#f4f4f5'}
          />
        </View>
      ))}

      <Text style={styles.subLabel}>{t('settings.bookingChannels.customLabel')}</Text>
      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          value={otherName}
          onChangeText={setOtherName}
          placeholder={t('settings.bookingChannels.customPlaceholder')}
          onSubmitEditing={addCustom}
        />
        <Pressable style={styles.addBtn} onPress={addCustom}>
          <Text style={styles.addBtnText}>{t('settings.bookingChannels.customAdd')}</Text>
        </Pressable>
      </View>
      {c.custom.map((row) => (
        <View key={row.id} style={styles.customRow}>
          <Text style={styles.customLabel}>{row.label}</Text>
          <Pressable
            onPress={() => setCfg({ ...c, custom: c.custom.filter((x) => x.id !== row.id) })}
          >
            <Text style={styles.remove}>{t('settings.bookingChannels.customRemove')}</Text>
          </Pressable>
        </View>
      ))}

      <Pressable
        style={[styles.primaryBtn, saveMutation.isPending && styles.disabled]}
        onPress={() => saveMutation.mutate(c)}
        disabled={saveMutation.isPending}
      >
        <Text style={styles.primaryBtnText}>
          {saveMutation.isPending ? t('settings.bookingChannels.saving') : t('settings.bookingChannels.save')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },
  muted: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  subLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 10, marginBottom: 8 },
  microHint: { fontSize: 11, color: '#6b7280', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#d1fae5',
  },
  chipText: { fontSize: 12, fontWeight: '700', color: '#065f46' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  switchLabel: { fontSize: 14, color: '#111827', flex: 1, paddingRight: 12 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 15,
    color: '#111827',
    marginBottom: 10,
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#2563eb',
  },
  addBtnText: { color: 'white', fontWeight: '800', fontSize: 13 },
  customRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  customLabel: { fontSize: 14, color: '#111827', flex: 1 },
  remove: { fontSize: 13, color: '#dc2626', fontWeight: '700' },
  primaryBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  primaryBtnText: { color: 'white', fontWeight: '900', fontSize: 15 },
  disabled: { opacity: 0.6 },
});
