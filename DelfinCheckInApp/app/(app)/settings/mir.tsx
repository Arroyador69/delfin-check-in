// =====================================================
// AJUSTES > CONFIGURACIÓN MIR (básico)
// =====================================================

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Switch,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

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

type MirUnitType = 'habitacion' | 'apartamento';

type MirCredencialLite = {
  id: number;
  nombre: string;
  usuario: string;
  hasPassword: boolean;
  codigoArrendador: string;
  codigoEstablecimiento: string;
  baseUrl: string;
  activo: boolean;
};

type MirUnitRow = {
  room_id: string;
  room_name: string;
  unit_type: MirUnitType;
  credencial_id: number | null;
};

const emptyMir: MirSettings = {
  enabled: false,
  codigoEstablecimiento: '',
  denominacion: '',
  direccionCompleta: '',
  autoSubmit: true,
  testMode: false,
};

function trimApiBase(): string {
  return String(api.defaults.baseURL || '').replace(/\/$/, '');
}

type MirWsConfig = {
  usuario: string;
  contraseña: string;
  codigoArrendador: string;
  codigoEstablecimiento: string;
  baseUrl: string;
  simulacion: boolean;
};

const emptyWs: MirWsConfig = {
  usuario: '',
  contraseña: '',
  codigoArrendador: '',
  codigoEstablecimiento: '',
  baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
  simulacion: false,
};

export default function MirSettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MirSettings>(emptyMir);
  const [newCred, setNewCred] = useState({
    nombre: '',
    usuario: '',
    contraseña: '',
    codigoArrendador: '',
    codigoEstablecimiento: '',
    baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
  });

  const [editModalCred, setEditModalCred] = useState<MirCredencialLite | null>(null);
  const [editDraft, setEditDraft] = useState({
    nombre: '',
    usuario: '',
    contraseña: '',
    codigoArrendador: '',
    codigoEstablecimiento: '',
    baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
  });

  const [wsConfig, setWsConfig] = useState<MirWsConfig>(emptyWs);

  const { data, isLoading } = useQuery({
    queryKey: ['settings-mir'],
    queryFn: async () => {
      const res = await api.get('/api/settings/mir');
      return res.data as { success?: boolean; mir?: Partial<MirSettings> };
    },
  });

  const { data: limitsData } = useQuery({
    queryKey: ['tenant-limits'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/limits');
      return res.data as { tenant?: { limits?: { maxRooms?: number } } };
    },
  });

  const { data: credsData, isLoading: credsLoading } = useQuery({
    queryKey: ['mir-credenciales'],
    queryFn: async () => {
      const res = await api.get('/api/ministerio/credenciales');
      return res.data as { credenciales?: MirCredencialLite[] };
    },
  });

  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ['mir-unidades-config'],
    queryFn: async () => {
      const res = await api.get('/api/ministerio/unidades-config');
      return res.data as { units?: MirUnitRow[] };
    },
  });

  const { data: mirVerifyData } = useQuery({
    queryKey: ['mir-verificar-config'],
    queryFn: async () => {
      const res = await api.get('/api/ministerio/verificar-config');
      return res.data as {
        success?: boolean;
        config?: Partial<MirWsConfig>;
        status?: { configurado?: boolean };
      };
    },
  });

  useEffect(() => {
    if (data?.mir) {
      setForm((p) => ({ ...p, ...(data.mir as MirSettings) }));
    }
  }, [data?.mir]);

  useEffect(() => {
    const c = mirVerifyData?.config;
    if (!c) return;
    setWsConfig((prev) => ({
      ...prev,
      usuario: String(c.usuario ?? prev.usuario ?? ''),
      contraseña: '',
      codigoArrendador: String(c.codigoArrendador ?? prev.codigoArrendador ?? ''),
      codigoEstablecimiento: String(c.codigoEstablecimiento ?? prev.codigoEstablecimiento ?? ''),
      baseUrl: String(c.baseUrl ?? prev.baseUrl ?? emptyWs.baseUrl),
      simulacion: Boolean(c.simulacion ?? prev.simulacion),
    }));
  }, [mirVerifyData?.config]);

  const maxAllowed = Number(limitsData?.tenant?.limits?.maxRooms ?? 0);
  const credenciales: MirCredencialLite[] = Array.isArray(credsData?.credenciales) ? credsData!.credenciales! : [];
  const credById = useMemo(() => {
    const m = new Map<number, MirCredencialLite>();
    for (const c of credenciales) m.set(c.id, c);
    return m;
  }, [credenciales]);
  const units: MirUnitRow[] = Array.isArray(unitsData?.units) ? unitsData!.units! : [];
  const configured = credenciales.filter((c) => c.activo).length;
  const canCreateMore = maxAllowed > 0 ? configured < maxAllowed : false;
  const mirConfigured = Boolean(mirVerifyData?.status?.configurado);

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

  const saveWsMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/ministerio/config-produccion', {
        usuario: wsConfig.usuario,
        contraseña: wsConfig.contraseña,
        codigoArrendador: wsConfig.codigoArrendador,
        codigoEstablecimiento: wsConfig.codigoEstablecimiento,
        baseUrl: wsConfig.baseUrl,
        simulacion: wsConfig.simulacion,
      });
      return res.data as { success?: boolean; message?: string; error?: string };
    },
    onSuccess: async (data) => {
      if (data?.success === false) {
        Alert.alert(t('common.error'), data?.message || data?.error || t('settings.mir.errorSavingConfig'));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ['mir-verificar-config'] });
      await queryClient.invalidateQueries({ queryKey: ['mir-credenciales'] });
      setWsConfig((p) => ({ ...p, contraseña: '' }));
      Alert.alert(t('common.success'), t('settings.mir.configSaved'));
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.message || e?.response?.data?.error || t('settings.mir.errorSavingConfig'));
    },
  });

  const testWsMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/ministerio/test-produccion', {
        usuario: wsConfig.usuario,
        contraseña: wsConfig.contraseña,
        codigoArrendador: wsConfig.codigoArrendador,
        codigoEstablecimiento: wsConfig.codigoEstablecimiento,
        baseUrl: wsConfig.baseUrl,
        simulacion: wsConfig.simulacion,
      });
      return res.data as { success?: boolean; message?: string; resultado?: { descripcion?: string } };
    },
    onSuccess: (data) => {
      if (data?.success) {
        Alert.alert(t('common.success'), t('settings.mir.connectionSuccess'));
      } else {
        const msg =
          data?.resultado?.descripcion ||
          data?.message ||
          t('settings.mir.connectionTestError', { message: '' });
        Alert.alert(t('common.error'), msg);
      }
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.message || t('settings.mir.connectionError'));
    },
  });

  const Field = (props: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
  }) => (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        style={styles.input}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor="#9ca3af"
        secureTextEntry={props.secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );

  const Toggle = (props: { label: string; value: boolean; onValueChange: (v: boolean) => void }) => (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{props.label}</Text>
      <Switch value={props.value} onValueChange={props.onValueChange} />
    </View>
  );

  const createCredMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/ministerio/credenciales', newCred);
      return res.data as { success?: boolean; error?: string };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mir-credenciales'] });
      Alert.alert(t('common.success'), t('settings.mir.multi.createdOk'));
      setNewCred((p) => ({ ...p, nombre: '', usuario: '', contraseña: '', codigoArrendador: '', codigoEstablecimiento: '' }));
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.error || t('settings.mir.multi.createdFail'));
    },
  });

  const patchCredMutation = useMutation({
    mutationFn: async (payload: { id: number; body: Record<string, string> }) => {
      const res = await api.patch(`/api/ministerio/credenciales/${payload.id}`, payload.body);
      return res.data as { success?: boolean; error?: string; message?: string };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mir-credenciales'] });
      setEditModalCred(null);
      Alert.alert(t('common.success'), t('settings.mir.multi.credentialUpdated'));
    },
    onError: (e: any) => {
      Alert.alert(
        t('common.error'),
        e?.response?.data?.message || e?.response?.data?.error || t('settings.mir.multi.credentialSaveError')
      );
    },
  });

  const deleteCredMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/api/ministerio/credenciales/${id}`);
      return res.data as { success?: boolean; error?: string };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mir-credenciales'] });
      await queryClient.invalidateQueries({ queryKey: ['mir-unidades-config'] });
      Alert.alert(t('common.success'), t('settings.mir.multi.credentialDeleted'));
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.error || t('settings.mir.multi.credentialDeleteError'));
    },
  });

  const saveUnitMutation = useMutation({
    mutationFn: async (payload: { room_id: string; unit_type?: MirUnitType; credencial_id?: number | null }) => {
      const res = await api.post('/api/ministerio/unidades-config', payload);
      return res.data as { success?: boolean; error?: string };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mir-unidades-config'] });
    },
    onError: (e: any) => {
      Alert.alert(t('common.error'), e?.response?.data?.error || t('settings.mir.multi.saveUnitFail'));
    },
  });

  function chooseUnitType(row: MirUnitRow) {
    Alert.alert(t('settings.mir.multi.unitType'), row.room_name, [
      { text: t('settings.mir.multi.typeRoom'), onPress: () => saveUnitMutation.mutate({ room_id: row.room_id, unit_type: 'habitacion' }) },
      { text: t('settings.mir.multi.typeApartment'), onPress: () => saveUnitMutation.mutate({ room_id: row.room_id, unit_type: 'apartamento' }) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  function chooseCredential(row: MirUnitRow) {
    const options = credenciales.map((c) => ({
      text: `${c.nombre} · ${c.codigoEstablecimiento}`,
      onPress: () => saveUnitMutation.mutate({ room_id: row.room_id, credencial_id: c.id }),
    }));
    Alert.alert(t('settings.mir.multi.assignCredential'), row.room_name, [
      { text: t('settings.mir.multi.unassign'), style: 'destructive', onPress: () => saveUnitMutation.mutate({ room_id: row.room_id, credencial_id: null }) },
      ...options.slice(0, 6),
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  function openViewCredential(c: MirCredencialLite) {
    const lines = [
      `${t('settings.mir.multi.baseUrl')}: ${c.baseUrl}`,
      `${t('settings.mir.multi.landlord')}: ${c.codigoArrendador}`,
      `${t('settings.mir.multi.establishment')}: ${c.codigoEstablecimiento}`,
      `${t('settings.mir.multi.user')}: ${c.usuario}`,
      c.hasPassword ? '' : '⚠️',
    ].filter(Boolean);
    Alert.alert(c.nombre, lines.join('\n'));
  }

  function openEditCredential(c: MirCredencialLite) {
    setEditModalCred(c);
    setEditDraft({
      nombre: c.nombre,
      usuario: c.usuario,
      contraseña: '',
      codigoArrendador: c.codigoArrendador,
      codigoEstablecimiento: c.codigoEstablecimiento,
      baseUrl: c.baseUrl || newCred.baseUrl,
    });
  }

  function confirmDeleteCredential(c: MirCredencialLite) {
    Alert.alert(t('settings.mir.multi.deleteCredential'), t('settings.mir.multi.deleteCredentialConfirm', { name: c.nombre }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.mir.multi.deleteCredential'),
        style: 'destructive',
        onPress: () => deleteCredMutation.mutate(c.id),
      },
    ]);
  }

  function saveEditCredential() {
    if (!editModalCred) return;
    patchCredMutation.mutate({
      id: editModalCred.id,
      body: {
        nombre: editDraft.nombre,
        usuario: editDraft.usuario,
        contraseña: editDraft.contraseña,
        codigoArrendador: editDraft.codigoArrendador,
        codigoEstablecimiento: editDraft.codigoEstablecimiento,
        baseUrl: editDraft.baseUrl,
      },
    });
  }

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
        <Text style={styles.sectionTitleSmall}>{t('settings.mir.credentialsTitle')}</Text>
        <Text style={styles.subtitle}>{t('settings.mir.credentialsDescription')}</Text>
        <Text
          style={[
            styles.hintText,
            { marginTop: 8, fontWeight: '800', color: mirConfigured ? '#047857' : '#b45309' },
          ]}
        >
          {mirConfigured ? t('settings.mir.statusComplete') : t('settings.mir.statusIncomplete')}
        </Text>

        <Field
          label={t('settings.mir.userLabel')}
          value={wsConfig.usuario}
          onChangeText={(v) => setWsConfig((p) => ({ ...p, usuario: v }))}
          placeholder={t('settings.mir.userPlaceholder')}
        />
        <Field
          label={t('settings.mir.passwordLabel')}
          value={wsConfig.contraseña}
          onChangeText={(v) => setWsConfig((p) => ({ ...p, contraseña: v }))}
          placeholder={t('settings.mir.passwordPlaceholder')}
          secureTextEntry
        />
        <Field
          label={t('settings.mir.codigoArrendadorLabel')}
          value={wsConfig.codigoArrendador}
          onChangeText={(v) => setWsConfig((p) => ({ ...p, codigoArrendador: v }))}
          placeholder={t('settings.mir.codigoArrendadorPlaceholder')}
        />
        <Field
          label={t('settings.mir.codigoEstablecimientoLabel')}
          value={wsConfig.codigoEstablecimiento}
          onChangeText={(v) => setWsConfig((p) => ({ ...p, codigoEstablecimiento: v }))}
          placeholder={t('settings.mir.codigoEstablecimientoPlaceholder')}
        />
        <Field
          label={t('settings.mir.baseUrlLabel')}
          value={wsConfig.baseUrl}
          onChangeText={(v) => setWsConfig((p) => ({ ...p, baseUrl: v }))}
          placeholder={wsConfig.baseUrl}
        />
        <Toggle
          label={t('settings.mir.simulacionLabel')}
          value={wsConfig.simulacion}
          onValueChange={(v) => setWsConfig((p) => ({ ...p, simulacion: v }))}
        />

        <Pressable
          style={[
            styles.saveButton,
            (saveWsMutation.isPending || testWsMutation.isPending) && styles.saveButtonDisabled,
          ]}
          onPress={() => saveWsMutation.mutate()}
          disabled={saveWsMutation.isPending || testWsMutation.isPending}
        >
          <Text style={styles.saveText}>
            {saveWsMutation.isPending ? t('settings.mir.saving') : t('settings.mir.saveConfig')}
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <Pressable
            style={[styles.smallButton, { flex: 1 }, testWsMutation.isPending && { opacity: 0.6 }]}
            onPress={() => testWsMutation.mutate()}
            disabled={testWsMutation.isPending || saveWsMutation.isPending}
          >
            <Text style={styles.smallButtonText}>
              {testWsMutation.isPending ? t('settings.mir.testing') : t('settings.mir.testConnection')}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.smallButton, { flex: 1 }]}
            onPress={() =>
              Linking.openURL(`${trimApiBase()}/admin/mir-comunicaciones`).catch(() => {
                Alert.alert(t('common.error'), t('settings.mir.connectionError'));
              })
            }
          >
            <Text style={styles.smallButtonText}>{t('settings.mir.goToPanel')}</Text>
          </Pressable>
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

      <View style={styles.card}>
        <Text style={styles.sectionTitleSmall}>{t('settings.mir.multi.title')}</Text>
        <Text style={styles.subtitle}>
          {t('settings.mir.multi.counter', { configured, max: maxAllowed || '—' })}
        </Text>

        {!canCreateMore && maxAllowed > 0 ? (
          <Text style={styles.warnText}>{t('settings.mir.multi.limitReached')}</Text>
        ) : null}

        <View style={{ marginTop: 10 }}>
          <Text style={styles.hintText}>{t('settings.mir.multi.rule')}</Text>
        </View>
        <Text style={[styles.hintText, { marginTop: 8 }]}>{t('settings.mir.multi.mirRoutingNote')}</Text>

        <View style={{ marginTop: 14 }}>
          <Text style={styles.sectionTitleSmall}>{t('settings.mir.multi.existingTitle')}</Text>
          <Text style={styles.subtitle}>{t('settings.mir.multi.existingSubtitle')}</Text>
          {credsLoading ? <Text style={styles.loading}>{t('common.loading')}</Text> : null}
          {credenciales.length === 0 && !credsLoading ? (
            <Text style={styles.hintText}>{t('settings.mir.multi.existingEmpty')}</Text>
          ) : null}
          {credenciales.map((c) => (
            <View key={c.id} style={styles.credRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.unitName} numberOfLines={1}>
                  {c.nombre}
                </Text>
                <Text style={styles.unitMeta} numberOfLines={2}>
                  {c.codigoEstablecimiento} · {c.usuario}
                  {c.hasPassword ? '' : ' · ⚠️'}
                </Text>
              </View>
              <View style={styles.credActions}>
                <Pressable style={styles.credActionBtn} onPress={() => openViewCredential(c)}>
                  <Text style={styles.credActionText}>{t('settings.mir.multi.viewCredential')}</Text>
                </Pressable>
                <Pressable style={styles.credActionBtn} onPress={() => openEditCredential(c)}>
                  <Text style={styles.credActionText}>{t('settings.mir.multi.editCredential')}</Text>
                </Pressable>
                <Pressable
                  style={[styles.credActionBtn, styles.credActionDanger]}
                  onPress={() => confirmDeleteCredential(c)}
                  disabled={deleteCredMutation.isPending}
                >
                  <Text style={[styles.credActionText, styles.credActionDangerText]}>
                    {t('settings.mir.multi.deleteCredential')}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={styles.sectionTitleSmall}>{t('settings.mir.multi.createTitle')}</Text>
          <Field
            label={t('settings.mir.multi.name')}
            value={newCred.nombre}
            onChangeText={(v) => setNewCred((p) => ({ ...p, nombre: v }))}
          />
          <Field
            label={t('settings.mir.multi.user')}
            value={newCred.usuario}
            onChangeText={(v) => setNewCred((p) => ({ ...p, usuario: v }))}
          />
          <Field
            label={t('settings.mir.multi.password')}
            value={newCred.contraseña}
            onChangeText={(v) => setNewCred((p) => ({ ...p, contraseña: v }))}
          />
          <Field
            label={t('settings.mir.multi.landlord')}
            value={newCred.codigoArrendador}
            onChangeText={(v) => setNewCred((p) => ({ ...p, codigoArrendador: v }))}
          />
          <Field
            label={t('settings.mir.multi.establishment')}
            value={newCred.codigoEstablecimiento}
            onChangeText={(v) => setNewCred((p) => ({ ...p, codigoEstablecimiento: v }))}
          />
          <Field
            label={t('settings.mir.multi.baseUrl')}
            value={newCred.baseUrl}
            onChangeText={(v) => setNewCred((p) => ({ ...p, baseUrl: v }))}
          />

          <Pressable
            style={[styles.saveButton, (!canCreateMore || createCredMutation.isPending) && styles.saveButtonDisabled]}
            onPress={() => createCredMutation.mutate()}
            disabled={!canCreateMore || createCredMutation.isPending}
          >
            <Text style={styles.saveText}>
              {createCredMutation.isPending ? t('common.loading') : t('settings.mir.multi.createButton')}
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 14 }}>
          <Text style={styles.sectionTitleSmall}>{t('settings.mir.multi.unitsTitle')}</Text>
          {(credsLoading || unitsLoading) ? <Text style={styles.loading}>{t('common.loading')}</Text> : null}
          {units.map((u) => (
            <View key={u.room_id} style={styles.unitRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.unitName}>{u.room_name}</Text>
                <Text style={styles.unitMeta}>
                  {t('settings.mir.multi.currentType')}: {u.unit_type === 'apartamento' ? t('settings.mir.multi.typeApartment') : t('settings.mir.multi.typeRoom')}
                </Text>
                <Text style={styles.unitMeta}>
                  {t('settings.mir.multi.currentCredential')}:{' '}
                  {u.credencial_id
                    ? credById.get(u.credencial_id)?.nombre || `#${u.credencial_id}`
                    : t('settings.mir.multi.none')}
                </Text>
              </View>
              <View style={{ gap: 8 }}>
                <Pressable style={styles.smallButton} onPress={() => chooseUnitType(u)}>
                  <Text style={styles.smallButtonText}>{t('settings.mir.multi.changeType')}</Text>
                </Pressable>
                <Pressable style={styles.smallButton} onPress={() => chooseCredential(u)}>
                  <Text style={styles.smallButtonText}>{t('settings.mir.multi.assign')}</Text>
                </Pressable>
              </View>
            </View>
          ))}
          {units.length === 0 && !(credsLoading || unitsLoading) ? (
            <Text style={styles.hintText}>{t('settings.mir.multi.noUnits')}</Text>
          ) : null}
        </View>
      </View>

      <Pressable
        style={[styles.saveButton, saveMutation.isPending && styles.saveButtonDisabled]}
        onPress={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
      >
        <Text style={styles.saveText}>{saveMutation.isPending ? t('common.loading') : t('common.save')}</Text>
      </Pressable>

      <Modal visible={editModalCred !== null} animationType="slide" transparent onRequestClose={() => setEditModalCred(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('settings.mir.multi.editingCredentialTitle')}</Text>
            <Text style={styles.hintText}>{t('settings.mir.multi.leavePasswordEmptyHint')}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
              <Field
                label={t('settings.mir.multi.name')}
                value={editDraft.nombre}
                onChangeText={(v) => setEditDraft((p) => ({ ...p, nombre: v }))}
              />
              <Field
                label={t('settings.mir.multi.user')}
                value={editDraft.usuario}
                onChangeText={(v) => setEditDraft((p) => ({ ...p, usuario: v }))}
              />
              <Field
                label={t('settings.mir.multi.password')}
                value={editDraft.contraseña}
                onChangeText={(v) => setEditDraft((p) => ({ ...p, contraseña: v }))}
                secureTextEntry
              />
              <Field
                label={t('settings.mir.multi.landlord')}
                value={editDraft.codigoArrendador}
                onChangeText={(v) => setEditDraft((p) => ({ ...p, codigoArrendador: v }))}
              />
              <Field
                label={t('settings.mir.multi.establishment')}
                value={editDraft.codigoEstablecimiento}
                onChangeText={(v) => setEditDraft((p) => ({ ...p, codigoEstablecimiento: v }))}
              />
              <Field
                label={t('settings.mir.multi.baseUrl')}
                value={editDraft.baseUrl}
                onChangeText={(v) => setEditDraft((p) => ({ ...p, baseUrl: v }))}
              />
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable
                style={[styles.saveButton, { flex: 1 }, patchCredMutation.isPending && styles.saveButtonDisabled]}
                onPress={saveEditCredential}
                disabled={patchCredMutation.isPending}
              >
                <Text style={styles.saveText}>
                  {patchCredMutation.isPending ? t('common.loading') : t('common.save')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.smallButton, { flex: 1, paddingVertical: 14 }]}
                onPress={() => setEditModalCred(null)}
                disabled={patchCredMutation.isPending}
              >
                <Text style={styles.smallButtonText}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  sectionTitleSmall: { fontSize: 14, fontWeight: '900', color: '#111827' },
  hintText: { marginTop: 6, fontSize: 12, color: '#6b7280' },
  warnText: { marginTop: 8, fontSize: 12, color: '#b91c1c', fontWeight: '800' },
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
  unitRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6', flexDirection: 'row', gap: 10 },
  unitName: { fontSize: 14, fontWeight: '900', color: '#111827' },
  unitMeta: { marginTop: 2, fontSize: 12, color: '#6b7280' },
  smallButton: { backgroundColor: '#f3f4f6', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center' },
  smallButtonText: { fontSize: 12, fontWeight: '900', color: '#111827' },
  credRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 8,
  },
  credActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  credActionBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  credActionText: { fontSize: 11, fontWeight: '800', color: '#1d4ed8' },
  credActionDanger: { backgroundColor: '#fef2f2' },
  credActionDangerText: { color: '#b91c1c' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalTitle: { fontSize: 16, fontWeight: '900', color: '#111827', marginBottom: 8 },
});

