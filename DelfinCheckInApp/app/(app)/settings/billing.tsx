import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

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
});
