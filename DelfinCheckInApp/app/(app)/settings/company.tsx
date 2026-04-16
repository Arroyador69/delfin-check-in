// =====================================================
// AJUSTES > DATOS DE EMPRESA (para PDFs)
// =====================================================

import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

type EmpresaConfig = {
  nombre_empresa: string;
  nif_empresa: string;
  direccion_empresa: string;
  codigo_postal: string;
  ciudad: string;
  provincia: string;
  pais: string;
  telefono: string;
  email: string;
  web?: string;
  logo_url?: string;
};

const emptyEmpresa: EmpresaConfig = {
  nombre_empresa: '',
  nif_empresa: '',
  direccion_empresa: '',
  codigo_postal: '',
  ciudad: '',
  provincia: '',
  pais: 'España',
  telefono: '',
  email: '',
  web: '',
  logo_url: '',
};

export default function CompanySettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EmpresaConfig>(emptyEmpresa);

  const { data, isLoading } = useQuery({
    queryKey: ['empresa-config'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/empresa-config');
      return res.data as { success: boolean; empresa?: Partial<EmpresaConfig> };
    },
  });

  useEffect(() => {
    if (data?.empresa) {
      setForm((prev) => ({ ...prev, ...(data.empresa as EmpresaConfig) }));
    }
  }, [data?.empresa]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/tenant/empresa-config', form);
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['empresa-config'] });
      Alert.alert(t('common.success'), t('common.save'));
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.error || t('mobile.settings.saveFailed'));
    },
  });

  const Field = (props: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'email-address' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#9ca3af"
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize}
      />
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('settings.empresa.title')}</Text>
          <Text style={styles.subtitle}>{t('settings.empresa.subtitle')}</Text>
        </View>
      </View>

      <View style={styles.card}>
        {isLoading && !data ? <Text style={styles.loading}>{t('common.loading')}</Text> : null}

        <Field
          label={t('settings.empresa.companyName')}
          value={form.nombre_empresa}
          onChangeText={(v) => setForm((p) => ({ ...p, nombre_empresa: v }))}
          placeholder={t('settings.empresa.companyNamePlaceholder')}
          autoCapitalize="words"
        />
        <Field
          label={t('settings.empresa.nifCif')}
          value={form.nif_empresa}
          onChangeText={(v) => setForm((p) => ({ ...p, nif_empresa: v }))}
          placeholder={t('settings.empresa.nifPlaceholder')}
          autoCapitalize="characters"
        />
        <Field
          label={t('settings.empresa.addressLabel')}
          value={form.direccion_empresa}
          onChangeText={(v) => setForm((p) => ({ ...p, direccion_empresa: v }))}
          placeholder={t('settings.empresa.addressPlaceholder')}
          autoCapitalize="sentences"
        />
        <Field
          label={t('settings.empresa.postalCode')}
          value={form.codigo_postal}
          onChangeText={(v) => setForm((p) => ({ ...p, codigo_postal: v }))}
          placeholder={t('settings.empresa.postalPlaceholder')}
        />
        <Field
          label={t('settings.empresa.city')}
          value={form.ciudad}
          onChangeText={(v) => setForm((p) => ({ ...p, ciudad: v }))}
          placeholder={t('settings.empresa.cityPlaceholder')}
          autoCapitalize="words"
        />
        <Field
          label={t('settings.empresa.province')}
          value={form.provincia}
          onChangeText={(v) => setForm((p) => ({ ...p, provincia: v }))}
          placeholder={t('settings.empresa.provincePlaceholder')}
          autoCapitalize="words"
        />
        <Field
          label={t('settings.empresa.country')}
          value={form.pais}
          onChangeText={(v) => setForm((p) => ({ ...p, pais: v }))}
          placeholder={t('settings.empresa.countryPlaceholder')}
          autoCapitalize="words"
        />
        <Field
          label={t('settings.empresa.phone')}
          value={form.telefono}
          onChangeText={(v) => setForm((p) => ({ ...p, telefono: v }))}
          placeholder={t('settings.empresa.phonePlaceholder')}
          keyboardType="phone-pad"
        />
        <Field
          label={t('settings.empresa.email')}
          value={form.email}
          onChangeText={(v) => setForm((p) => ({ ...p, email: v }))}
          placeholder={t('settings.empresa.emailPlaceholder')}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label={t('settings.empresa.website')}
          value={form.web || ''}
          onChangeText={(v) => setForm((p) => ({ ...p, web: v }))}
          placeholder={t('settings.empresa.websitePlaceholder')}
          autoCapitalize="none"
        />
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
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  loading: { color: '#6b7280', fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },
  field: { marginBottom: 12 },
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
  saveButton: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { color: 'white', fontWeight: '900', fontSize: 15 },
});

