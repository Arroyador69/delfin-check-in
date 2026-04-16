import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { api } from '@/lib/api';

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

  const count = typeof data?.count === 'number' ? data.count : 0;
  const label = count > 9 ? '9+' : String(count);

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/(app)/reservations',
          params: { filter: 'pending' },
        })
      }
      style={styles.button}
      hitSlop={8}
    >
      <Bell size={22} color={count > 0 ? '#b45309' : color} />
      {count > 0 ? (
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
