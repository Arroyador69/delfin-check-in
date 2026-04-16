import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

type TenantProperty = {
  id: number | null;
  property_name: string;
  is_active?: boolean;
  is_placeholder?: boolean;
};

export default function PropertiesSettingsScreen() {
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenant-properties-settings'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/properties');
      return res.data as { success?: boolean; properties?: TenantProperty[] };
    },
  });

  const list = data?.properties ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('settings.tabs.properties')}</Text>
          <Text style={styles.subtitle}>{t('mobile.settings.hubPropertiesSubtitle')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        {isLoading ? (
          <ActivityIndicator color="#2563eb" />
        ) : isError ? (
          <Text style={styles.muted}>{t('common.error')}</Text>
        ) : list.length === 0 ? (
          <Text style={styles.muted}>{t('mobile.settings.propertiesEmpty')}</Text>
        ) : (
          list.map((p, idx) => (
            <View
              key={p.id != null ? `p-${p.id}` : `ph-${idx}`}
              style={[styles.row, idx > 0 && styles.rowBorder]}
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
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
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
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 80,
  },
  muted: { color: '#6b7280', fontSize: 14 },
  row: { paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  badge: { marginTop: 4, fontSize: 11, color: '#6b7280', fontWeight: '600' },
  badgeOk: { marginTop: 4, fontSize: 11, color: '#059669', fontWeight: '700' },
});
