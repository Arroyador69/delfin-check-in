import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, FlatList } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

type CalendarRow = {
  id: string;
  calendar_name: string;
  calendar_url: string;
  property_name?: string | null;
  sync_status?: string | null;
};

type PropertyRow = { id: number; property_name: string };

export default function IntegrationsSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [propertyId, setPropertyId] = useState<number | null>(null);

  const { data: calData } = useQuery({
    queryKey: ['external-calendars'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/external-calendars');
      return res.data as { success?: boolean; calendars?: CalendarRow[] };
    },
  });

  const { data: propData } = useQuery({
    queryKey: ['tenant-properties-integrations'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/properties');
      return res.data as { properties?: PropertyRow[] };
    },
  });

  const calendars = calData?.calendars || [];
  const properties = useMemo(
    () => (propData?.properties || []).filter((p) => p.id != null && Number(p.id) > 0) as PropertyRow[],
    [propData]
  );

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!propertyId) throw new Error('property');
      const res = await api.post('/api/tenant/external-calendars', {
        property_id: propertyId,
        calendar_name: name.trim(),
        calendar_url: url.trim(),
        calendar_type: 'ical',
        sync_frequency: 15,
        is_active: true,
      });
      return res.data;
    },
    onSuccess: async () => {
      setName('');
      setUrl('');
      await queryClient.invalidateQueries({ queryKey: ['external-calendars'] });
      Alert.alert(t('common.success'), t('settings.integrations.addCalendarSuccess'));
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.error || e?.message || t('settings.integrations.errorUnknown'));
    },
  });

  const delMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/tenant/external-calendars?id=${encodeURIComponent(id)}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['external-calendars'] });
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('settings.integrations.title')}</Text>
          <Text style={styles.subtitle}>{t('mobile.settings.hubIntegrationsSubtitle')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('settings.integrations.externalCalendarsTitle')}</Text>
        <Text style={styles.muted}>{t('settings.integrations.externalCalendarsDesc')}</Text>
        <Text style={styles.label}>{t('settings.tabs.properties')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {properties.map((p) => (
              <Pressable
                key={p.id}
                style={[styles.chip, propertyId === p.id && styles.chipOn]}
                onPress={() => setPropertyId(p.id)}
              >
                <Text style={propertyId === p.id ? styles.chipOnText : styles.chipText}>{p.property_name}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <Text style={styles.label}>{t('mobile.settings.calendarName')}</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Airbnb" />
        <Text style={styles.label}>{t('mobile.settings.calendarUrl')}</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="https://..."
          autoCapitalize="none"
        />
        <Pressable
          style={[styles.primaryBtn, (!propertyId || !name.trim() || !url.trim()) && styles.disabled]}
          onPress={() => addMutation.mutate()}
          disabled={!propertyId || !name.trim() || !url.trim() || addMutation.isPending}
        >
          <Text style={styles.primaryBtnText}>{t('mobile.settings.addCalendar')}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('settings.integrations.externalCalendarsTitle')}</Text>
        {calendars.length === 0 ? (
          <Text style={styles.muted}>{t('mobile.settings.noCalendars')}</Text>
        ) : (
          <FlatList
            data={calendars}
            scrollEnabled={false}
            keyExtractor={(c) => String(c.id)}
            renderItem={({ item }) => (
              <View style={styles.rowItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{item.calendar_name}</Text>
                  <Text style={styles.rowSub}>{item.property_name || ''}</Text>
                  <Text numberOfLines={1} style={styles.rowUrl}>
                    {item.calendar_url}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    Alert.alert(t('common.confirm'), t('settings.integrations.deleteConfirm'), [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('common.delete'),
                        style: 'destructive',
                        onPress: () => delMutation.mutate(String(item.id)),
                      },
                    ])
                  }
                >
                  <Text style={styles.del}>{t('mobile.settings.deleteCalendar')}</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>
    </ScrollView>
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
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
  muted: { fontSize: 12, color: '#6b7280', marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  chipOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontWeight: '600', color: '#374151' },
  chipOnText: { fontWeight: '800', color: 'white' },
  primaryBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#059669', alignItems: 'center' },
  primaryBtnText: { color: 'white', fontWeight: '900' },
  disabled: { opacity: 0.5 },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 10,
  },
  rowTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  rowSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  rowUrl: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  del: { color: '#dc2626', fontWeight: '800', fontSize: 13 },
});
