import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import {
  isUnreadTenantNotification,
  tenantNotificationMobileLabelKey,
  tenantNotificationMobileRoute,
  type TenantNotificationLike,
} from '@/lib/onboarding-reminders';

interface PendingReservationsBellProps {
  color?: string;
}

type TenantNotificationItem = TenantNotificationLike;

export default function PendingReservationsBell({
  color = '#1f2937',
}: PendingReservationsBellProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['pending-reservations-review'],
    queryFn: async () => {
      const response = await api.get('/api/tenant/pending-reservations-review');
      return response.data as { count?: number };
    },
    refetchInterval: 30000,
  });

  const { data: mirPending } = useQuery({
    queryKey: ['pending-mir-config'],
    queryFn: async () => {
      const response = await api.get('/api/ministerio/pending-config-count');
      return response.data as { missing?: number };
    },
    refetchInterval: 30000,
  });

  const { data: tenantNotifs } = useQuery({
    queryKey: ['tenant-notifications-unread'],
    queryFn: async () => {
      const response = await api.get('/api/tenant/notifications');
      return response.data as { unreadCount?: number; items?: TenantNotificationItem[] };
    },
    refetchInterval: 30000,
  });

  const pendingReservations = typeof data?.count === 'number' ? data.count : 0;
  const pendingMir = typeof mirPending?.missing === 'number' ? mirPending.missing : 0;
  const unreadNotifs = typeof tenantNotifs?.unreadCount === 'number' ? tenantNotifs.unreadCount : 0;
  const notifItems = Array.isArray(tenantNotifs?.items) ? tenantNotifs!.items! : [];
  const unreadNotificationItems = notifItems.filter(isUnreadTenantNotification);
  const total = pendingReservations + pendingMir + unreadNotifs;
  const label = total > 9 ? '9+' : String(total);

  const goPendingReservations = () =>
    router.push({
      pathname: '/(app)/reservations',
      params: { filter: 'pending' },
    });

  const goPendingMir = () => router.push('/(app)/settings/mir' as any);

  const markNotificationRead = async (id: string) => {
    try {
      await api.post('/api/tenant/notifications', { ids: [id] });
    } catch {
      // silencioso
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['tenant-notifications-unread'] });
    }
  };

  const notificationMenuLabel = (n: TenantNotificationItem) => {
    const key = tenantNotificationMobileLabelKey(n);
    if (key) return t(key);
    const title = String(n.title || '').trim();
    return title || t('mobile.notifications.generic');
  };

  const openNotification = (n: TenantNotificationItem) => {
    void markNotificationRead(n.id);
    router.push(tenantNotificationMobileRoute(n) as any);
  };

  const buildMenuActions = () => {
    const actions: { text: string; onPress: () => void }[] = [];

    if (pendingReservations > 0) {
      actions.push({
        text: t('mobile.notifications.pendingReservations'),
        onPress: goPendingReservations,
      });
    }
    if (pendingMir > 0) {
      actions.push({
        text: t('mobile.notifications.pendingMirConfig'),
        onPress: goPendingMir,
      });
    }

    for (const n of unreadNotificationItems) {
      actions.push({
        text: notificationMenuLabel(n),
        onPress: () => openNotification(n),
      });
    }

    return actions;
  };

  const onBellPress = () => {
    const actions = buildMenuActions();
    if (actions.length === 0) {
      goPendingReservations();
      return;
    }
    if (actions.length === 1) {
      actions[0].onPress();
      return;
    }

    Alert.alert(
      t('mobile.notifications.title'),
      t('mobile.notifications.choose'),
      [
        ...actions.map((action) => ({
          text: action.text,
          onPress: action.onPress,
        })),
        { text: t('common.cancel'), style: 'cancel' },
      ]
    );
  };

  return (
    <Pressable onPress={onBellPress} style={styles.button} hitSlop={8}>
      <Bell size={22} color={total > 0 ? '#b45309' : color} />
      {total > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{label}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: 16,
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
});
