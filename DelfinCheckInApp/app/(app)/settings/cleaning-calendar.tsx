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
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Check, Clock, X } from 'lucide-react-native';

import { api } from '@/lib/api';
import { cleanerLimpiezaPageUrl, icalCleaningFeedUrl } from '@/lib/cleaning-public-url';
import { KeyboardAwareFormModal } from '@/components/KeyboardAwareFormModal';
import { t } from '@/lib/i18n';
import { Reservation, getReservationCheckIn, getReservationCheckOut, getReservationStatus } from '@/lib/reservations';

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

type CleaningDraft = {
  room_id: string;
  checkout_time: string;
  checkin_time: string;
  cleaning_duration_minutes: number;
  cleaning_trigger: 'on_checkout' | 'day_before_checkin' | 'both';
  same_day_alert: boolean;
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

type CleaningTask = {
  key: string;
  date: string;
  label: string;
  guestName: string;
};

type PublicCleaningLink = {
  id: string;
  label: string;
  public_token: string;
  room_ids: string[];
  created_at?: string;
};

const DURATIONS = [60, 90, 120, 150, 180, 240] as const;

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseTimeToDate(hhmm: string, fallbackHour: number, fallbackMinute: number): Date {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
  const d = new Date();
  if (m) {
    const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
    const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
    d.setHours(h, min, 0, 0);
  } else {
    d.setHours(fallbackHour, fallbackMinute, 0, 0);
  }
  return d;
}

function formatTimeFromDate(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function defaultDraft(roomId: number, cfg?: CleaningConfig): CleaningDraft {
  return {
    room_id: String(roomId),
    checkout_time: cfg?.checkout_time?.slice(0, 5) || '11:00',
    checkin_time: cfg?.checkin_time?.slice(0, 5) || '16:00',
    cleaning_duration_minutes: cfg?.cleaning_duration_minutes || 120,
    cleaning_trigger: cfg?.cleaning_trigger || 'on_checkout',
    same_day_alert: cfg?.same_day_alert ?? true,
    ical_enabled: cfg?.ical_enabled ?? true,
    cleaner_name: cfg?.cleaner_name || null,
  };
}

function buildTasksForRoom(roomId: number, roomName: string, cfg: CleaningDraft, reservations: Reservation[]): CleaningTask[] {
  const valid = reservations
    .filter((r) => String(r.room_id || '') === String(roomId))
    .filter((r) => !['cancelled', 'canceled'].includes(getReservationStatus(r)))
    .sort((a, b) => {
      const da = new Date(String(getReservationCheckIn(a) || '')).getTime();
      const db = new Date(String(getReservationCheckIn(b) || '')).getTime();
      return da - db;
    });

  const tasks: CleaningTask[] = [];
  for (const r of valid) {
    const guestName = r.guest_name || 'Huésped';
    const checkIn = getReservationCheckIn(r);
    const checkOut = getReservationCheckOut(r);
    if (!checkIn || !checkOut) continue;

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const outYmd = ymdLocal(outDate);

    if (cfg.cleaning_trigger === 'on_checkout' || cfg.cleaning_trigger === 'both') {
      tasks.push({
        key: `co-${r.id}`,
        date: outYmd,
        label: `${roomName} · checkout`,
        guestName,
      });
    }

    if (cfg.cleaning_trigger === 'day_before_checkin' || cfg.cleaning_trigger === 'both') {
      const dayBefore = new Date(inDate.getFullYear(), inDate.getMonth(), inDate.getDate() - 1);
      tasks.push({
        key: `pre-${r.id}`,
        date: ymdLocal(dayBefore),
        label: `${roomName} · pre check-in`,
        guestName,
      });
    }
  }

  return tasks
    .filter((task) => task.date >= ymdLocal(new Date()))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);
}

export default function CleaningCalendarScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [draftByRoom, setDraftByRoom] = useState<Record<number, CleaningDraft>>({});
  const [noteDraft, setNoteDraft] = useState<Record<number, { date: string; text: string }>>({});
  const [publicLinkLabel, setPublicLinkLabel] = useState('');
  const [publicLinkRooms, setPublicLinkRooms] = useState<Set<string>>(new Set());
  const [showPublicLinkModal, setShowPublicLinkModal] = useState(false);
  const [activeTimePick, setActiveTimePick] = useState<'checkout_time' | 'checkin_time' | null>(null);

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

  const { data: reservationsRes, isLoading: reservationsLoading } = useQuery({
    queryKey: ['cleaning-reservations'],
    queryFn: async () => {
      const res = await api.get('/api/reservations');
      return (res.data || []) as Reservation[];
    },
  });

  const { data: publicLinksRes, isLoading: publicLinksLoading } = useQuery({
    queryKey: ['cleaning-public-links'],
    queryFn: async () => {
      const res = await api.get('/api/cleaning/links');
      return res.data as { success?: boolean; links?: PublicCleaningLink[] };
    },
  });

  const configs = configRes?.configs ?? [];
  const notes = notesRes?.notes ?? [];
  const reservations = reservationsRes ?? [];
  const publicLinks = publicLinksRes?.links ?? [];

  const configByRoom = useMemo(() => {
    const m = new Map<string, CleaningConfig>();
    for (const c of configs) m.set(String(c.room_id), c);
    return m;
  }, [configs]);

  function getRoomDraft(room: Room, cfg?: CleaningConfig): CleaningDraft {
    return draftByRoom[room.id] || defaultDraft(room.id, cfg);
  }

  function openRoom(room: Room, cfg?: CleaningConfig) {
    setActiveTimePick(null);
    setExpandedId((prev) => (prev === room.id ? null : room.id));
    setDraftByRoom((prev) => (prev[room.id] ? prev : { ...prev, [room.id]: defaultDraft(room.id, cfg) }));
    setNoteDraft((prev) =>
      prev[room.id]
        ? prev
        : {
            ...prev,
            [room.id]: { date: new Date().toISOString().slice(0, 10), text: '' },
          }
    );
  }

  const saveConfigMutation = useMutation({
    mutationFn: async (draft: CleaningDraft) => {
      const res = await api.put('/api/cleaning/config', draft);
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

  const createPublicLinkMutation = useMutation({
    mutationFn: async () => {
      const label = publicLinkLabel.trim();
      if (!label) throw new Error('name');
      if (publicLinkRooms.size === 0) throw new Error('rooms');
      const res = await api.post('/api/cleaning/links', {
        label,
        room_ids: Array.from(publicLinkRooms),
      });
      return res.data;
    },
    onSuccess: async () => {
      setPublicLinkLabel('');
      setPublicLinkRooms(new Set());
      setShowPublicLinkModal(false);
      await queryClient.invalidateQueries({ queryKey: ['cleaning-public-links'] });
      Alert.alert(t('common.success'), t('settings.cleaning.publicLinksCreated'));
    },
    onError: (e: unknown) => {
      const code = e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : '';
      if (code === 'name') {
        Alert.alert(t('common.error'), t('settings.cleaning.publicLinksNameRequired'));
        return;
      }
      if (code === 'rooms') {
        Alert.alert(t('common.error'), t('settings.cleaning.publicLinksRoomsRequired'));
        return;
      }
      const msg =
        e && typeof e === 'object' && 'response' in e
          ? String((e as { response?: { data?: { error?: string } } }).response?.data?.error || '')
          : '';
      Alert.alert(t('common.error'), msg || t('settings.cleaning.saveError'));
    },
  });

  const regeneratePublicLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/api/cleaning/links/${id}`, { regenerate_token: true });
      return res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cleaning-public-links'] });
      Alert.alert(t('common.success'), t('settings.cleaning.tokenRegenerated'));
    },
    onError: () => Alert.alert(t('common.error'), t('settings.cleaning.saveError')),
  });

  const deletePublicLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/cleaning/links/${id}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cleaning-public-links'] });
    },
    onError: () => Alert.alert(t('common.error'), t('settings.cleaning.saveError')),
  });

  const loading = roomsLoading || configLoading || notesLoading || reservationsLoading;

  function togglePublicLinkRoom(roomId: string) {
    setPublicLinkRooms((prev) => {
      const n = new Set(prev);
      if (n.has(roomId)) n.delete(roomId);
      else n.add(roomId);
      return n;
    });
  }

  function roomNameById(rid: string): string {
    return rooms?.find((r) => String(r.id) === rid)?.name || rid;
  }

  function notesForRoom(roomId: number) {
    return notes.filter((n) => n.room_id === String(roomId));
  }

  function unreadCleanerNoteIds(roomId: number): string[] {
    return notesForRoom(roomId)
      .filter((n) => n.author_type === 'cleaner' && !n.read_at)
      .map((n) => n.id);
  }

  function closePublicLinkModal() {
    setShowPublicLinkModal(false);
  }

  return (
    <>
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

      {!roomsLoading ? (
        <View style={styles.publicLinksCard}>
          <Text style={styles.publicLinksTitle}>{t('settings.cleaning.publicLinksTitle')}</Text>
          <Text style={styles.publicLinksIntro}>{t('settings.cleaning.publicLinksIntro')}</Text>
          <Text style={styles.publicLinksPerRoomHint}>{t('settings.cleaning.perRoomHint')}</Text>
          {publicLinksLoading ? (
            <ActivityIndicator style={{ marginVertical: 12 }} color="#2563eb" />
          ) : (
            <>
              {publicLinks.map((link) => (
                <View key={link.id} style={styles.publicLinkRow}>
                  <Text style={styles.publicLinkLabel}>{link.label}</Text>
                  <Text style={styles.publicLinkRooms}>
                    {link.room_ids.map((rid) => roomNameById(rid)).join(', ')}
                  </Text>
                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={() => {
                      Clipboard.setString(cleanerLimpiezaPageUrl(link.public_token));
                      Alert.alert(t('common.success'), t('settings.cleaning.copy'));
                    }}
                  >
                    <Text style={styles.secondaryBtnText}>{t('settings.cleaning.copy')}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.linkLikeBtn}
                    onPress={() =>
                      Alert.alert(t('settings.cleaning.publicLinksRegenerateConfirm'), '', [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('settings.cleaning.publicLinksRegenerate'),
                          onPress: () => regeneratePublicLinkMutation.mutate(link.id),
                        },
                      ])
                    }
                  >
                    <Text style={styles.linkLikeText}>{t('settings.cleaning.publicLinksRegenerate')}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.linkLikeBtn}
                    onPress={() =>
                      Alert.alert(t('common.delete'), t('settings.cleaning.publicLinksDeleteConfirm'), [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('common.delete'),
                          style: 'destructive',
                          onPress: () => deletePublicLinkMutation.mutate(link.id),
                        },
                      ])
                    }
                  >
                    <Text style={styles.linkLikeDanger}>{t('settings.cleaning.publicLinksDelete')}</Text>
                  </Pressable>
                </View>
              ))}

              {rooms?.length ? (
                <Pressable
                  style={styles.openCreateModalBtn}
                  onPress={() => setShowPublicLinkModal(true)}
                >
                  <Text style={styles.openCreateModalBtnText}>{t('settings.cleaning.publicLinksOpenCreateButton')}</Text>
                </Pressable>
              ) : (
                <Text style={styles.mutedInline}>{t('settings.cleaning.noRooms')}</Text>
              )}
            </>
          )}
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#2563eb" />
      ) : !rooms?.length ? (
        <Text style={styles.muted}>{t('settings.cleaning.noRooms')}</Text>
      ) : (
        rooms.map((room) => {
          const cfg = configByRoom.get(String(room.id));
          const draft = getRoomDraft(room, cfg);
          const expanded = expandedId === room.id;
          const unread = unreadCleanerNoteIds(room.id);
          const tasks = buildTasksForRoom(room.id, room.name, draft, reservations);

          return (
            <View key={room.id} style={styles.card}>
              <Pressable onPress={() => openRoom(room, cfg)} style={styles.cardHead}>
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
                  <Text style={styles.sectionTitle}>{t('settings.cleaning.cleanerScheduleTitle')}</Text>
                  <Text style={styles.scheduleHint}>{t('settings.cleaning.cleanerScheduleSubtitle')}</Text>

                  <Text style={styles.label}>{t('settings.cleaning.checkoutTime')}</Text>
                  <Text style={styles.tapTimeHint}>{t('settings.cleaning.tapToChangeTime')}</Text>
                  <Pressable
                    style={styles.timePickRow}
                    onPress={() => setActiveTimePick('checkout_time')}
                  >
                    <Clock size={18} color="#2563eb" />
                    <Text style={styles.timePickValue}>{draft.checkout_time}</Text>
                  </Pressable>
                  {activeTimePick === 'checkout_time' && expandedId === room.id ? (
                    <View style={styles.inlineTimeBox}>
                      <DateTimePicker
                        value={parseTimeToDate(draft.checkout_time, 11, 0)}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, date) => {
                          if (Platform.OS === 'android') {
                            setActiveTimePick(null);
                            if (event.type === 'dismissed') return;
                            if (
                              (event.type === 'set' || event.type === 'neutralButtonPressed') &&
                              date
                            ) {
                              const hhmm = formatTimeFromDate(date);
                              setDraftByRoom((prev) => {
                                const cur = prev[room.id] ?? defaultDraft(room.id, cfg);
                                return { ...prev, [room.id]: { ...cur, checkout_time: hhmm } };
                              });
                            }
                            return;
                          }
                          if (date) {
                            const hhmm = formatTimeFromDate(date);
                            setDraftByRoom((prev) => {
                              const cur = prev[room.id] ?? defaultDraft(room.id, cfg);
                              return { ...prev, [room.id]: { ...cur, checkout_time: hhmm } };
                            });
                          }
                        }}
                      />
                      {Platform.OS === 'ios' ? (
                        <Pressable style={styles.inlineTimeDone} onPress={() => setActiveTimePick(null)}>
                          <Text style={styles.inlineTimeDoneText}>{t('common.confirm')}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  <Text style={styles.label}>{t('settings.cleaning.checkinTime')}</Text>
                  <Text style={styles.tapTimeHint}>{t('settings.cleaning.tapToChangeTime')}</Text>
                  <Pressable
                    style={styles.timePickRow}
                    onPress={() => setActiveTimePick('checkin_time')}
                  >
                    <Clock size={18} color="#2563eb" />
                    <Text style={styles.timePickValue}>{draft.checkin_time}</Text>
                  </Pressable>
                  {activeTimePick === 'checkin_time' && expandedId === room.id ? (
                    <View style={styles.inlineTimeBox}>
                      <DateTimePicker
                        value={parseTimeToDate(draft.checkin_time, 16, 0)}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, date) => {
                          if (Platform.OS === 'android') {
                            setActiveTimePick(null);
                            if (event.type === 'dismissed') return;
                            if (
                              (event.type === 'set' || event.type === 'neutralButtonPressed') &&
                              date
                            ) {
                              const hhmm = formatTimeFromDate(date);
                              setDraftByRoom((prev) => {
                                const cur = prev[room.id] ?? defaultDraft(room.id, cfg);
                                return { ...prev, [room.id]: { ...cur, checkin_time: hhmm } };
                              });
                            }
                            return;
                          }
                          if (date) {
                            const hhmm = formatTimeFromDate(date);
                            setDraftByRoom((prev) => {
                              const cur = prev[room.id] ?? defaultDraft(room.id, cfg);
                              return { ...prev, [room.id]: { ...cur, checkin_time: hhmm } };
                            });
                          }
                        }}
                      />
                      {Platform.OS === 'ios' ? (
                        <Pressable style={styles.inlineTimeDone} onPress={() => setActiveTimePick(null)}>
                          <Text style={styles.inlineTimeDoneText}>{t('common.confirm')}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ) : null}

                  <Text style={styles.label}>{t('settings.cleaning.duration')}</Text>
                  <View style={styles.chipRow}>
                    {DURATIONS.map((m) => (
                      <Pressable
                        key={m}
                        style={[styles.chip, draft.cleaning_duration_minutes === m && styles.chipOn]}
                        onPress={() =>
                          setDraftByRoom((prev) => ({
                            ...prev,
                            [room.id]: { ...draft, cleaning_duration_minutes: m },
                          }))
                        }
                      >
                        <Text style={[styles.chipText, draft.cleaning_duration_minutes === m && styles.chipTextOn]}>
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
                      style={[styles.opt, draft.cleaning_trigger === val && styles.optOn]}
                      onPress={() =>
                        setDraftByRoom((prev) => ({
                          ...prev,
                          [room.id]: { ...draft, cleaning_trigger: val },
                        }))
                      }
                    >
                      <Text style={[styles.optText, draft.cleaning_trigger === val && styles.optTextOn]}>
                        {label}
                      </Text>
                    </Pressable>
                  ))}

                  <View style={styles.switchRow}>
                    <Text style={styles.labelInline}>{t('settings.cleaning.sameDayAlert')}</Text>
                    <Switch
                      value={draft.same_day_alert}
                      onValueChange={(v) =>
                        setDraftByRoom((prev) => ({ ...prev, [room.id]: { ...draft, same_day_alert: v } }))
                      }
                    />
                  </View>

                  <View style={styles.switchRow}>
                    <Text style={styles.labelInline}>{t('settings.cleaning.calendarEnabled')}</Text>
                    <Switch
                      value={draft.ical_enabled}
                      onValueChange={(v) =>
                        setDraftByRoom((prev) => ({ ...prev, [room.id]: { ...draft, ical_enabled: v } }))
                      }
                    />
                  </View>

                  <Text style={styles.label}>{t('settings.cleaning.cleanerName')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('settings.cleaning.cleanerNamePlaceholder')}
                    value={draft.cleaner_name || ''}
                    onChangeText={(v) =>
                      setDraftByRoom((prev) => ({
                        ...prev,
                        [room.id]: { ...draft, cleaner_name: v || null },
                      }))
                    }
                  />

                  <Pressable
                    style={[styles.primaryBtn, saveConfigMutation.isPending && styles.disabled]}
                    disabled={saveConfigMutation.isPending}
                    onPress={() => saveConfigMutation.mutate(draft)}
                  >
                    <Text style={styles.primaryBtnText}>{t('settings.cleaning.saveCalendar')}</Text>
                  </Pressable>

                  {cfg?.ical_token ? (
                    <>
                      <Text style={styles.label}>{t('settings.cleaning.icalLink')}</Text>
                      <Text selectable style={styles.mono}>
                        {icalCleaningFeedUrl(cfg.ical_token)}
                      </Text>
                      <Pressable
                        style={styles.secondaryBtn}
                        onPress={() => {
                          Clipboard.setString(icalCleaningFeedUrl(cfg.ical_token));
                          Alert.alert(t('common.success'), t('settings.cleaning.copy'));
                        }}
                      >
                        <Text style={styles.secondaryBtnText}>{t('settings.cleaning.copy')}</Text>
                      </Pressable>
                    </>
                  ) : null}

                  <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
                    {t('settings.cleaning.upcomingTasks')}
                  </Text>
                  {tasks.length === 0 ? (
                    <Text style={styles.mutedInline}>{t('settings.cleaning.noUpcomingTasks')}</Text>
                  ) : (
                    tasks.map((task) => (
                      <View key={task.key} style={styles.taskCard}>
                        <Text style={styles.taskDate}>{task.date}</Text>
                        <Text style={styles.taskTitle}>{task.label}</Text>
                        <Text style={styles.taskSub}>{task.guestName}</Text>
                      </View>
                    ))
                  )}

                  {unread.length > 0 ? (
                    <Pressable style={styles.secondaryBtn} onPress={() => markReadMutation.mutate(unread)}>
                      <Text style={styles.secondaryBtnText}>{t('settings.cleaning.markAsRead')}</Text>
                    </Pressable>
                  ) : null}

                  <Text style={[styles.sectionTitle, { marginTop: 18 }]}>
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

                  <Text style={styles.label}>{t('settings.cleaning.cleaningDateLabel', { date: 'YYYY-MM-DD' })}</Text>
                  <TextInput
                    style={styles.input}
                    value={noteDraft[room.id]?.date || new Date().toISOString().slice(0, 10)}
                    onChangeText={(v) =>
                      setNoteDraft((d) => ({
                        ...d,
                        [room.id]: { date: v, text: d[room.id]?.text || '' },
                      }))
                    }
                    placeholder="YYYY-MM-DD"
                  />
                  <TextInput
                    style={[styles.input, { minHeight: 72, marginTop: 8 }]}
                    multiline
                    textAlignVertical="top"
                    value={noteDraft[room.id]?.text || ''}
                    onChangeText={(v) =>
                      setNoteDraft((d) => ({
                        ...d,
                        [room.id]: { date: d[room.id]?.date || new Date().toISOString().slice(0, 10), text: v },
                      }))
                    }
                    placeholder={t('settings.cleaning.newNotePlaceholder')}
                  />
                  <Pressable
                    style={[styles.primaryBtn, addNoteMutation.isPending && styles.disabled]}
                    disabled={addNoteMutation.isPending}
                    onPress={() => {
                      const d = noteDraft[room.id];
                      if (!d?.text?.trim()) return;
                      addNoteMutation.mutate({
                        room_id: String(room.id),
                        cleaning_date: d.date,
                        note: d.text.trim(),
                      });
                    }}
                  >
                    <Text style={styles.primaryBtnText}>{t('settings.cleaning.saveNote')}</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>

    <KeyboardAwareFormModal
      visible={showPublicLinkModal}
      onRequestClose={closePublicLinkModal}
    >
      <View style={styles.modalSheet}>
        <View style={styles.modalHeaderRow}>
          <Text style={styles.modalTitleText}>{t('settings.cleaning.publicLinksCreateModalTitle')}</Text>
          <Pressable
            onPress={closePublicLinkModal}
            style={styles.modalCloseHit}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <X size={22} color="#6b7280" />
          </Pressable>
        </View>
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.stepPill}>1</Text>
          <Text style={styles.modalSectionText}>{t('settings.cleaning.publicLinksPickRooms')}</Text>
          {rooms?.map((room) => {
            const id = String(room.id);
            const on = publicLinkRooms.has(id);
            return (
              <Pressable
                key={room.id}
                style={[styles.roomSelectRow, on && styles.roomSelectRowOn]}
                onPress={() => togglePublicLinkRoom(id)}
              >
                <View style={[styles.roomCheckCircle, on && styles.roomCheckCircleOn]}>
                  {on ? <Check size={16} color="white" strokeWidth={3} /> : null}
                </View>
                <Text style={[styles.roomSelectName, on && styles.roomSelectNameOn]}>{room.name}</Text>
              </Pressable>
            );
          })}
          <Text style={styles.selectedCountText}>
            {t('settings.cleaning.publicLinksSelectedCount', { count: publicLinkRooms.size })}
          </Text>

          <Text style={styles.stepPill}>2</Text>
          <Text style={styles.modalSectionText}>{t('settings.cleaning.publicLinksStepNameTitle')}</Text>
          <TextInput
            style={styles.input}
            value={publicLinkLabel}
            onChangeText={setPublicLinkLabel}
            placeholder={t('settings.cleaning.publicLinksNamePlaceholder')}
          />

          <Pressable
            style={[
              styles.primaryBtn,
              (createPublicLinkMutation.isPending || !publicLinkLabel.trim() || publicLinkRooms.size === 0) &&
                styles.disabled,
            ]}
            disabled={
              createPublicLinkMutation.isPending || !publicLinkLabel.trim() || publicLinkRooms.size === 0
            }
            onPress={() => createPublicLinkMutation.mutate()}
          >
            <Text style={styles.primaryBtnText}>{t('settings.cleaning.publicLinksCreate')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAwareFormModal>
    </>
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
  mutedInline: { marginTop: 8, fontSize: 13, color: '#6b7280' },
  taskCard: {
    padding: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  taskDate: { fontSize: 11, color: '#1d4ed8', fontWeight: '700' },
  taskTitle: { marginTop: 4, fontSize: 14, color: '#111827', fontWeight: '700' },
  taskSub: { marginTop: 2, fontSize: 12, color: '#4b5563' },
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
  disabled: { opacity: 0.6 },
  publicLinksCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  publicLinksTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  publicLinksIntro: { marginTop: 8, fontSize: 13, color: '#4b5563', lineHeight: 18 },
  publicLinksPerRoomHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    lineHeight: 17,
  },
  publicLinkRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  publicLinkLabel: { fontSize: 15, fontWeight: '800', color: '#111827' },
  publicLinkRooms: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  linkLikeBtn: { marginTop: 8, alignSelf: 'flex-start' },
  linkLikeText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  linkLikeDanger: { fontSize: 13, fontWeight: '700', color: '#b91c1c' },
  openCreateModalBtn: {
    marginTop: 14,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  openCreateModalBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },
  modalSheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingBottom: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitleText: { flex: 1, fontSize: 17, fontWeight: '800', color: '#111827', paddingRight: 8 },
  modalCloseHit: { padding: 4 },
  modalScroll: { maxHeight: 480, paddingHorizontal: 18, paddingTop: 12 },
  stepPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#1d4ed8',
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalSectionText: { marginTop: 8, fontSize: 14, fontWeight: '600', color: '#374151', lineHeight: 20 },
  roomSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  roomSelectRowOn: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  roomCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  roomCheckCircleOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  roomSelectName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#374151' },
  roomSelectNameOn: { color: '#1e3a8a' },
  selectedCountText: { marginTop: 12, fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
  scheduleHint: { marginTop: 6, fontSize: 12, color: '#6b7280', lineHeight: 17 },
  tapTimeHint: { fontSize: 11, color: '#9ca3af', marginBottom: 4, marginTop: -4 },
  timePickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  timePickValue: { fontSize: 17, fontWeight: '700', color: '#111827', fontVariant: ['tabular-nums'] },
  inlineTimeBox: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  inlineTimeDone: {
    margin: 12,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  inlineTimeDoneText: { color: 'white', fontWeight: '800', fontSize: 15 },
});
