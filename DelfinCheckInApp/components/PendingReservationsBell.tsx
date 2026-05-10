import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

interface PendingReservationsBellProps {
  color?: string;
}

type TenantNotificationItem = {
  id: string;
  type?: string | null;
  link?: string | null;
  is_read?: boolean;
  created_at?: string;
};

export default function PendingReservationsBell({
  color = '#1f2937',
}: PendingReservationsBellProps) {
  const router = useRouter();

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
  const total = pendingReservations + pendingMir + unreadNotifs;
  const label = total > 9 ? '9+' : String(total);

  const goPendingReservations = () =>
    router.push({
      pathname: '/(app)/reservations',
      params: { filter: 'pending' },
    });

  const goPendingMir = () => router.push('/(app)/settings/mir' as any);

  const goByNotification = () => {
    const firstUnread =
      notifItems.find((n) => n && (n.is_read === false || n.is_read == null)) || notifItems[0];
    const type = String(firstUnread?.type || '');

    // Mapear a pantallas internas (sin "bandeja de notificaciones")
    if (type === 'support_reply') {
      router.push('/(app)/settings/support' as any);
      return;
    }
    if (type === 'guest_registration') {
      router.push('/(app)/reservations' as any);
      return;
    }
    if (type === 'reservation_created' || type === 'reservation_updated') {
      router.push('/(app)/reservations' as any);
      return;
    }
    // Fallback: llevar al punto más útil (reservas)
    router.push('/(app)/reservations' as any);
  };

  return (
    <Pressable
      onPress={() => {
        // Si hay varias cosas pendientes, dejamos elegir entre las 2 principales
        // (reservas pendientes y configuración MIR). Las notificaciones genéricas se resuelven
        // llevando al destino directamente (sin pantalla "notificaciones").
        if (pendingReservations > 0 && pendingMir > 0) {
          Alert.alert(t('mobile.notifications.title'), t('mobile.notifications.choose'), [
            { text: t('mobile.notifications.pendingReservations'), onPress: goPendingReservations },
            { text: t('mobile.notifications.pendingMirConfig'), onPress: goPendingMir },
            { text: t('common.cancel'), style: 'cancel' },
          ]);
          return;
        }

        if (pendingReservations > 0) {
          goPendingReservations();
          return;
        }
        if (pendingMir > 0) {
          goPendingMir();
          return;
        }
        if (unreadNotifs > 0) {
          goByNotification();
          return;
        }

        goPendingReservations();
      }}
      style={styles.button}
      hitSlop={8}
    >
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
