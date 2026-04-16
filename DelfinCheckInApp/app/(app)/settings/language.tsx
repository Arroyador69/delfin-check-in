import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { clearAppLocale, setAppLocale, t } from '@/lib/i18n';
import type { SupportedLocale } from '@/lib/i18n';

const OPTIONS: { code: SupportedLocale | 'device'; labelKey: string }[] = [
  { code: 'device', labelKey: 'mobile.settings.languageFollowDevice' },
  { code: 'es', labelKey: 'mobile.settings.languageEs' },
  { code: 'en', labelKey: 'mobile.settings.languageEn' },
  { code: 'fr', labelKey: 'mobile.settings.languageFr' },
  { code: 'it', labelKey: 'mobile.settings.languageIt' },
  { code: 'pt', labelKey: 'mobile.settings.languagePt' },
];

export default function LanguageSettingsScreen() {
  const router = useRouter();

  async function pick(code: SupportedLocale | 'device') {
    try {
      if (code === 'device') {
        await clearAppLocale();
      } else {
        await setAppLocale(code);
      }
      Alert.alert(t('common.success'), t('common.save'));
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('mobile.settings.saveFailed'));
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('settings.tabs.language')}</Text>
          <Text style={styles.subtitle}>{t('mobile.settings.languageSubtitle')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        {OPTIONS.map((opt) => (
          <Pressable
            key={opt.code}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => pick(opt.code)}
          >
            <Text style={styles.rowText}>{t(opt.labelKey)}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
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
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  rowPressed: { backgroundColor: '#f9fafb' },
  rowText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  chevron: { fontSize: 20, color: '#9ca3af' },
});
