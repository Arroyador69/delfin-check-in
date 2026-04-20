// =====================================================
// REGISTRO DE COMUNICACIONES — Partes de viajeros (mismo enlace público que la web)
// =====================================================

import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TextInput,
  Pressable,
  Linking,
  Clipboard,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useMemo, useState } from 'react';
import { Search, Calendar, Users, Copy, ExternalLink } from 'lucide-react-native';
import { getLocaleTag, t } from '@/lib/i18n';

interface GuestRegistration {
  id: string;
  reserva_ref?: string;
  fecha_entrada: string;
  fecha_salida: string;
  created_at: string;
  updated_at?: string;
  viajero?: {
    nombre: string;
    apellido1: string;
    apellido2?: string;
    nacionalidad?: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
  };
  contrato?: {
    codigoEstablecimiento?: string;
    referencia?: string;
    numHabitaciones?: number;
    internet?: boolean;
    tipoPago?: string;
  };
  data?: unknown;
}

interface GuestRegistrationStats {
  total_submissions: number;
  submissions_last_7_days: number;
  submissions_last_30_days: number;
}

type MirUnitRow = {
  room_id: string;
  unit_type: 'habitacion' | 'apartamento';
  credencial_id: number | null;
};

type RoomRow = { id: string; name: string };

function trimApiBase(): string {
  return String(api.defaults.baseURL || '').replace(/\/$/, '');
}

function computePublicLinkMode(rooms: RoomRow[], units: MirUnitRow[]): 'empty' | 'single' | 'per-room' {
  if (rooms.length === 0) return 'empty';
  if (units.length === 0) return 'single';
  const map = new Map(units.map((u) => [String(u.room_id), u]));
  for (const r of rooms) {
    if (!map.has(String(r.id))) return 'per-room';
  }
  const configs = rooms.map((r) => map.get(String(r.id))!);
  if (configs.some((c) => c.unit_type === 'apartamento')) return 'per-room';
  const nonNull = configs.map((c) => c.credencial_id).filter((x): x is number => x != null);
  if (new Set(nonNull).size <= 1) return 'single';
  return 'per-room';
}

export default function CommunicationRegistrationScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: tenantPayload } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: async () => {
      const res = await api.get('/api/tenant');
      return res.data as { success?: boolean; tenant?: { id: string } };
    },
  });

  const tenantId = tenantPayload?.tenant?.id;
  const formPublicUrl = useMemo(
    () => (tenantId ? `${trimApiBase()}/api/public/form-redirect/${tenantId}` : ''),
    [tenantId]
  );

  const { data: linkExtras } = useQuery({
    queryKey: ['mir-comunicaciones-public-links', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const [roomsRes, mirRes] = await Promise.all([
        api.get<{ success?: boolean; rooms?: { id: string; name: string }[] }>('/api/tenant/rooms'),
        api.get<{ success?: boolean; units?: MirUnitRow[] }>('/api/ministerio/unidades-config'),
      ]);
      const rooms: RoomRow[] = Array.isArray(roomsRes.data?.rooms)
        ? roomsRes.data.rooms!.map((r: any) => ({
            id: String(r.id),
            name: String(r.name || r.id),
          }))
        : [];
      const mirOk = Boolean(mirRes.data?.success);
      const units: MirUnitRow[] = mirOk && Array.isArray(mirRes.data?.units)
        ? mirRes.data!.units!.map((u: any) => ({
            room_id: String(u.room_id),
            unit_type: u.unit_type === 'apartamento' ? 'apartamento' : 'habitacion',
            credencial_id: u.credencial_id == null ? null : Number(u.credencial_id),
          }))
        : [];
      return { rooms, units, mirOk };
    },
  });

  const linkMode = useMemo(() => {
    if (!tenantId || !linkExtras) return 'loading' as const;
    if (!linkExtras.mirOk) return 'single' as const;
    return computePublicLinkMode(linkExtras.rooms, linkExtras.units);
  }, [tenantId, linkExtras]);

  const openPublicForm = () => {
    if (!formPublicUrl) return;
    Linking.openURL(formPublicUrl).catch(() => {
      Alert.alert(t('common.error'), t('mobile.guestRegistrations.loadError'));
    });
  };

  const copyPublicFormUrl = () => {
    if (!formPublicUrl) return;
    Clipboard.setString(formPublicUrl);
    Alert.alert(t('common.success'), t('guestRegistrations.urlCopied'));
  };

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['guest-registrations', searchTerm],
    queryFn: async () => {
      try {
        const response = await api.get('/api/guest-registrations');

        let registrationsData: GuestRegistration[] = [];

        if (Array.isArray(response.data)) {
          registrationsData = response.data;
        } else if (response.data?.items && Array.isArray(response.data.items)) {
          registrationsData = response.data.items;
        } else if (response.data?.ok && response.data?.items) {
          registrationsData = response.data.items;
        } else {
          registrationsData = [];
        }

        const processedData = registrationsData.map((item: GuestRegistration) => {
          if (item.data && !item.viajero) {
            const raw = item.data as {
              comunicaciones?: Array<{
                personas?: Array<Record<string, string>>;
                contrato?: Record<string, unknown>;
              }>;
              codigoEstablecimiento?: string;
            };
            const comunicacion = raw?.comunicaciones?.[0];
            const persona = comunicacion?.personas?.[0];
            const contrato = comunicacion?.contrato as Record<string, unknown> | undefined;

            return {
              ...item,
              viajero: persona
                ? {
                    nombre: persona.nombre || '',
                    apellido1: persona.apellido1 || '',
                    apellido2: persona.apellido2 || '',
                    nacionalidad: persona.nacionalidad || '',
                    tipoDocumento: persona.tipoDocumento || '',
                    numeroDocumento: persona.numeroDocumento || '',
                  }
                : undefined,
              contrato: contrato
                ? {
                    codigoEstablecimiento:
                      raw?.codigoEstablecimiento ||
                      (contrato.codigoEstablecimiento as string) ||
                      '',
                    referencia: (contrato.referencia as string) || '',
                    numHabitaciones: (contrato.numHabitaciones as number) || 1,
                    internet: (contrato.internet as boolean) || false,
                    tipoPago: ((contrato.pago as { tipoPago?: string })?.tipoPago as string) || '',
                  }
                : item.contrato,
            };
          }
          return item;
        });

        let filtered = processedData;
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          filtered = processedData.filter((item: GuestRegistration) => {
            const nombre = item.viajero?.nombre?.toLowerCase() || '';
            const apellido = item.viajero?.apellido1?.toLowerCase() || '';
            const referencia = item.contrato?.referencia?.toLowerCase() || '';
            const reservaRef = item.reserva_ref?.toLowerCase() || '';
            return (
              nombre.includes(searchLower) ||
              apellido.includes(searchLower) ||
              referencia.includes(searchLower) ||
              reservaRef.includes(searchLower)
            );
          });
        }

        const now = new Date();
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const stats = {
          total_submissions: processedData.length,
          submissions_last_7_days: processedData.filter((item: GuestRegistration) => {
            const created = new Date(item.created_at);
            return created >= last7Days;
          }).length,
          submissions_last_30_days: processedData.filter((item: GuestRegistration) => {
            const created = new Date(item.created_at);
            return created >= last30Days;
          }).length,
        };

        return {
          registrations: filtered,
          stats,
        };
      } catch {
        return {
          registrations: [],
          stats: {
            total_submissions: 0,
            submissions_last_7_days: 0,
            submissions_last_30_days: 0,
          },
        };
      }
    },
  });

  const registrations: GuestRegistration[] = data?.registrations || [];
  const stats: GuestRegistrationStats =
    (data?.stats as GuestRegistrationStats | undefined) ?? {
      total_submissions: 0,
      submissions_last_7_days: 0,
      submissions_last_30_days: 0,
    };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetch(),
      queryClient.invalidateQueries({ queryKey: ['tenant-me'] }),
      tenantId
        ? queryClient.invalidateQueries({ queryKey: ['mir-comunicaciones-public-links', tenantId] })
        : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(getLocaleTag(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDay = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(getLocaleTag(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading && !data) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const showError = error && (!data || registrations.length === 0);

  const listHeader = (
    <>
      <View style={styles.formUrlCard}>
        <Text style={styles.formUrlEmoji}>{'\u{1F517}'}</Text>
        <Text style={styles.formUrlTitle}>{t('guestRegistrations.formUrl')}</Text>
        <Text style={styles.formUrlDescription}>{t('guestRegistrations.formUrlDescription')}</Text>
        {linkMode === 'single' && linkExtras && linkExtras.rooms.length > 0 ? (
          <Text style={styles.formUrlSingleHint}>{t('guestRegistrations.formUrlSingleModeHint')}</Text>
        ) : null}
        {!tenantId ? (
          <ActivityIndicator style={{ marginVertical: 12 }} color="#2563eb" />
        ) : (
          <>
            <Text selectable style={styles.formUrlMono}>
              {formPublicUrl}
            </Text>
            <View style={styles.formUrlActions}>
              <Pressable style={styles.formUrlBtnSecondary} onPress={copyPublicFormUrl}>
                <Copy size={18} color="#2563eb" />
                <Text style={styles.formUrlBtnSecondaryText}>{t('guestRegistrations.copyUrl')}</Text>
              </Pressable>
              <Pressable style={styles.formUrlBtnPrimary} onPress={openPublicForm}>
                <ExternalLink size={18} color="white" />
                <Text style={styles.formUrlBtnPrimaryText}>{t('guestRegistrations.viewForm')}</Text>
              </Pressable>
            </View>
            {linkMode === 'single' && linkExtras && linkExtras.rooms.length > 0 ? (
              <View style={styles.singleUnitsBlock}>
                <Text style={styles.singleUnitsLabel}>{t('guestRegistrations.unitLinksSingleUnitsLabel')}</Text>
                <View style={styles.unitChipsRow}>
                  {linkExtras.rooms.map((r) => (
                    <View key={r.id} style={styles.unitChip}>
                      <Text style={styles.unitChipText}>{r.name}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            {linkMode === 'per-room' && formPublicUrl && linkExtras && linkExtras.rooms.length > 0 ? (
              <View style={styles.perRoomBlock}>
                <Text style={styles.perRoomTitle}>{t('guestRegistrations.unitLinksTitle')}</Text>
                <Text style={styles.perRoomDescription}>{t('guestRegistrations.unitLinksDescription')}</Text>
                {linkExtras.rooms.map((r) => {
                  const url = `${formPublicUrl}?room_id=${encodeURIComponent(r.id)}`;
                  return (
                    <View key={r.id} style={styles.perRoomCard}>
                      <Text style={styles.perRoomName}>{r.name}</Text>
                      <Text selectable style={styles.perRoomMono}>
                        {url}
                      </Text>
                      <View style={styles.perRoomActions}>
                        <Pressable
                          style={[styles.formUrlBtnSecondary, { flex: 1, marginRight: 8 }]}
                          onPress={() => {
                            Clipboard.setString(url);
                            Alert.alert(t('common.success'), t('guestRegistrations.urlCopied'));
                          }}
                        >
                          <Copy size={18} color="#2563eb" />
                          <Text style={styles.formUrlBtnSecondaryText}>{t('guestRegistrations.copyUrl')}</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.formUrlBtnPrimary, { flex: 1 }]}
                          onPress={() => Linking.openURL(url).catch(() => {})}
                        >
                          <ExternalLink size={18} color="white" />
                          <Text style={styles.formUrlBtnPrimaryText}>{t('guestRegistrations.viewForm')}</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('mobile.guestRegistrations.searchPlaceholder')}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.total_submissions || 0}</Text>
          <Text style={styles.statLabel}>{t('mobile.guestRegistrations.statsTotal')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.submissions_last_7_days || 0}</Text>
          <Text style={styles.statLabel}>{t('mobile.guestRegistrations.stats7d')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.submissions_last_30_days || 0}</Text>
          <Text style={styles.statLabel}>{t('mobile.guestRegistrations.stats30d')}</Text>
        </View>
      </View>

      {showError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{t('mobile.guestRegistrations.loadError')}</Text>
          <Pressable style={styles.retryButtonSmall} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>{t('mobile.guestRegistrations.retry')}</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={registrations}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={listHeader}
        renderItem={({ item }) => {
          const nombreCompleto = item.viajero
            ? `${item.viajero.nombre || ''} ${item.viajero.apellido1 || ''} ${item.viajero.apellido2 || ''}`.trim()
            : '';

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>
                  {nombreCompleto || t('mobile.guestRegistrations.itemFallbackName')}
                </Text>
                <Text style={styles.date}>{formatDate(item.created_at)}</Text>
              </View>

              {item.contrato?.referencia ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('mobile.guestRegistrations.reference')}:</Text>
                  <Text style={styles.infoText}>{item.contrato.referencia}</Text>
                </View>
              ) : null}

              {item.reserva_ref ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('mobile.guestRegistrations.reservation')}:</Text>
                  <Text style={styles.infoText}>{item.reserva_ref}</Text>
                </View>
              ) : null}

              <View style={styles.infoRow}>
                <Calendar size={16} color="#6b7280" />
                <Text style={styles.infoText}>
                  {t('mobile.guestRegistrations.entry')}: {formatDay(item.fecha_entrada)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Calendar size={16} color="#6b7280" />
                <Text style={styles.infoText}>
                  {t('mobile.guestRegistrations.exit')}: {formatDay(item.fecha_salida)}
                </Text>
              </View>

              {item.viajero?.nacionalidad ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('mobile.guestRegistrations.nationality')}:</Text>
                  <Text style={styles.infoText}>{item.viajero.nacionalidad}</Text>
                </View>
              ) : null}

              {item.viajero?.numeroDocumento ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('mobile.guestRegistrations.document')}:</Text>
                  <Text style={styles.infoText}>
                    {item.viajero.tipoDocumento || 'NIF'} {item.viajero.numeroDocumento}
                  </Text>
                </View>
              ) : null}

              {item.contrato?.codigoEstablecimiento ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('mobile.guestRegistrations.establishment')}:</Text>
                  <Text style={styles.infoText}>{item.contrato.codigoEstablecimiento}</Text>
                </View>
              ) : null}

              {item.contrato?.numHabitaciones ? (
                <View style={styles.infoRow}>
                  <Users size={16} color="#6b7280" />
                  <Text style={styles.infoText}>
                    {item.contrato.numHabitaciones}{' '}
                    {item.contrato.numHabitaciones > 1
                      ? t('mobile.guestRegistrations.roomsLabelPlural')
                      : t('mobile.guestRegistrations.roomsLabel')}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchTerm ? t('reservations.noResultsTitle') : t('mobile.guestRegistrations.empty')}
            </Text>
            <Text style={styles.emptySubtext}>{t('mobile.guestRegistrations.hint')}</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  formUrlCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  formUrlEmoji: { fontSize: 28, marginBottom: 4 },
  formUrlTitle: { fontSize: 17, fontWeight: '800', color: '#111827' },
  formUrlDescription: { marginTop: 8, fontSize: 13, color: '#4b5563', lineHeight: 19 },
  formUrlSingleHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
    color: '#065f46',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  singleUnitsBlock: { marginTop: 14 },
  singleUnitsLabel: { fontSize: 12, fontWeight: '800', color: '#6b7280', textTransform: 'uppercase' },
  unitChipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  unitChip: {
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  unitChipText: { fontSize: 13, fontWeight: '600', color: '#111827' },
  perRoomBlock: { marginTop: 16 },
  perRoomTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  perRoomDescription: { marginTop: 6, fontSize: 13, color: '#4b5563', lineHeight: 19 },
  perRoomCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fafafa',
  },
  perRoomName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  perRoomMono: { marginTop: 8, fontSize: 11, color: '#0369a1', fontFamily: 'monospace' },
  perRoomActions: { flexDirection: 'row', marginTop: 12 },
  formUrlMono: {
    marginTop: 12,
    fontSize: 11,
    color: '#0369a1',
    fontFamily: 'monospace',
  },
  formUrlActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  formUrlBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  formUrlBtnSecondaryText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  formUrlBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#059669',
  },
  formUrlBtnPrimaryText: { fontSize: 14, fontWeight: '800', color: 'white' },
  searchContainer: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
    marginRight: 8,
    minWidth: 100,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#d1d5db',
    textAlign: 'center',
  },
  retryButtonSmall: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  errorBanner: {
    backgroundColor: '#fef3c7',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  errorBannerText: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 4,
  },
});
