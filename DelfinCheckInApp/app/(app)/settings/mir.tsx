// =====================================================
// AJUSTES > CONFIGURACIÓN MIR (básico)
// =====================================================

import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, Switch } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

type MirSettings = {
  enabled: boolean;
  codigoEstablecimiento: string;
  denominacion: string;
  direccionCompleta: string;
  autoSubmit: boolean;
  testMode: boolean;
};

const emptyMir: MirSettings = {
  enabled: false,
  codigoEstablecimiento: '',
  denominacion: '',
  direccionCompleta: '',
  autoSubmit: true,
  testMode: false,
};

export default function MirSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MirSettings>(emptyMir);

  const { data, isLoading } = useQuery({
    queryKey: ['settings-mir'],
    queryFn: async () => {
      const res = await api.get('/api/settings/mir');
      return res.data as { success?: boolean; mir?: Partial<MirSettings> };
    },
  });

  useEffect(() => {
    if (data?.mir) {
      setForm((p) => ({ ...p, ...(data.mir as MirSettings) }));
    }
  }, [data?.mir]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/settings/mir', { mir: form });
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['settings-mir'] });
      Alert.alert(t('common.success'), t('common.save'));
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.error || t('mobile.settings.saveFailed'));
    },
  });

  const Field = (props: { label: string; value: string; onChangeText: (v: string) => void; placeholder?: string }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#9ca3af"
      />
    </View>
  );

  const Toggle = (props: { label: string; value: boolean; onValueChange: (v: boolean) => void }) => (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{props.label}</Text>
      <Switch value={props.value} onValueChange={props.onValueChange} />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('settings.tabs.mir')}</Text>
          <Text style={styles.subtitle}>{t('mobile.settings.mirSubtitle')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        {isLoading && !data ? <Text style={styles.loading}>{t('common.loading')}</Text> : null}

        <Toggle label={t('mobile.settings.mirEnabledLabel')} value={form.enabled} onValueChange={(v) => setForm((p) => ({ ...p, enabled: v }))} />
        <Toggle
          label={t('mobile.settings.mirAutoSubmitLabel')}
          value={form.autoSubmit}
          onValueChange={(v) => setForm((p) => ({ ...p, autoSubmit: v }))}
        />
        <Toggle label={t('mobile.settings.mirTestModeLabel')} value={form.testMode} onValueChange={(v) => setForm((p) => ({ ...p, testMode: v }))} />

        {form.enabled ? (
          <>
            <Field
              label={t('settings.mir.codigoEstablecimientoLabel')}
              value={form.codigoEstablecimiento}
              onChangeText={(v) => setForm((p) => ({ ...p, codigoEstablecimiento: v }))}
              placeholder={t('mobile.settings.mirCodigoPh')}
            />
            <Field
              label={t('mobile.settings.mirDenominacionLabel')}
              value={form.denominacion}
              onChangeText={(v) => setForm((p) => ({ ...p, denominacion: v }))}
              placeholder={t('mobile.settings.mirDenominacionPh')}
            />
            <Field
              label={t('mobile.settings.mirDireccionLabel')}
              value={form.direccionCompleta}
              onChangeText={(v) => setForm((p) => ({ ...p, direccionCompleta: v }))}
              placeholder={t('mobile.settings.mirDireccionPh')}
            />
          </>
        ) : null}
      </View>

      <Pressable
        style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
        onPress={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
      >
        <Text style={styles.saveText}>{saveMutation.isPending ? t('common.loading') : t('common.save')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 12 },
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
  card: { backgroundColor: 'white', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  loading: { color: '#6b7280', fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  field: { marginTop: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#111827', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 15,
    color: '#111827',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  toggleLabel: { fontSize: 14, fontWeight: '700', color: '#111827' },
  saveButton: { marginTop: 12, backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { color: 'white', fontWeight: '900', fontSize: 15 },
});

