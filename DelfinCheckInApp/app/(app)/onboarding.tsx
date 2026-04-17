import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Localization from 'expo-localization';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  t,
  getLocale,
  getLocaleTag,
  setAppLocale,
  useLocaleListener,
  type SupportedLocale,
} from '@/lib/i18n';
import { getForceOnboarding, setForceOnboarding, setOnboardingSeen } from '@/lib/onboarding';
import { setAppCountryCode } from '@/lib/country-preference';
import { api } from '@/lib/api';
import { ISO3166_ALPHA2 } from '@/lib/iso3166-alpha2';
import { Bell, CalendarDays, Globe2, Languages, ShieldCheck, Sparkles, Star } from 'lucide-react-native';

type Step = {
  titleKey: string;
  bodyKey: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
};

function regionDisplayName(code: string, localeTag: string): string {
  try {
    const dn = new Intl.DisplayNames([localeTag], { type: 'region' });
    return dn.of(code) || code;
  } catch {
    return code;
  }
}

const LANGS: SupportedLocale[] = ['es', 'en', 'fr', 'it', 'pt'];

const LANG_LABEL: Record<SupportedLocale, string> = {
  es: 'mobile.settings.languageEs',
  en: 'mobile.settings.languageEn',
  fr: 'mobile.settings.languageFr',
  it: 'mobile.settings.languageIt',
  pt: 'mobile.settings.languagePt',
};

export default function OnboardingScreen() {
  useLocaleListener();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<'setup' | 'slides'>('setup');
  const [countrySearch, setCountrySearch] = useState('');
  const [countryCode, setCountryCode] = useState<string | null>(null);

  const steps: Step[] = useMemo(
    () => [
      { titleKey: 'mobile.onboarding.step1.title', bodyKey: 'mobile.onboarding.step1.body', Icon: Sparkles },
      { titleKey: 'mobile.onboarding.step2.title', bodyKey: 'mobile.onboarding.step2.body', Icon: CalendarDays },
      { titleKey: 'mobile.onboarding.step3.title', bodyKey: 'mobile.onboarding.step3.body', Icon: Bell },
      { titleKey: 'mobile.onboarding.step4.title', bodyKey: 'mobile.onboarding.step4.body', Icon: ShieldCheck },
      { titleKey: 'mobile.onboarding.step5.title', bodyKey: 'mobile.onboarding.step5.body', Icon: Star },
    ],
    []
  );

  const [idx, setIdx] = useState(0);
  const isLast = idx === steps.length - 1;
  const isFirst = idx === 0;

  const step = steps[idx];
  const anim = useRef(new Animated.Value(0)).current;

  const localeTag = getLocaleTag();

  useEffect(() => {
    const region = Localization.getLocales?.()?.[0]?.regionCode;
    if (region && ISO3166_ALPHA2.includes(region as (typeof ISO3166_ALPHA2)[number])) {
      setCountryCode(region);
    }
  }, []);

  const sortedCountries = useMemo(() => {
    const list = [...ISO3166_ALPHA2];
    list.sort((a, b) =>
      regionDisplayName(a, localeTag).localeCompare(regionDisplayName(b, localeTag), localeTag, {
        sensitivity: 'base',
      })
    );
    return list;
  }, [localeTag]);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return sortedCountries;
    return sortedCountries.filter((code) => {
      const name = regionDisplayName(code, localeTag).toLowerCase();
      return code.toLowerCase().includes(q) || name.includes(q);
    });
  }, [sortedCountries, countrySearch, localeTag]);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [idx, anim]);

  async function finish() {
    await setOnboardingSeen(true);
    router.replace('/(app)');
  }

  async function toggleForce() {
    const cur = await getForceOnboarding();
    await setForceOnboarding(!cur);
  }

  async function continueFromSetup() {
    if (!countryCode) return;
    try {
      await setAppLocale(getLocale());
      await setAppCountryCode(countryCode);
      await syncCountryToTenant(countryCode);
      queryClient.invalidateQueries({ queryKey: ['app-region-prefs'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-country-code'] });
    } catch {
      /* still continue */
    }
    setPhase('slides');
    setIdx(0);
  }

  async function syncCountryToTenant(code: string) {
    try {
      const res = await api.get('/api/tenant/country-code');
      const d = res.data as { legal_module?: boolean };
      if (!d?.legal_module) return;
      await api.put('/api/tenant/country-code', { country_code: code });
    } catch {
      /* sin permiso o red */
    }
  }

  async function pickLanguage(code: SupportedLocale) {
    await setAppLocale(code);
    queryClient.invalidateQueries({ queryKey: ['app-region-prefs'] });
  }

  const setupValid = Boolean(countryCode);

  if (phase === 'setup') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.bg}>
          <View style={styles.blobA} />
          <View style={styles.blobB} />
          <View style={styles.blobC} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.container}>
            <View style={styles.topRow}>
              <View style={styles.progressLeft}>
                <Text style={styles.progressText}>{t('mobile.onboarding.setupBadge')}</Text>
              </View>
              <View style={styles.actionsRight}>
                {__DEV__ ? (
                  <Pressable onPress={toggleForce} hitSlop={10}>
                    <Text style={styles.dev}>{t('mobile.onboarding.devToggle')}</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={finish} hitSlop={10}>
                  <Text style={styles.skip}>{t('mobile.onboarding.skip')}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.hero}>
              <Text style={styles.brand}>Delfín Check-in</Text>
              <Text style={styles.tagline}>{t('mobile.onboarding.setupTitle')}</Text>
              <Text style={[styles.tagline, { marginTop: 8, fontSize: 13, fontWeight: '600' }]}>
                {t('mobile.onboarding.setupSubtitle')}
              </Text>
            </View>

            <View style={[styles.card, { flex: 1, minHeight: 0 }]}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBadge}>
                  <Globe2 size={20} color="#e0f2fe" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{t('mobile.onboarding.countryLabel')}</Text>
                </View>
              </View>
              <TextInput
                style={styles.searchInput}
                value={countrySearch}
                onChangeText={setCountrySearch}
                placeholder={t('mobile.onboarding.countrySearchPlaceholder')}
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <FlatList
                data={filteredCountries}
                keyExtractor={(c) => c}
                style={{ flex: 1, marginTop: 10 }}
                initialNumToRender={20}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: code }) => {
                  const selected = countryCode === code;
                  return (
                    <Pressable
                      onPress={() => setCountryCode(code)}
                      style={[styles.countryRow, selected && styles.countryRowSelected]}
                    >
                      <Text style={[styles.countryName, selected && styles.countryNameSelected]}>
                        {regionDisplayName(code, localeTag)}
                      </Text>
                      <Text style={styles.countryCode}>{code}</Text>
                    </Pressable>
                  );
                }}
              />
            </View>

            <View style={[styles.card, { marginTop: 10 }]}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBadge}>
                  <Languages size={20} color="#e0f2fe" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{t('mobile.onboarding.languageLabel')}</Text>
                </View>
              </View>
              <View style={styles.langRow}>
                {LANGS.map((code) => {
                  const active = getLocale() === code;
                  return (
                    <Pressable
                      key={code}
                      onPress={() => void pickLanguage(code)}
                      style={[styles.langChip, active && styles.langChipActive]}
                    >
                      <Text style={[styles.langChipText, active && styles.langChipTextActive]}>
                        {t(LANG_LABEL[code])}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              style={[styles.btnFullWidth, styles.btnPrimary, !setupValid && styles.btnDisabledSetup]}
              disabled={!setupValid}
              onPress={() => void continueFromSetup()}
            >
              <Text style={[styles.btnText, styles.btnPrimaryText]}>{t('mobile.onboarding.continueToTour')}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bg}>
        <View style={styles.blobA} />
        <View style={styles.blobB} />
        <View style={styles.blobC} />
      </View>

      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.progressLeft}>
            <Text style={styles.progressText}>
              {t('mobile.onboarding.progress', { current: idx + 1, total: steps.length })}
            </Text>
            <View style={styles.dotsRow}>
              {steps.map((_, i) => (
                <View key={i} style={[styles.dot, i === idx ? styles.dotActive : styles.dotIdle]} />
              ))}
            </View>
          </View>

          <View style={styles.actionsRight}>
            {__DEV__ ? (
              <Pressable onPress={toggleForce} hitSlop={10}>
                <Text style={styles.dev}>{t('mobile.onboarding.devToggle')}</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={finish} hitSlop={10}>
              <Text style={styles.skip}>{t('mobile.onboarding.skip')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.brand}>Delfín Check-in</Text>
          <Text style={styles.tagline}>{t('mobile.onboarding.subtitle')}</Text>
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: anim,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <step.Icon size={20} color="#e0f2fe" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{t(step.titleKey)}</Text>
            </View>
          </View>
          <Text style={styles.body}>{t(step.bodyKey)}</Text>

          <View style={styles.valueRow}>
            <View style={styles.valuePill}>
              <Text style={styles.valuePillText}>{t('mobile.onboarding.value.fast')}</Text>
            </View>
            <View style={styles.valuePill}>
              <Text style={styles.valuePillText}>{t('mobile.onboarding.value.secure')}</Text>
            </View>
            <View style={styles.valuePill}>
              <Text style={styles.valuePillText}>{t('mobile.onboarding.value.simple')}</Text>
            </View>
          </View>
        </Animated.View>

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
  safe: { flex: 1, backgroundColor: '#050b1a' },
  bg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#050b1a',
  },
  blobA: {
    position: 'absolute',
    width: 460,
    height: 460,
    borderRadius: 460,
    backgroundColor: '#2563eb',
    top: -240,
    left: -220,
    opacity: 0.28,
  },
  blobB: {
    position: 'absolute',
    width: 520,
    height: 520,
    borderRadius: 520,
    backgroundColor: '#44c0ff',
    bottom: -300,
    right: -260,
    opacity: 0.16,
  },
  blobC: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 380,
    backgroundColor: '#7c3aed',
    top: 120,
    right: -220,
    opacity: 0.14,
  },
  container: { flex: 1, padding: 16, justifyContent: 'space-between' },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  progressLeft: { flex: 1, paddingRight: 12 },
  progressText: { color: '#cbd5e1', fontWeight: '900' },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 8, alignItems: 'center' },
  dot: { height: 6, borderRadius: 99 },
  dotIdle: { width: 10, backgroundColor: 'rgba(203, 213, 225, 0.25)' },
  dotActive: { width: 22, backgroundColor: '#60a5fa' },
  actionsRight: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  dev: { color: '#a7f3d0', fontWeight: '900' },
  skip: { color: '#93c5fd', fontWeight: '900' },
  hero: {
    paddingTop: 10,
    paddingBottom: 8,
  },
  brand: {
    color: 'white',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  tagline: {
    marginTop: 6,
    color: 'rgba(226, 232, 240, 0.88)',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.28)',
  },
  title: { fontSize: 22, fontWeight: '900', color: 'white' },
  body: { color: '#cbd5e1', fontSize: 15, lineHeight: 22, fontWeight: '600' },
  valueRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  valuePill: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
  },
  valuePillText: { color: 'rgba(226, 232, 240, 0.92)', fontWeight: '900', fontSize: 12 },
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
  btnGhost: { backgroundColor: 'rgba(17, 24, 39, 0.7)', borderWidth: 1, borderColor: 'rgba(148, 163, 184, 0.18)' },
  btnGhostText: { color: '#e5e7eb' },
  btnText: { fontSize: 15, fontWeight: '900' },
  btnDisabled: { opacity: 0.35 },
  btnDisabledSetup: { opacity: 0.45 },
  btnFullWidth: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  searchInput: {
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
  },
  countryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.12)',
  },
  countryRowSelected: {
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 0,
    marginBottom: 1,
  },
  countryName: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', flex: 1, paddingRight: 8 },
  countryNameSelected: { color: 'white', fontWeight: '800' },
  countryCode: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  langChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(2, 6, 23, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  langChipActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.35)',
    borderColor: 'rgba(96, 165, 250, 0.55)',
  },
  langChipText: { color: '#cbd5e1', fontWeight: '800', fontSize: 12 },
  langChipTextActive: { color: 'white' },
});
