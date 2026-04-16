import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { openUpgradePlanInBrowser } from '@/lib/upgrade-plan';

type RepSettings = {
  enabled: boolean;
  reviewUrl: string;
  guestEmailLocale: 'es' | 'en';
  guestMessageEs: string;
  guestMessageEn: string;
};

const defaultSettings: RepSettings = {
  enabled: false,
  reviewUrl: '',
  guestEmailLocale: 'es',
  guestMessageEs: '',
  guestMessageEn: '',
};

export default function ReputationSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<RepSettings>(defaultSettings);

  const { data, isLoading } = useQuery({
    queryKey: ['reputation-google'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/reputation-google');
      return res.data as { success?: boolean; settings?: RepSettings; isPro?: boolean };
    },
  });

  useEffect(() => {
    if (data?.settings) {
      setDraft({
        enabled: Boolean(data.settings.enabled),
        reviewUrl: data.settings.reviewUrl || '',
        guestEmailLocale: data.settings.guestEmailLocale === 'en' ? 'en' : 'es',
        guestMessageEs: data.settings.guestMessageEs || '',
        guestMessageEn: data.settings.guestMessageEn || '',
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put('/api/tenant/reputation-google', draft);
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['reputation-google'] });
      Alert.alert(t('common.success'), t('reputationGoogle.saved'));
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.error || e?.message || t('mobile.settings.saveFailed'));
    },
  });

  const isPro = Boolean(data?.isPro);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('reputationGoogle.title')}</Text>
          <Text style={styles.subtitle}>{t('mobile.settings.hubReputationSubtitle')}</Text>
        </View>
      </View>

      {!isPro ? (
        <View style={styles.card}>
          <Text style={styles.warn}>{t('mobile.settings.repNotPro')}</Text>
          <Pressable style={styles.upgradeCta} onPress={() => void openUpgradePlanInBrowser()}>
            <Text style={styles.upgradeCtaText}>{t('mobile.settings.upgradePlanButton')}</Text>
          </Pressable>
          <Text style={styles.upgradeHint}>{t('mobile.settings.upgradePlanHint')}</Text>
        </View>
      ) : null}

      <View style={[styles.card, !isPro && styles.dim]}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>{t('reputationGoogle.labelEnabled')}</Text>
          <Switch
            value={draft.enabled}
            onValueChange={(v) => setDraft((d) => ({ ...d, enabled: v }))}
            disabled={!isPro || isLoading}
          />
        </View>
        <Text style={styles.label}>{t('reputationGoogle.labelUrl')}</Text>
        <TextInput
          style={styles.input}
          value={draft.reviewUrl}
          onChangeText={(v) => setDraft((d) => ({ ...d, reviewUrl: v }))}
          placeholder="https://g.page/..."
          autoCapitalize="none"
          editable={isPro}
        />
        <Text style={styles.label}>{t('reputationGoogle.labelLocale')}</Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            {(['es', 'en'] as const).map((loc) => (
              <Pressable
                key={loc}
                style={[styles.chip, draft.guestEmailLocale === loc && styles.chipOn]}
                onPress={() => isPro && setDraft((d) => ({ ...d, guestEmailLocale: loc }))}
              >
                <Text style={draft.guestEmailLocale === loc ? styles.chipOnText : styles.chipText}>
                  {loc === 'es' ? t('reputationGoogle.localeEs') : t('reputationGoogle.localeEn')}
                </Text>
              </Pressable>
            ))}
        </View>
        <Text style={styles.label}>{t('reputationGoogle.labelMessageEs')}</Text>
        <TextInput
          style={styles.textarea}
          multiline
          value={draft.guestMessageEs}
          onChangeText={(v) => setDraft((d) => ({ ...d, guestMessageEs: v }))}
          editable={isPro}
        />
        <Text style={styles.label}>{t('reputationGoogle.labelMessageEn')}</Text>
        <TextInput
          style={styles.textarea}
          multiline
          value={draft.guestMessageEn}
          onChangeText={(v) => setDraft((d) => ({ ...d, guestMessageEn: v }))}
          editable={isPro}
        />
        <Pressable
          style={[styles.primaryBtn, (!isPro || saveMutation.isPending) && styles.disabled]}
          disabled={!isPro || saveMutation.isPending}
          onPress={() => saveMutation.mutate()}
        >
          <Text style={styles.primaryBtnText}>{t('reputationGoogle.save')}</Text>
        </Pressable>
      </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
  dim: { opacity: 0.55 },
  warn: { fontSize: 14, color: '#b45309', fontWeight: '700' },
  upgradeCta: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradeCtaText: { color: 'white', fontWeight: '800', fontSize: 15 },
  upgradeHint: {
    marginTop: 10,
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    backgroundColor: '#f9fafb',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  chipOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontWeight: '700', color: '#374151' },
  chipOnText: { fontWeight: '800', color: 'white' },
  primaryBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#059669', alignItems: 'center' },
  primaryBtnText: { color: 'white', fontWeight: '900' },
  disabled: { opacity: 0.5 },
});
