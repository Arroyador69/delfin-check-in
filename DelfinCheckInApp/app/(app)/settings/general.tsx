import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import BookingChannelsSettingsBlock from '@/components/BookingChannelsSettingsBlock';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

type RoomRow = { id: number; name: string };

export default function GeneralSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [maxRooms, setMaxRooms] = useState(99);
  const [tenantName, setTenantName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-limits'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/limits');
      return res.data as {
        success?: boolean;
        tenant?: { name?: string; limits?: { maxRooms?: number; maxReservations?: number; maxGuests?: number } };
        currentRooms?: RoomRow[];
      };
    },
  });

  useEffect(() => {
    if (data?.success && data.tenant) {
      setTenantName(data.tenant.name || '');
      const cap = data.tenant.limits?.maxRooms ?? 99;
      setMaxRooms(cap === -1 ? 999 : cap);
    }
    if (data?.currentRooms) {
      setRooms(data.currentRooms.map((r) => ({ id: r.id, name: r.name || '' })));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/tenant/rooms', {
        rooms: rooms.map((r) => ({ id: r.id, name: r.name.trim() })).filter((r) => r.name),
      });
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenant-limits'] });
      Alert.alert(t('common.success'), t('settings.rooms.saved'));
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.message || t('settings.rooms.saveError'));
    },
  });

  const addRoom = () => {
    if (maxRooms !== 999 && rooms.length >= maxRooms) {
      Alert.alert(t('common.error'), t('settings.rooms.limitReachedDescription', { max: maxRooms }));
      return;
    }
    const nextId = rooms.length ? Math.max(...rooms.map((r) => r.id)) + 1 : 1;
    setRooms([...rooms, { id: nextId, name: t('settings.rooms.roomNumber', { number: rooms.length + 1 }) }]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('settings.general.title')}</Text>
          <Text style={styles.subtitle}>{tenantName}</Text>
        </View>
      </View>

      <Text style={styles.hint}>{t('mobile.settings.webAdvancedHint')}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('settings.rooms.title')}</Text>
        <Text style={styles.muted}>{t('settings.rooms.description')}</Text>
        {isLoading && !data ? <ActivityIndicator style={{ marginVertical: 16 }} /> : null}
        {rooms.map((room, index) => (
          <View key={`${room.id ?? 'room'}-${index}`} style={styles.roomRow}>
            <Text style={styles.roomIdx}>{index + 1}</Text>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={room.name}
              onChangeText={(text) =>
                setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, name: text } : r)))
              }
              placeholder={t('settings.rooms.roomNumber', { number: index + 1 })}
            />
            {rooms.length > 1 ? (
              <Pressable onPress={() => setRooms((prev) => prev.filter((r) => r.id !== room.id))}>
                <Text style={styles.remove}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable style={styles.secondaryBtn} onPress={addRoom}>
          <Text style={styles.secondaryBtnText}>{t('settings.rooms.addRoom')}</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryBtn, saveMutation.isPending && styles.disabled]}
          onPress={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
        >
          <Text style={styles.primaryBtnText}>
            {saveMutation.isPending ? t('settings.rooms.saving') : t('settings.rooms.saveConfiguration')}
          </Text>
        </Pressable>
      </View>

      <BookingChannelsSettingsBlock />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { flexDirection: 'row', gap: 10, marginBottom: 8 },
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
  subtitle: { marginTop: 2, fontSize: 13, color: '#6b7280' },
  hint: { fontSize: 12, color: '#64748b', marginBottom: 12 },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 6 },
  muted: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  roomIdx: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    textAlign: 'center',
    lineHeight: 28,
    fontWeight: '800',
    color: '#1d4ed8',
    overflow: 'hidden',
  },
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
  remove: { fontSize: 18, color: '#ef4444', paddingHorizontal: 6 },
  secondaryBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    alignItems: 'center',
  },
  secondaryBtnText: { fontWeight: '800', color: '#059669' },
  primaryBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  primaryBtnText: { color: 'white', fontWeight: '900', fontSize: 15 },
  disabled: { opacity: 0.6 },
});
