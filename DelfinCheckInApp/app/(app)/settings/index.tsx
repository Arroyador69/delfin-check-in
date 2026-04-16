// =====================================================
// AJUSTES (HUB)
// =====================================================

import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'expo-router';
import { t } from '@/lib/i18n';
import { openUpgradePlanInBrowser, suggestedUpgradeTargetPlan } from '@/lib/upgrade-plan';

export default function SettingsScreen() {
  const { session, signOut } = useAuth();
  const router = useRouter();

  function getPlanLabel(planId?: string | null) {
    const raw = String(planId || '').trim().toLowerCase();
    if (!raw) return '—';
    const translated = t(`dashboard.planTypeNames.${raw}`);
    if (translated !== `dashboard.planTypeNames.${raw}`) return translated;
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  async function handleSignOut() {
    Alert.alert(t('dashboard.logout'), t('common.confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('dashboard.logout'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)');
        },
      },
    ]);
  }

  const Item = (props: { title: string; subtitle?: string; onPress: () => void }) => (
    <Pressable style={styles.item} onPress={props.onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{props.title}</Text>
        {props.subtitle ? <Text style={styles.itemSubtitle}>{props.subtitle}</Text> : null}
      </View>
      <Text style={styles.itemChevron}>›</Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('settings.title')}</Text>
        <Text style={styles.sectionSubtitle}>{t('settings.subtitle')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('settings.tabs.account')}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('common.email')}</Text>
          <Text style={styles.infoValue}>{session?.user.email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('common.name')}</Text>
          <Text style={styles.infoValue}>{session?.user.fullName || '—'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('mobile.settings.tenantLabel')}</Text>
          <Text style={styles.infoValue}>{session?.user.tenant.name}</Text>
        </View>
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>{t('mobile.settings.planLabel')}</Text>
          <Text style={styles.infoValue}>{getPlanLabel(session?.user.tenant.planId)}</Text>
        </View>
        <Pressable
          style={styles.upgradeCta}
          onPress={() =>
            void openUpgradePlanInBrowser(undefined, {
              planId: suggestedUpgradeTargetPlan(session?.user?.tenant?.planId),
              roomCount: Math.max(1, session?.user?.tenant?.currentRooms ?? 1),
            })
          }
        >
          <Text style={styles.upgradeCtaText}>{t('mobile.settings.upgradePlanButton')}</Text>
        </Pressable>
        <Text style={styles.upgradeHint}>{t('mobile.settings.upgradePlanHint')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('common.manage')}</Text>
        <Item
          title={t('settings.tabs.general')}
          subtitle={t('mobile.settings.hubGeneralSubtitle')}
          onPress={() => router.push('/(app)/settings/general' as any)}
        />
        <Item
          title={t('settings.tabs.checkinInstructions')}
          subtitle={t('mobile.settings.hubCheckinSubtitle')}
          onPress={() => router.push('/(app)/settings/checkin-instructions' as any)}
        />
        <Item
          title={t('settings.tabs.integrations')}
          subtitle={t('mobile.settings.hubIntegrationsSubtitle')}
          onPress={() => router.push('/(app)/settings/integrations' as any)}
        />
        <Item
          title={t('settings.cleaning.title')}
          subtitle={t('mobile.settings.hubCleaningSubtitle')}
          onPress={() => router.push('/(app)/settings/cleaning-calendar' as any)}
        />
        <Item
          title={t('settings.tabs.billing')}
          subtitle={t('mobile.settings.hubBillingSubtitle')}
          onPress={() => router.push('/(app)/settings/billing' as any)}
        />
        <Item
          title={t('settings.tabs.micrositePayments')}
          subtitle={t('mobile.settings.hubBankingSubtitle')}
          onPress={() => router.push('/(app)/settings/banking' as any)}
        />
        <Item
          title={t('navigation.reputationGoogle')}
          subtitle={t('mobile.settings.hubReputationSubtitle')}
          onPress={() => router.push('/(app)/settings/reputation' as any)}
        />
        <Item
          title={t('settings.tabs.support')}
          subtitle={t('mobile.settings.hubSupportSubtitle')}
          onPress={() => router.push('/(app)/settings/support' as any)}
        />
        <Item
          title={t('settings.tabs.paymentLinks')}
          subtitle={t('mobile.settings.hubPaymentLinksSubtitle')}
          onPress={() => router.push('/(app)/payment-links' as any)}
        />
        <Item
          title={t('settings.tabs.empresa')}
          subtitle={t('mobile.settings.hubEmpresaSubtitle')}
          onPress={() => router.push('/(app)/settings/company' as any)}
        />
        <Item
          title={t('settings.tabs.mir')}
          subtitle={t('mobile.settings.hubMirSubtitle')}
          onPress={() => router.push('/(app)/settings/mir' as any)}
        />
        <Item
          title={t('settings.tabs.properties')}
          subtitle={t('mobile.settings.hubPropertiesSubtitle')}
          onPress={() => router.push('/(app)/settings/properties' as any)}
        />
        <Item
          title={t('settings.tabs.language')}
          subtitle={t('mobile.settings.languageSubtitle')}
          onPress={() => router.push('/(app)/settings/language' as any)}
        />
        <Text style={styles.webHint}>{t('mobile.settings.webAdvancedHint')}</Text>
      </View>

      <Pressable style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>{t('dashboard.logout')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#6b7280',
    fontSize: 13,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  infoLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  infoValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 10,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  itemSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },
  itemChevron: {
    fontSize: 22,
    color: '#9ca3af',
    paddingLeft: 6,
  },
  webHint: {
    marginTop: 12,
    fontSize: 11,
    color: '#9ca3af',
    lineHeight: 16,
  },
  signOutButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});
