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

  const pendingReservations = typeof data?.count === 'number' ? data.count : 0;
  const pendingMir = typeof mirPending?.missing === 'number' ? mirPending.missing : 0;
  const total = pendingReservations + pendingMir;
  const label = total > 9 ? '9+' : String(total);

  return (
    <Pressable
      onPress={() => {
        if (pendingReservations > 0 && pendingMir > 0) {
          Alert.alert(t('mobile.notifications.title'), t('mobile.notifications.choose'), [
            {
              text: t('mobile.notifications.pendingReservations'),
              onPress: () =>
                router.push({
                  pathname: '/(app)/reservations',
                  params: { filter: 'pending' },
                }),
            },
            {
              text: t('mobile.notifications.pendingMirConfig'),
              onPress: () => router.push('/(app)/settings/mir' as any),
            },
            { text: t('common.cancel'), style: 'cancel' },
          ]);
          return;
        }
        if (pendingMir > 0 && pendingReservations === 0) {
          router.push('/(app)/settings/mir' as any);
          return;
        }
        router.push({
          pathname: '/(app)/reservations',
          params: { filter: 'pending' },
        });
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
