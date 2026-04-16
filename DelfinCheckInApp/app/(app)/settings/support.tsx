import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, FlatList } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

const CATEGORIES = [
  'software_issue',
  'integration_error',
  'data_export',
  'account_access',
  'other_technical',
] as const;

type TicketRow = {
  id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
};

function categoryLabel(cat: string): string {
  const key = `settings.support.categories.${cat}` as const;
  const label = t(key);
  return label === key ? cat : label;
}

function statusLabel(st: string): string {
  const key = `settings.support.status.${st}` as const;
  const label = t(key);
  return label === key ? st : label;
}

export default function SupportSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('software_issue');

  const { data, isLoading } = useQuery({
    queryKey: ['support-tickets'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/support-tickets');
      return res.data as { success?: boolean; tickets?: TicketRow[] };
    },
  });

  const tickets = data?.tickets || [];

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/tenant/support-tickets', { subject: subject.trim(), body: body.trim(), category });
      return res.data;
    },
    onSuccess: async () => {
      setSubject('');
      setBody('');
      await queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      Alert.alert(t('common.success'), t('settings.support.submitSuccess'));
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.error || t('settings.support.submitError'));
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('settings.support.title')}</Text>
          <Text style={styles.subtitle}>{t('mobile.settings.hubSupportSubtitle')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.intro}>{t('settings.support.intro')}</Text>
        <Text style={styles.notFor}>{t('settings.support.notFor')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('mobile.settings.supportNewTitle')}</Text>
        <Text style={styles.label}>{t('settings.support.categoryLabel')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {CATEGORIES.map((c) => (
              <Pressable key={c} style={[styles.chip, category === c && styles.chipOn]} onPress={() => setCategory(c)}>
                <Text style={category === c ? styles.chipOnText : styles.chipText} numberOfLines={2}>
                  {categoryLabel(c)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <Text style={styles.label}>{t('settings.support.subjectLabel')}</Text>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder={t('settings.support.subjectPlaceholder')}
        />
        <Text style={styles.hint}>{t('settings.support.subjectHint')}</Text>
        <Text style={[styles.label, { marginTop: 10 }]}>{t('settings.support.bodyLabel')}</Text>
        <TextInput
          style={styles.textarea}
          multiline
          value={body}
          onChangeText={setBody}
          placeholder={t('settings.support.bodyPlaceholder')}
        />
        <Text style={styles.hint}>{t('settings.support.bodyHint')}</Text>
        <Pressable
          style={[styles.primaryBtn, submitMutation.isPending && styles.disabled]}
          disabled={submitMutation.isPending}
          onPress={() => submitMutation.mutate()}
        >
          <Text style={styles.primaryBtnText}>
            {submitMutation.isPending ? t('settings.support.submitting') : t('settings.support.submit')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('mobile.settings.supportHistory')}</Text>
        {isLoading ? (
          <Text style={styles.muted}>{t('settings.support.loading')}</Text>
        ) : tickets.length === 0 ? (
          <Text style={styles.muted}>{t('settings.support.historyEmpty')}</Text>
        ) : (
          <FlatList
            data={tickets}
            scrollEnabled={false}
            keyExtractor={(x) => String(x.id)}
            renderItem={({ item }) => (
              <View style={styles.ticketRow}>
                <Text style={styles.ticketSubject}>{item.subject}</Text>
                <Text style={styles.ticketMeta}>
                  {categoryLabel(item.category)} · {statusLabel(item.status)}
                </Text>
                <Text style={styles.ticketDate}>{new Date(item.created_at).toLocaleString()}</Text>
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
  title: { fontSize: 17, fontWeight: '900', color: '#111827' },
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
  intro: { fontSize: 13, color: '#374151', marginBottom: 8, lineHeight: 20 },
  notFor: { fontSize: 12, color: '#92400e', lineHeight: 18 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 4 },
  hint: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    backgroundColor: '#f9fafb',
  },
  chip: {
    maxWidth: 220,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  chipOn: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  chipText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  chipOnText: { fontSize: 11, fontWeight: '800', color: 'white' },
  primaryBtn: { marginTop: 14, paddingVertical: 14, borderRadius: 12, backgroundColor: '#059669', alignItems: 'center' },
  primaryBtnText: { color: 'white', fontWeight: '900' },
  disabled: { opacity: 0.55 },
  muted: { fontSize: 13, color: '#6b7280' },
  ticketRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  ticketSubject: { fontSize: 14, fontWeight: '800', color: '#111827' },
  ticketMeta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  ticketDate: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
});
