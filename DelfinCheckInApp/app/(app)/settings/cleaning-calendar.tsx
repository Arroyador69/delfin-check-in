import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { api } from '@/lib/api';
import { t } from '@/lib/i18n';

type Room = { id: number; name: string };

type CleaningConfig = {
  room_id: string;
  room_name: string | null;
  checkout_time: string;
  checkin_time: string;
  cleaning_duration_minutes: number;
  cleaning_trigger: 'on_checkout' | 'day_before_checkin' | 'both';
  same_day_alert: boolean;
  ical_token: string;
  ical_enabled: boolean;
  cleaner_name: string | null;
};

type CleaningNote = {
  id: string;
  room_id: string;
  room_name: string | null;
  cleaning_date: string;
  author_type: 'owner' | 'cleaner';
  note: string;
  read_at: string | null;
  created_at: string;
};

const DURATIONS = [60, 90, 120, 150, 180, 240] as const;

function icalFeedUrl(token: string): string {
  const base = String(api.defaults.baseURL || '').replace(/\/$/, '');
  return `${base}/api/ical/cleaning/${token}`;
}

export default function CleaningCalendarScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<number, { date: string; text: string }>>({});

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      const res = await api.get('/api/tenant/rooms');
      return (res.data?.rooms || []) as Room[];
    },
  });

  const { data: configRes, isLoading: configLoading } = useQuery({
    queryKey: ['cleaning-config'],
    queryFn: async () => {
      const res = await api.get('/api/cleaning/config');
      return res.data as { success?: boolean; configs?: CleaningConfig[] };
    },
  });

  const { data: notesRes, isLoading: notesLoading } = useQuery({
    queryKey: ['cleaning-notes'],
    queryFn: async () => {
      const res = await api.get('/api/cleaning/notes?limit=80');
      return res.data as { success?: boolean; notes?: CleaningNote[] };
    },
  });

  const configs = configRes?.configs ?? [];
  const notes = notesRes?.notes ?? [];

  const configByRoom = useMemo(() => {
    const m = new Map<string, CleaningConfig>();
    for (const c of configs) m.set(String(c.room_id), c);
    return m;
  }, [configs]);

  const saveMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.put('/api/cleaning/config', body);
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cleaning-config'] });
      Alert.alert(t('common.success'), t('settings.cleaning.saved'));
    },
    onError: (e: unknown) => {
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error || '')
          : '';
      Alert.alert(t('common.error'), msg || t('settings.cleaning.saveError'));
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (payload: { room_id: string; cleaning_date: string; note: string }) => {
      const res = await api.post('/api/cleaning/notes', payload);
      return res.data;
    },
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['cleaning-notes'] });
      const rid = Number(vars.room_id);
      setNoteDraft((d) => ({ ...d, [rid]: { date: vars.cleaning_date, text: '' } }));
      Alert.alert(t('common.success'), t('settings.cleaning.saved'));
    },
    onError: () => Alert.alert(t('common.error'), t('settings.cleaning.saveError')),
  });

  const markReadMutation = useMutation({
    mutationFn: async (noteIds: string[]) => {
      await api.patch('/api/cleaning/notes', { note_ids: noteIds });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cleaning-notes'] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/cleaning/notes?id=${encodeURIComponent(id)}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cleaning-notes'] });
    },
  });

  const loading = roomsLoading || configLoading || notesLoading;

  function getDraft(roomId: number) {
    return (
      noteDraft[roomId] || {
        date: new Date().toISOString().slice(0, 10),
        text: '',
      }
    );
  }

  function notesForRoom(roomId: number) {
    const id = String(roomId);
    return notes.filter((n) => n.room_id === id);
  }

  function unreadCleanerNoteIds(roomId: number): string[] {
    return notesForRoom(roomId)
      .filter((n) => n.author_type === 'cleaner' && !n.read_at)
      .map((n) => n.id);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>{'\u2039'}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('settings.cleaning.title')}</Text>
          <Text style={styles.subtitle}>{t('mobile.settings.hubCleaningSubtitle')}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#2563eb" />
      ) : !rooms?.length ? (
        <Text style={styles.muted}>{t('settings.cleaning.noRooms')}</Text>
      ) : (
        rooms.map((room) => {
          const cfg = configByRoom.get(String(room.id));
          const expanded = expandedId === room.id;
          const unread = unreadCleanerNoteIds(room.id);

          return (
            <View key={room.id} style={styles.card}>
              <Pressable onPress={() => setExpandedId(expanded ? null : room.id)} style={styles.cardHead}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.roomName}>{room.name}</Text>
                  <Text style={styles.status}>
                    {cfg
                      ? cfg.ical_enabled
                        ? t('settings.cleaning.active')
                        : t('settings.cleaning.inactive')
                      : t('settings.cleaning.notConfigured')}
                  </Text>
                  {unread.length > 0 ? (
                    <Text style={styles.unread}>
                      {t('settings.cleaning.unreadNotes', { count: unread.length })}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.chev}>{expanded ? '\u25BC' : '\u25B6'}</Text>
              </Pressable>

              {expanded ? (
                <View style={styles.cardBody}>
                  {!cfg ? (
                    <Pressable
                      style={styles.primaryBtn}
                      onPress={() =>
                        saveMutation.mutate({
                          room_id: String(room.id),
                          checkout_time: '11:00',
                          checkin_time: '16:00',
                          cleaning_duration_minutes: 120,
                          cleaning_trigger: 'on_checkout',
                          same_day_alert: true,
                          ical_enabled: true,
                          cleaner_name: null,
                        })
                      }
                    >
                      <Text style={styles.primaryBtnText}>{t('settings.cleaning.activate')}</Text>
                    </Pressable>
                  ) : (
                    <>
                      <Text style={styles.label}>{t('settings.cleaning.checkoutTime')}</Text>
                      <TextInput
                        key={`co-${room.id}-${cfg.checkout_time}`}
                        style={styles.input}
                        defaultValue={cfg.checkout_time?.slice(0, 5) || '11:00'}
                        onEndEditing={(e) =>
                          saveMutation.mutate({
                            room_id: String(room.id),
                            checkout_time: e.nativeEvent.text || '11:00',
                            checkin_time: cfg.checkin_time?.slice(0, 5) || '16:00',
                            cleaning_duration_minutes: cfg.cleaning_duration_minutes,
                            cleaning_trigger: cfg.cleaning_trigger,
                            same_day_alert: cfg.same_day_alert,
                            ical_enabled: cfg.ical_enabled,
                            cleaner_name: cfg.cleaner_name,
                          })
                        }
                      />
                      <Text style={styles.label}>{t('settings.cleaning.checkinTime')}</Text>
                      <TextInput
                        key={`ci-${room.id}-${cfg.checkin_time}`}
                        style={styles.input}
                        defaultValue={cfg.checkin_time?.slice(0, 5) || '16:00'}
                        onEndEditing={(e) =>
                          saveMutation.mutate({
                            room_id: String(room.id),
                            checkout_time: cfg.checkout_time?.slice(0, 5) || '11:00',
                            checkin_time: e.nativeEvent.text || '16:00',
                            cleaning_duration_minutes: cfg.cleaning_duration_minutes,
                            cleaning_trigger: cfg.cleaning_trigger,
                            same_day_alert: cfg.same_day_alert,
                            ical_enabled: cfg.ical_enabled,
                            cleaner_name: cfg.cleaner_name,
                          })
                        }
                      />

                      <Text style={styles.label}>{t('settings.cleaning.duration')}</Text>
                      <View style={styles.chipRow}>
                        {DURATIONS.map((m) => (
                          <Pressable
                            key={m}
                            style={[styles.chip, cfg.cleaning_duration_minutes === m && styles.chipOn]}
                            onPress={() =>
                              saveMutation.mutate({
                                room_id: String(room.id),
                                checkout_time: cfg.checkout_time?.slice(0, 5) || '11:00',
                                checkin_time: cfg.checkin_time?.slice(0, 5) || '16:00',
                                cleaning_duration_minutes: m,
                                cleaning_trigger: cfg.cleaning_trigger,
                                same_day_alert: cfg.same_day_alert,
                                ical_enabled: cfg.ical_enabled,
                                cleaner_name: cfg.cleaner_name,
                              })
                            }
                          >
                            <Text style={[styles.chipText, cfg.cleaning_duration_minutes === m && styles.chipTextOn]}>
                              {m >= 60 ? `${m / 60}h` : `${m}m`}
                            </Text>
                          </Pressable>
                        ))}
                      </View>

                      <Text style={styles.label}>{t('settings.cleaning.whenToClean')}</Text>
                      {(
                        [
                          ['on_checkout', t('settings.cleaning.triggerCheckout')],
                          ['day_before_checkin', t('settings.cleaning.triggerDayBefore')],
                          ['both', t('settings.cleaning.triggerBoth')],
                        ] as const
                      ).map(([val, label]) => (
                        <Pressable
                          key={val}
                          style={[styles.opt, cfg.cleaning_trigger === val && styles.optOn]}
                          onPress={() =>
                            saveMutation.mutate({
                              room_id: String(room.id),
                              checkout_time: cfg.checkout_time?.slice(0, 5) || '11:00',
                              checkin_time: cfg.checkin_time?.slice(0, 5) || '16:00',
                              cleaning_duration_minutes: cfg.cleaning_duration_minutes,
                              cleaning_trigger: val,
                              same_day_alert: cfg.same_day_alert,
                              ical_enabled: cfg.ical_enabled,
                              cleaner_name: cfg.cleaner_name,
                            })
                          }
                        >
                          <Text style={[styles.optText, cfg.cleaning_trigger === val && styles.optTextOn]}>
                            {label}
                          </Text>
                        </Pressable>
                      ))}

                      <View style={styles.switchRow}>
                        <Text style={styles.labelInline}>{t('settings.cleaning.sameDayAlert')}</Text>
                        <Switch
                          value={cfg.same_day_alert}
                          onValueChange={(v) =>
                            saveMutation.mutate({
                              room_id: String(room.id),
                              checkout_time: cfg.checkout_time?.slice(0, 5) || '11:00',
                              checkin_time: cfg.checkin_time?.slice(0, 5) || '16:00',
                              cleaning_duration_minutes: cfg.cleaning_duration_minutes,
                              cleaning_trigger: cfg.cleaning_trigger,
                              same_day_alert: v,
                              ical_enabled: cfg.ical_enabled,
                              cleaner_name: cfg.cleaner_name,
                            })
                          }
                        />
                      </View>
                      <View style={styles.switchRow}>
                        <Text style={styles.labelInline}>{t('settings.cleaning.calendarEnabled')}</Text>
                        <Switch
                          value={cfg.ical_enabled}
                          onValueChange={(v) =>
                            saveMutation.mutate({
                              room_id: String(room.id),
                              checkout_time: cfg.checkout_time?.slice(0, 5) || '11:00',
                              checkin_time: cfg.checkin_time?.slice(0, 5) || '16:00',
                              cleaning_duration_minutes: cfg.cleaning_duration_minutes,
                              cleaning_trigger: cfg.cleaning_trigger,
                              same_day_alert: cfg.same_day_alert,
                              ical_enabled: v,
                              cleaner_name: cfg.cleaner_name,
                            })
                          }
                        />
                      </View>

                      <Text style={styles.label}>{t('settings.cleaning.cleanerName')}</Text>
                      <TextInput
                        key={`cl-${room.id}-${cfg.cleaner_name || ''}`}
                        style={styles.input}
                        placeholder={t('settings.cleaning.cleanerNamePlaceholder')}
                        defaultValue={cfg.cleaner_name || ''}
                        onEndEditing={(e) =>
                          saveMutation.mutate({
                            room_id: String(room.id),
                            checkout_time: cfg.checkout_time?.slice(0, 5) || '11:00',
                            checkin_time: cfg.checkin_time?.slice(0, 5) || '16:00',
                            cleaning_duration_minutes: cfg.cleaning_duration_minutes,
                            cleaning_trigger: cfg.cleaning_trigger,
                            same_day_alert: cfg.same_day_alert,
                            ical_enabled: cfg.ical_enabled,
                            cleaner_name: e.nativeEvent.text?.trim() || null,
                          })
                        }
                      />

                      <Text style={styles.label}>{t('settings.cleaning.icalLink')}</Text>
                      <Text selectable style={styles.mono}>
                        {icalFeedUrl(cfg.ical_token)}
                      </Text>
                      <Pressable
                        style={styles.secondaryBtn}
                        onPress={() => {
                          Clipboard.setString(icalFeedUrl(cfg.ical_token));
                          Alert.alert(t('common.success'), t('settings.cleaning.copy'));
                        }}
                      >
                        <Text style={styles.secondaryBtnText}>{t('settings.cleaning.copy')}</Text>
                      </Pressable>

                      {unread.length > 0 ? (
                        <Pressable
                          style={[styles.secondaryBtn, { marginTop: 8 }]}
                          onPress={() => markReadMutation.mutate(unread)}
                        >
                          <Text style={styles.secondaryBtnText}>{t('settings.cleaning.markAsRead')}</Text>
                        </Pressable>
                      ) : null}

                      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
                        {t('settings.cleaning.notesSectionTitle')}
                      </Text>
                      {notesForRoom(room.id)
                        .slice(0, 12)
                        .map((n) => (
                          <View key={n.id} style={styles.noteCard}>
                            <Text style={styles.noteMeta}>
                              {n.author_type === 'cleaner'
                                ? t('settings.cleaning.authorCleaner')
                                : t('settings.cleaning.authorOwner')}{' '}
                              · {n.cleaning_date}
                            </Text>
                            <Text style={styles.noteBody}>{n.note}</Text>
                            <Pressable
                              onPress={() =>
                                Alert.alert(t('settings.cleaning.deleteStep1Title'), '', [
                                  { text: t('common.cancel'), style: 'cancel' },
                                  {
                                    text: t('common.delete'),
                                    style: 'destructive',
                                    onPress: () => deleteNoteMutation.mutate(n.id),
                                  },
                                ])
                              }
                            >
                              <Text style={styles.link}>{t('settings.cleaning.deleteNote')}</Text>
                            </Pressable>
                          </View>
                        ))}

                      <Text style={styles.label}>{t('settings.cleaning.notesSectionTitle')} (nueva)</Text>
                      <TextInput
                        style={styles.input}
                        value={getDraft(room.id).date}
                        onChangeText={(v) => setNoteDraft((d) => ({ ...d, [room.id]: { ...getDraft(room.id), date: v } }))}
                        placeholder="YYYY-MM-DD"
                      />
                      <TextInput
                        style={[styles.input, { minHeight: 72, marginTop: 8 }]}
                        multiline
                        textAlignVertical="top"
                        value={getDraft(room.id).text}
                        onChangeText={(v) => setNoteDraft((d) => ({ ...d, [room.id]: { ...getDraft(room.id), text: v } }))}
                      />
                      <Pressable
                        style={styles.primaryBtn}
                        onPress={() => {
                          const d = getDraft(room.id);
                          if (!d.text.trim()) return;
                          addNoteMutation.mutate({
                            room_id: String(room.id),
                            cleaning_date: d.date,
                            note: d.text.trim(),
                          });
                        }}
                      >
                        <Text style={styles.primaryBtnText}>{t('common.save')}</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { flexDirection: 'row', gap: 10, marginBottom: 12 },
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
  muted: { textAlign: 'center', color: '#6b7280', marginTop: 24 },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  roomName: { fontSize: 16, fontWeight: '800', color: '#111827' },
  status: { marginTop: 4, fontSize: 12, color: '#6b7280', fontWeight: '600' },
  unread: { marginTop: 4, fontSize: 12, color: '#b45309', fontWeight: '700' },
  chev: { fontSize: 18, color: '#9ca3af' },
  cardBody: { paddingHorizontal: 14, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 10, marginBottom: 6 },
  labelInline: { fontSize: 14, fontWeight: '700', color: '#374151' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f9fafb',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  chipOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#4b5563' },
  chipTextOn: { color: 'white' },
  opt: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  optOn: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  optText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  optTextOn: { color: '#1d4ed8' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  mono: { fontSize: 11, color: '#0369a1', marginBottom: 8 },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: 'white', fontWeight: '800' },
  secondaryBtn: {
    marginTop: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#2563eb', fontWeight: '800' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827' },
  noteCard: {
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  noteMeta: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  noteBody: { marginTop: 6, fontSize: 14, color: '#111827' },
  link: { marginTop: 8, color: '#dc2626', fontWeight: '700', fontSize: 13 },
});
