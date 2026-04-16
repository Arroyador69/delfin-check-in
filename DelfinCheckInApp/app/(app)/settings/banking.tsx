import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, FlatList } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

type BankRow = {
  id: string;
  iban: string;
  bank_name?: string | null;
  account_holder_name: string;
  is_default?: boolean;
};

export default function BankingSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [iban, setIban] = useState('');
  const [holder, setHolder] = useState('');
  const [bankName, setBankName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/bank-accounts');
      return res.data as { success?: boolean; bank_accounts?: BankRow[] };
    },
  });

  const accounts = data?.bank_accounts || [];

  const addMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/tenant/bank-accounts', {
        iban: iban.trim(),
        account_holder_name: holder.trim(),
        bank_name: bankName.trim() || undefined,
      });
      return res.data;
    },
    onSuccess: async () => {
      setIban('');
      setHolder('');
      setBankName('');
      await queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      Alert.alert(t('common.success'), t('settings.micrositePayments.addAccountSuccess'));
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.error || e?.message || t('settings.micrositePayments.errorAddAccount'));
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('settings.tabs.micrositePayments')}</Text>
          <Text style={styles.subtitle}>{t('mobile.settings.hubBankingSubtitle')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('mobile.settings.bankAdd')}</Text>
        <Text style={styles.label}>{t('mobile.settings.bankIban')}</Text>
        <TextInput
          style={styles.input}
          value={iban}
          onChangeText={setIban}
          placeholder="ES00..."
          autoCapitalize="characters"
        />
        <Text style={styles.label}>{t('mobile.settings.bankHolder')}</Text>
        <TextInput style={styles.input} value={holder} onChangeText={setHolder} />
        <Text style={styles.label}>{t('mobile.settings.bankNameOptional')}</Text>
        <TextInput style={styles.input} value={bankName} onChangeText={setBankName} />
        <Pressable
          style={[styles.primaryBtn, (!iban.trim() || !holder.trim()) && styles.disabled]}
          disabled={!iban.trim() || !holder.trim() || addMutation.isPending}
          onPress={() => addMutation.mutate()}
        >
          <Text style={styles.primaryBtnText}>{t('mobile.settings.bankAdd')}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('settings.micrositePayments.bankAccounts')}</Text>
        {isLoading ? (
          <Text style={styles.muted}>{t('common.loading')}</Text>
        ) : accounts.length === 0 ? (
          <Text style={styles.muted}>{t('mobile.settings.bankEmpty')}</Text>
        ) : (
          <FlatList
            data={accounts}
            scrollEnabled={false}
            keyExtractor={(a) => String(a.id)}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.mono}>{item.iban}</Text>
                <Text style={styles.sub}>{item.account_holder_name}</Text>
                {item.bank_name ? <Text style={styles.hint}>{item.bank_name}</Text> : null}
                {item.is_default ? <Text style={styles.badge}>{t('mobile.settings.bankPrimary')}</Text> : null}
              </View>
            )}
          />
        )}
      </View>
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
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f9fafb',
  },
  primaryBtn: { marginTop: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#059669', alignItems: 'center' },
  primaryBtnText: { color: 'white', fontWeight: '900' },
  disabled: { opacity: 0.5 },
  muted: { fontSize: 13, color: '#6b7280' },
  row: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  mono: { fontFamily: 'Menlo', fontSize: 13, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 14, marginTop: 4, color: '#374151' },
  hint: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badge: { marginTop: 6, fontSize: 11, fontWeight: '800', color: '#059669' },
});
