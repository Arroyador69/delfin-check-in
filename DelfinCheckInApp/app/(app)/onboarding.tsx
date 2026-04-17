import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { t } from '@/lib/i18n';
import { setOnboardingSeen } from '@/lib/onboarding';

type Step = {
  titleKey: string;
  bodyKey: string;
};

export default function OnboardingScreen() {
  const router = useRouter();
  const steps: Step[] = useMemo(
    () => [
      { titleKey: 'mobile.onboarding.step1.title', bodyKey: 'mobile.onboarding.step1.body' },
      { titleKey: 'mobile.onboarding.step2.title', bodyKey: 'mobile.onboarding.step2.body' },
      { titleKey: 'mobile.onboarding.step3.title', bodyKey: 'mobile.onboarding.step3.body' },
      { titleKey: 'mobile.onboarding.step4.title', bodyKey: 'mobile.onboarding.step4.body' },
      { titleKey: 'mobile.onboarding.step5.title', bodyKey: 'mobile.onboarding.step5.body' },
    ],
    []
  );

  const [idx, setIdx] = useState(0);
  const isLast = idx === steps.length - 1;
  const isFirst = idx === 0;

  const step = steps[idx];

  async function finish() {
    await setOnboardingSeen(true);
    router.replace('/(app)');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {t('mobile.onboarding.progress', { current: idx + 1, total: steps.length })}
          </Text>
          <Pressable onPress={finish} hitSlop={10}>
            <Text style={styles.skip}>{t('mobile.onboarding.skip')}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>{t(step.titleKey)}</Text>
          <Text style={styles.body}>{t(step.bodyKey)}</Text>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.btn, styles.btnGhost, isFirst && styles.btnDisabled]}
            disabled={isFirst}
            onPress={() => setIdx((x) => Math.max(0, x - 1))}
          >
            <Text style={[styles.btnText, styles.btnGhostText]}>{t('mobile.onboarding.back')}</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => {
              if (isLast) void finish();
              else setIdx((x) => Math.min(steps.length - 1, x + 1));
            }}
          >
            <Text style={[styles.btnText, styles.btnPrimaryText]}>
              {isLast ? t('mobile.onboarding.done') : t('mobile.onboarding.next')}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0b1220' },
  container: { flex: 1, padding: 16, justifyContent: 'space-between' },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  progressText: { color: '#cbd5e1', fontWeight: '700' },
  skip: { color: '#93c5fd', fontWeight: '800' },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  title: { fontSize: 22, fontWeight: '900', color: 'white', marginBottom: 10 },
  body: { color: '#cbd5e1', fontSize: 15, lineHeight: 22 },
  footer: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnPrimaryText: { color: 'white' },
  btnGhost: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937' },
  btnGhostText: { color: '#e5e7eb' },
  btnText: { fontSize: 15, fontWeight: '900' },
  btnDisabled: { opacity: 0.35 },
});

