import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Share, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gift, Share2, Copy, Users, TrendingUp } from 'lucide-react-native';

import { t } from '@/lib/i18n';
import { api } from '@/lib/api';

type ReferralStats = {
  totalReferrals: number;
  registeredCount: number;
  activeCheckinCount: number;
  activeStandardCount: number;
  activeProCount: number;
  cancelledCount: number;
  paidReferralsCount: number;
  referralCode: string | null;
  checkinCredits: number;
  proCredits: number;
};

type ReferralItem = {
  id: string;
  referredName: string;
  referredEmail: string;
  status: string;
  planType: string;
  registeredAt: string;
  firstPaidAt?: string;
};

type RewardItem = {
  id: string;
  rewardType: string;
  reason: string;
  monthsGranted: number;
  status: string;
  grantedAt: string;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function pct(current: number, goal: number) {
  if (goal <= 0) return '0%';
  return `${Math.round(clamp01(current / goal) * 100)}%`;
}

export default function ReferralsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const referralLink = useMemo(() => {
    const code = stats?.referralCode;
    return code ? `https://delfincheckin.com/?ref=${code}` : null;
  }, [stats?.referralCode]);

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        setError(null);
        const [s, l, r] = await Promise.all([
          api.get('/api/referrals/stats'),
          api.get('/api/referrals/list'),
          api.get('/api/referrals/rewards'),
        ]);
        if (s.data?.success) setStats(s.data.data);
        if (l.data?.success) setReferrals(l.data.data);
        if (r.data?.success) setRewards(r.data.data);
      } catch (e: any) {
        setError(String(e?.message || 'Error'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function doCopy() {
    if (!referralLink) return;
    await Clipboard.setStringAsync(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  async function doShare() {
    if (!referralLink) return;
    try {
      await Share.share({
        title: t('referrals.shareTitle'),
        message: `${t('referrals.shareText')}\n${referralLink}`,
      });
    } catch {
      // ignore
    }
  }

  async function doShareFacebook() {
    if (!referralLink) return;
    const quote = t('referrals.shareText');
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(quote)}`;
    try {
      await Linking.openURL(url);
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 16 }]}>
        <ActivityIndicator />
        <Text style={styles.centerText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (error || !stats) {
    return (
      <View style={[styles.center, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.errorTitle}>{t('common.error')}</Text>
        <Text style={styles.errorBody}>{error || t('common.retry')}</Text>
      </View>
    );
  }

  const paidCore = stats.activeCheckinCount + stats.activeStandardCount;
  const goals = [
    { title: t('referrals.goalRegisteredTitle'), desc: t('referrals.goalRegisteredDesc'), current: stats.registeredCount, goal: 5 },
    { title: t('referrals.goalPaidTitle'), desc: t('referrals.goalPaidDesc'), current: stats.paidReferralsCount, goal: 1 },
    { title: t('referrals.goalActiveCheckinTitle'), desc: t('referrals.goalActiveCheckinDesc'), current: paidCore, goal: 3 },
    { title: t('referrals.goalActiveProTitle'), desc: t('referrals.goalActiveProDesc'), current: stats.activeProCount, goal: 5 },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Users size={18} color="#e0f2fe" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('referrals.title')}</Text>
            <Text style={styles.subtitle}>{t('referrals.subtitle')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>{t('referrals.earlyTitle')}</Text>
        <Text style={styles.bannerBody}>{t('referrals.earlyBody')}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Share2 size={18} color="#60a5fa" />
          <Text style={styles.cardTitle}>{t('referrals.yourLink')}</Text>
        </View>
        <View style={styles.linkBox}>
          <Text style={styles.linkText}>{referralLink || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={doCopy}>
            <Copy size={16} color="white" />
            <Text style={styles.btnPrimaryText}>{copied ? t('referrals.btnCopied') : t('referrals.btnCopy')}</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnGhost]} onPress={doShare}>
            <Gift size={16} color="#0f172a" />
            <Text style={styles.btnGhostText}>{t('referrals.btnShare')}</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnFacebook]} onPress={doShareFacebook}>
            <Share2 size={16} color="white" />
            <Text style={styles.btnFacebookText}>{t('referrals.btnShareFacebook')}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>{t('referrals.totalReferrals')}</Text>
          <Text style={styles.kpiValue}>{stats.totalReferrals}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>{t('referrals.activeCheckin')}</Text>
          <Text style={styles.kpiValue}>{stats.activeCheckinCount}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>{t('referrals.activeStandard')}</Text>
          <Text style={[styles.kpiValue, { color: '#4f46e5' }]}>{stats.activeStandardCount}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>{t('referrals.activePro')}</Text>
          <Text style={[styles.kpiValue, { color: '#7c3aed' }]}>{stats.activeProCount}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <TrendingUp size={18} color="#60a5fa" />
          <Text style={styles.cardTitle}>{t('referrals.goalsTitle')}</Text>
        </View>
        <View style={{ gap: 10 }}>
          {goals.map((g) => (
            <View key={g.title} style={styles.goalItem}>
              <View style={styles.goalTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalTitle}>{g.title}</Text>
                  <Text style={styles.goalDesc}>{g.desc}</Text>
                </View>
                <Text style={styles.goalCount}>
                  {Math.min(g.current, g.goal)}/{g.goal}
                </Text>
              </View>
              <View style={styles.goalBar}>
                <View style={[styles.goalBarFill, { width: pct(g.current, g.goal) as any }]} />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Gift size={18} color="#7c3aed" />
          <Text style={styles.cardTitle}>{t('referrals.creditsAccumulated')}</Text>
        </View>
        <View style={styles.creditsRow}>
          <View style={styles.creditBox}>
            <Text style={styles.creditLabel}>{t('referrals.planCheckinLabel')}</Text>
            <Text style={styles.creditValue}>{stats.checkinCredits}</Text>
          </View>
          <View style={styles.creditBox}>
            <Text style={styles.creditLabel}>{t('referrals.planStandardLabel')}</Text>
            <Text style={[styles.creditValue, { color: '#4f46e5' }]}>{stats.checkinCredits}</Text>
          </View>
          <View style={styles.creditBox}>
            <Text style={styles.creditLabel}>{t('referrals.planProLabel')}</Text>
            <Text style={[styles.creditValue, { color: '#7c3aed' }]}>{stats.proCredits}</Text>
          </View>
        </View>
      </View>

      {rewards.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('referrals.rewardsHistory')}</Text>
          <View style={{ gap: 10, marginTop: 10 }}>
            {rewards.slice(0, 6).map((rw) => (
              <View key={rw.id} style={styles.rowBetween}>
                <Text style={styles.smallStrong}>{rw.monthsGranted}m</Text>
                <Text style={[styles.small, { flex: 1 }]} numberOfLines={2}>
                  {rw.reason}
                </Text>
                <Text style={styles.smallMuted}>{new Date(rw.grantedAt).toLocaleDateString()}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('referrals.myReferrals')}</Text>
        {referrals.length === 0 ? (
          <View style={{ gap: 6 }}>
            <Text style={styles.goalDesc}>{t('referrals.noReferrals')}</Text>
            <Text style={styles.goalDesc}>{t('referrals.noReferralsHint')}</Text>
          </View>
        ) : (
          <View style={{ gap: 10, marginTop: 10 }}>
            {referrals.slice(0, 12).map((rf) => (
              <View key={rf.id} style={styles.refItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.refName} numberOfLines={1}>
                    {rf.referredName || '-'}
                  </Text>
                  <Text style={styles.refEmail} numberOfLines={1}>
                    {rf.referredEmail}
                  </Text>
                </View>
                <View style={styles.refMeta}>
                  <Text style={styles.refPlan}>{rf.planType}</Text>
                  <Text style={styles.refStatus}>{rf.status}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  centerText: { color: '#64748b', fontWeight: '700' },
  errorTitle: { fontSize: 18, fontWeight: '900', color: '#991b1b' },
  errorBody: { color: '#475569', textAlign: 'center', fontWeight: '600' },
  header: { paddingHorizontal: 16, marginBottom: 10 },
  headerLeft: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  subtitle: { marginTop: 2, color: '#64748b', fontWeight: '700' },
  banner: {
    marginHorizontal: 16,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  bannerTitle: { color: '#0f172a', fontWeight: '900', fontSize: 14 },
  bannerBody: { color: '#1f2937', fontSize: 13, marginTop: 6, lineHeight: 18, fontWeight: '600' },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitleRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontWeight: '900', color: '#0f172a', fontSize: 16 },
  linkBox: { backgroundColor: '#f1f5f9', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  linkText: { color: '#0f172a', fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnPrimaryText: { color: 'white', fontWeight: '900' },
  btnGhost: { backgroundColor: '#e2e8f0' },
  btnGhostText: { color: '#0f172a', fontWeight: '900' },
  btnFacebook: { backgroundColor: '#1877F2' },
  btnFacebookText: { color: 'white', fontWeight: '900' },
  grid: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 12, flexWrap: 'wrap' },
  kpiCard: {
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  kpiLabel: { color: '#64748b', fontWeight: '800', fontSize: 12 },
  kpiValue: { marginTop: 4, fontSize: 20, fontWeight: '900', color: '#0f172a' },
  goalItem: { borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff' },
  goalTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  goalTitle: { fontWeight: '900', color: '#0f172a' },
  goalDesc: { marginTop: 2, color: '#64748b', fontWeight: '600' },
  goalCount: { fontWeight: '900', color: '#0f172a' },
  goalBar: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 999, overflow: 'hidden', marginTop: 10 },
  goalBarFill: { height: 8, backgroundColor: '#2563eb', borderRadius: 999 },
  creditsRow: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap' },
  creditBox: { flex: 1, borderRadius: 14, backgroundColor: '#f8fafc', padding: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  creditLabel: { color: '#64748b', fontWeight: '800', fontSize: 12 },
  creditValue: { marginTop: 6, fontSize: 24, fontWeight: '900', color: '#2563eb' },
  rowBetween: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  small: { fontSize: 12, color: '#0f172a', fontWeight: '700' },
  smallStrong: { fontSize: 12, color: '#2563eb', fontWeight: '900', width: 36 },
  smallMuted: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  refItem: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  refName: { fontWeight: '900', color: '#0f172a' },
  refEmail: { marginTop: 2, color: '#64748b', fontWeight: '700' },
  refMeta: { alignItems: 'flex-end' },
  refPlan: { fontWeight: '900', color: '#2563eb' },
  refStatus: { marginTop: 2, fontWeight: '800', color: '#64748b', fontSize: 12 },
});

