import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

type NotificationItem = {
  id: string;
  type?: string;
  title: string;
  body?: string | null;
  link?: string | null;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-notifications'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/notifications');
      return res.data as { unreadCount?: number; items?: NotificationItem[] };
    },
  });

  const items: NotificationItem[] = Array.isArray(data?.items) ? data!.items! : [];
  const unreadIds = useMemo(() => items.filter((n) => !n.is_read).map((n) => n.id), [items]);

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    try {
      await api.post('/api/tenant/notifications', { ids });
      await queryClient.invalidateQueries({ queryKey: ['tenant-notifications'] });
      await queryClient.invalidateQueries({ queryKey: ['tenant-notifications-unread'] });
    } catch {
      // silencioso
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['tenant-notifications'] });
    await queryClient.invalidateQueries({ queryKey: ['tenant-notifications-unread'] });
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('mobile.notifications.title')}</Text>
          <Text style={styles.subtitle}>{t('mobile.notifications.subtitle')}</Text>
        </View>
        {unreadIds.length > 0 ? (
          <Pressable onPress={() => void markRead(unreadIds)} style={styles.markAll}>
            <Text style={styles.markAllText}>{t('mobile.notifications.markAllRead')}</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {isLoading ? <Text style={styles.loading}>{t('common.loading')}</Text> : null}
        {!isLoading && items.length === 0 ? (
          <Text style={styles.empty}>{t('mobile.notifications.empty')}</Text>
        ) : null}

        {items.map((n) => (
          <Pressable
            key={n.id}
            onPress={() => {
              void markRead([n.id]);
              // Navegación mínima: soporte / actualizaciones viven en web.
              // Para evitar deep-links frágiles, enviamos a pantallas internas cuando aplica.
              if (n.type === 'support_reply') {
                router.push('/(app)/settings/support' as any);
                return;
              }
              if (n.type === 'guest_registration') {
                router.push('/(app)/reservations' as any);
                return;
              }
              router.push('/(app)' as any);
            }}
            style={[styles.card, !n.is_read && styles.cardUnread]}
          >
            <Text style={styles.cardTitle}>{n.title}</Text>
            {n.body ? <Text style={styles.cardBody}>{n.body}</Text> : null}
            <Text style={styles.cardMeta}>{new Date(n.created_at).toLocaleString()}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 12 },
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
  markAll: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  markAllText: { fontSize: 12, fontWeight: '900', color: '#1d4ed8' },
  loading: { color: '#6b7280', fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  empty: { color: '#64748b', textAlign: 'center', paddingVertical: 14, fontWeight: '700' },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },
  cardUnread: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  cardTitle: { fontSize: 14, fontWeight: '900', color: '#111827' },
  cardBody: { marginTop: 4, fontSize: 12, color: '#475569' },
  cardMeta: { marginTop: 8, fontSize: 11, color: '#94a3b8', fontWeight: '700' },
});

