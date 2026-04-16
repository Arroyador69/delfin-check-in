import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

type CountryPayload = {
  country_code: string | null;
  plan_type: string;
  legal_module: boolean;
};

export default function CountrySettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenant-country-code'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/country-code');
      return res.data as CountryPayload & { success?: boolean; error?: string };
    },
  });

  useEffect(() => {
    if (data?.country_code != null) {
      setDraft(String(data.country_code).toUpperCase());
    } else {
      setDraft('');
    }
  }, [data?.country_code]);

  const editable = Boolean(data?.legal_module);

  const saveMutation = useMutation({
    mutationFn: async (country_code: string | null) => {
      const res = await api.put('/api/tenant/country-code', { country_code });
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tenant-country-code'] });
      Alert.alert(t('common.success'), t('mobile.settings.countrySaved'));
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.error || t('mobile.settings.saveFailed'));
    },
  });

  const handleSave = () => {
    const trimmed = draft.trim().toUpperCase();
    if (trimmed.length === 0) {
      if (data?.plan_type === 'pro') {
        saveMutation.mutate(null);
        return;
      }
      Alert.alert(t('common.error'), t('mobile.settings.countryInvalid'));
      return;
    }
    if (trimmed.length !== 2 || !/^[A-Z]{2}$/.test(trimmed)) {
      Alert.alert(t('common.error'), t('mobile.settings.countryInvalid'));
      return;
    }
    saveMutation.mutate(trimmed);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('settings.tabs.countryCode')}</Text>
          <Text style={styles.subtitle}>{t('mobile.settings.hubCountrySubtitle')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        {isLoading && !data ? <ActivityIndicator color="#2563eb" /> : null}

        {!editable ? (
          <Text style={styles.muted}>{t('mobile.settings.countryNotEditable')}</Text>
        ) : (
          <>
            <Text style={styles.label}>{t('mobile.settings.countryCurrent')}</Text>
            <Text style={styles.hint}>{t('mobile.settings.countryHint')}</Text>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={(v) => setDraft(v.toUpperCase())}
              placeholder="ES"
              placeholderTextColor="#9ca3af"
              maxLength={2}
              autoCapitalize="characters"
              editable={!saveMutation.isPending}
            />
          </>
        )}
      </View>

      {editable ? (
        <Pressable
          style={[styles.saveButton, saveMutation.isPending && styles.saveDisabled]}
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          <Text style={styles.saveText}>{saveMutation.isPending ? t('common.loading') : t('common.save')}</Text>
        </Pressable>
      ) : null}
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
  },
  muted: { color: '#6b7280', fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 6 },
  hint: { fontSize: 12, color: '#6b7280', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#111827',
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: 'white', fontWeight: '900', fontSize: 15 },
});
