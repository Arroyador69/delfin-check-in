import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Linking, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { openUpgradePlanInBrowser } from '@/lib/upgrade-plan';

type PlanCalcId = 'checkin' | 'standard' | 'pro';

type PendingInv = {
  id?: string;
  invoice_number?: string | null;
  amount_due?: number;
  currency?: string;
  status?: string;
  due_date?: string | null;
  hosted_invoice_url?: string | null;
};

type StripeInv = {
  id?: string;
  amount?: number;
  status?: string | null;
  date?: string;
  invoice_pdf?: string | null;
};

export default function BillingSettingsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [planCalcId, setPlanCalcId] = useState<PlanCalcId>('standard');
  const [roomCount, setRoomCount] = useState(2);
  const isIOS = Platform.OS === 'ios';

  useEffect(() => {
    const n = session?.user?.tenant?.currentRooms;
    if (n != null && n >= 1) setRoomCount(n);
  }, [session?.user?.tenant?.currentRooms]);

  const { data: priceRes, isFetching: priceLoading, isError: priceError } = useQuery({
    queryKey: ['plan-calculate-price', planCalcId, roomCount],
    queryFn: async () => {
      const res = await api.get(
        `/api/plans/calculate-price?planId=${planCalcId}&roomCount=${roomCount}`
      );
      return res.data as {
        success?: boolean;
        pricing?: {
          base_price: number;
          extra_rooms?: number;
          extra_rooms_price?: number;
          subtotal: number;
          vat?: { vat_rate?: number; vat_amount?: number };
          vat_rate?: number;
          vat_amount?: number;
          total: number;
        };
      };
    },
  });

  const pricing = priceRes?.success ? priceRes.pricing : null;
  const money = (v: unknown) => Number(v ?? 0);
  const vatRate = pricing ? pricing.vat?.vat_rate ?? pricing.vat_rate ?? 21 : 21;
  const vatAmount = pricing ? money(pricing.vat?.vat_amount ?? pricing.vat_amount) : 0;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['billing-summary'],
    queryFn: async () => {
      const res = await api.get('/api/billing');
      return res.data as {
        tenant?: { plan_name?: string; status?: string; subscription_status?: string };
        plan?: { price_total?: number };
        pending_invoices?: PendingInv[];
        invoices?: StripeInv[];
      };
    },
  });

  function formatMoney(amount: number | undefined, currency?: string) {
    const cur = (currency || 'EUR').toUpperCase();
    const n = Number(amount ?? 0);
    return `${cur} ${n.toFixed(2)}`;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('settings.billing.title')}</Text>
          <Text style={styles.subtitle}>{t('mobile.settings.hubBillingSubtitle')}</Text>
        </View>
      </View>

      {!isIOS ? (
        <View style={[styles.card, styles.calcCard]}>
          <Text style={styles.cardTitle}>{t('plans.priceCalculator')}</Text>
          <Text style={styles.calcHint}>{t('mobile.settings.billingPlan')}</Text>
          <View style={styles.planRow}>
            {(['checkin', 'standard', 'pro'] as const).map((pid) => (
              <Pressable
                key={pid}
                style={[styles.planChip, planCalcId === pid && styles.planChipOn]}
                onPress={() => setPlanCalcId(pid)}
              >
                <Text style={[styles.planChipText, planCalcId === pid && styles.planChipTextOn]}>
                  {pid === 'checkin'
                    ? t('plans.checkinPlanName')
                    : pid === 'standard'
                      ? t('plans.standardPlanName')
                      : t('plans.proPlanName')}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.calcHint, { marginTop: 10 }]}>{t('plans.numberOfRooms')}</Text>
          <View style={styles.roomStepper}>
            <Pressable
              style={styles.stepBtn}
              onPress={() => setRoomCount((c) => Math.max(1, c - 1))}
            >
              <Text style={styles.stepBtnText}>−</Text>
            </Pressable>
            <Text style={styles.roomCount}>{roomCount}</Text>
            <Pressable style={styles.stepBtn} onPress={() => setRoomCount((c) => c + 1)}>
              <Text style={styles.stepBtnText}>+</Text>
            </Pressable>
          </View>
          {priceLoading ? (
            <ActivityIndicator style={{ marginTop: 12 }} color="#2563eb" />
          ) : priceError || !pricing ? (
            <Text style={styles.errSmall}>{t('mobile.settings.planCalcError')}</Text>
          ) : (
            <View style={styles.priceBox}>
              <View style={styles.priceLine}>
                <Text style={styles.priceLineLabel}>{t('plans.basePrice')}</Text>
                <Text style={styles.priceLineVal}>{money(pricing.base_price).toFixed(2)} €</Text>
              </View>
              {money(pricing.extra_rooms_price) > 0 ? (
                <View style={styles.priceLine}>
                  <Text style={styles.priceLineMuted}>
                    {t('plans.extraRooms', { count: pricing.extra_rooms || 0 })}
                  </Text>
                  <Text style={styles.priceLineMuted}>+{money(pricing.extra_rooms_price).toFixed(2)} €</Text>
                </View>
              ) : null}
              <View style={styles.priceLine}>
                <Text style={styles.priceLineLabel}>{t('plans.subtotal')}</Text>
                <Text style={styles.priceLineVal}>{money(pricing.subtotal).toFixed(2)} €</Text>
              </View>
              <View style={styles.priceLine}>
                <Text style={styles.priceLineMuted}>{t('plans.vat', { rate: vatRate })}</Text>
                <Text style={styles.priceLineMuted}>+{vatAmount.toFixed(2)} €</Text>
              </View>
              <View style={[styles.priceLine, styles.priceTotalRow]}>
                <Text style={styles.priceTotalLabel}>{t('plans.totalMonthly')}</Text>
                <Text style={styles.priceTotalVal}>{money(pricing.total).toFixed(2)} €</Text>
              </View>
            </View>
          )}
          <Text style={styles.calcFoot}>{t('mobile.settings.planCalcNote')}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : isError ? (
        <Text style={styles.err}>{t('mobile.settings.billingLoadError')}</Text>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('mobile.settings.billingPlan')}</Text>
            <Text style={styles.rowVal}>{data?.tenant?.plan_name || '—'}</Text>
            <Text style={[styles.label, { marginTop: 12 }]}>{t('mobile.settings.billingStatus')}</Text>
            <Text style={styles.rowVal}>
              {data?.tenant?.subscription_status || data?.tenant?.status || '—'}
            </Text>
            {data?.plan?.price_total != null ? (
              <>
                <Text style={[styles.label, { marginTop: 12 }]}>{t('settings.billing.totalWithVat')}</Text>
                <Text style={styles.rowVal}>€{Number(data.plan.price_total).toFixed(2)}</Text>
              </>
            ) : null}
            {!isIOS ? (
              <>
                <Pressable
                  style={styles.upgradeCta}
                  onPress={() =>
                    void openUpgradePlanInBrowser(undefined, {
                      planId: planCalcId,
                      roomCount,
                    })
                  }
                >
                  <Text style={styles.upgradeCtaText}>{t('mobile.settings.upgradePlanButton')}</Text>
                </Pressable>
                <Text style={styles.upgradeHint}>{t('mobile.settings.upgradePlanHint')}</Text>
              </>
            ) : (
              <Text style={styles.upgradeHint}>
                {t('mobile.settings.upgradePlanHint')}
              </Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('mobile.settings.billingPending')}</Text>
            {(data?.pending_invoices || []).length === 0 ? (
              <Text style={styles.muted}>{t('mobile.settings.billingNonePending')}</Text>
            ) : (
              (data?.pending_invoices || []).map((inv) => (
                <View key={inv.id || inv.invoice_number} style={styles.invRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invTitle}>{inv.invoice_number || inv.id}</Text>
                    <Text style={styles.invSub}>{formatMoney(inv.amount_due, inv.currency)}</Text>
                    {inv.due_date ? (
                      <Text style={styles.invHint}>
                        {t('settings.billing.dueDate')} {new Date(inv.due_date).toLocaleDateString()}
                      </Text>
                    ) : null}
                  </View>
                  {inv.hosted_invoice_url ? (
                    <Pressable onPress={() => Linking.openURL(inv.hosted_invoice_url!)}>
                      <Text style={styles.link}>{t('settings.billing.viewInvoice')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('settings.billing.invoiceHistoryTitle')}</Text>
            {(data?.invoices || []).length === 0 ? (
              <Text style={styles.muted}>{t('settings.billing.noInvoices')}</Text>
            ) : (
              (data?.invoices || []).map((inv) => (
                <View key={inv.id} style={styles.invRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invTitle}>{inv.id}</Text>
                    <Text style={styles.invSub}>
                      {formatMoney((inv.amount ?? 0) / 100, 'eur')}
                      {inv.date ? ` · ${new Date(inv.date).toLocaleDateString()}` : ''}
                    </Text>
                    <Text style={styles.invHint}>{inv.status}</Text>
                  </View>
                  {inv.invoice_pdf ? (
                    <Pressable onPress={() => Linking.openURL(inv.invoice_pdf!)}>
                      <Text style={styles.link}>{t('settings.billing.downloadPdf')}</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
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
  upgradeCta: {
    marginTop: 14,
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
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '700', color: '#6b7280' },
  rowVal: { fontSize: 15, fontWeight: '600', color: '#111827' },
  muted: { fontSize: 13, color: '#6b7280' },
  err: { margin: 16, color: '#dc2626', fontWeight: '600' },
  invRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8,
  },
  invTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  invSub: { fontSize: 13, color: '#374151', marginTop: 2 },
  invHint: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  link: { color: '#2563eb', fontWeight: '800', fontSize: 13 },
  calcCard: {
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  calcHint: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  roomStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 22, fontWeight: '800', color: '#111827' },
  roomCount: { fontSize: 20, fontWeight: '900', color: '#111827', minWidth: 36, textAlign: 'center' },
  planRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  planChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
  },
  planChipOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  planChipText: { fontSize: 12, fontWeight: '700', color: '#4b5563' },
  planChipTextOn: { color: 'white' },
  priceBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  priceLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  priceLineLabel: { fontSize: 13, color: '#111827' },
  priceLineVal: { fontSize: 13, fontWeight: '700', color: '#111827' },
  priceLineMuted: { fontSize: 13, color: '#6b7280' },
  priceTotalRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  priceTotalLabel: { fontSize: 15, fontWeight: '800', color: '#111827' },
  priceTotalVal: { fontSize: 16, fontWeight: '900', color: '#2563eb' },
  calcFoot: { marginTop: 12, fontSize: 11, color: '#6b7280', lineHeight: 16 },
  errSmall: { marginTop: 8, color: '#dc2626', fontWeight: '600', fontSize: 13 },
});
