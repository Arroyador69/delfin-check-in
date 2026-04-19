import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Clipboard,
  Linking,
  RefreshControl,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react-native';

import { api } from '@/lib/api';
import { cleanerLimpiezaPageUrl, getCleaningPublicOrigin, icalCleaningFeedUrl } from '@/lib/cleaning-public-url';
import { KeyboardAwareFormModal } from '@/components/KeyboardAwareFormModal';
import { getLocale, getLocaleTag, t } from '@/lib/i18n';

type Room = { id: string; name: string };

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

type OwnerCleaningTask = {
  id: string;
  type?: string;
  room_id: string;
  room_name?: string;
  date: string;
  start_iso: string;
  end_iso: string;
  summary: string;
  guest_name?: string;
};

type PublicCleaningLink = {
  id: string;
  label: string;
  public_token: string;
  room_ids: string[];
  created_at?: string;
};

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleTimeString(getLocaleTag(), { hour: '2-digit', minute: '2-digit' });
}

/** Misma información que al elegir habitaciones en la web (horario por habitación en cleaning_config). */
function buildRoomScheduleHint(cfg: CleaningConfig | undefined): string {
  const co = cfg?.checkout_time?.slice(0, 5) ?? '11:00';
  const ci = cfg?.checkin_time?.slice(0, 5) ?? '16:00';
  const dur = cfg?.cleaning_duration_minutes ?? 120;
  const tr = cfg?.cleaning_trigger ?? 'on_checkout';
  const triggerLabel =
    tr === 'day_before_checkin'
      ? t('settings.cleaning.triggerDayBefore')
      : tr === 'both'
        ? t('settings.cleaning.triggerBoth')
        : t('settings.cleaning.triggerCheckout');
  return t('settings.cleaning.roomLinkScheduleHint', {
    checkout: co,
    checkin: ci,
    minutes: dur,
    trigger: triggerLabel,
  });
}

export default function CleaningCalendarScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, { date: string; text: string }>>({});
  const [publicLinkLabel, setPublicLinkLabel] = useState('');
  const [publicLinkRooms, setPublicLinkRooms] = useState<Set<string>>(new Set());
  const [showPublicLinkModal, setShowPublicLinkModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const webSettingsUrl = `${getCleaningPublicOrigin()}/${getLocale()}/settings`;

  const openWebSettings = () => {
    Linking.openURL(webSettingsUrl).catch(() => {
      Alert.alert(t('common.error'), t('settings.cleaning.saveError'));
    });
  };

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

  const { data: upcomingRes, isLoading: upcomingLoading } = useQuery({
    queryKey: ['cleaning-upcoming-owner'],
    queryFn: async () => {
      const res = await api.get('/api/cleaning/upcoming-for-owner');
      return res.data as {
        success?: boolean;
        tasks?: OwnerCleaningTask[];
        configured_room_count?: number;
        has_cleaning_links?: boolean;
        linked_room_count?: number;
      };
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
  const publicLinks = publicLinksRes?.links ?? [];
  const upcomingTasks = upcomingRes?.tasks ?? [];
  const configuredRoomCount = upcomingRes?.configured_room_count ?? 0;
  const hasCleaningLinks = upcomingRes?.has_cleaning_links ?? false;

  const configByRoom = useMemo(() => {
    const m = new Map<string, CleaningConfig>();
    for (const c of configs) m.set(String(c.room_id), c);
    return m;
  }, [configs]);

  function openRoom(room: Room) {
    setExpandedId((prev) => (prev === room.id ? null : room.id));
    setNoteDraft((prev) =>
      prev[room.id]
        ? prev
        : {
            ...prev,
            [room.id]: { date: new Date().toISOString().slice(0, 10), text: '' },
          }
    );
  }

  const addNoteMutation = useMutation({
    mutationFn: async (payload: { room_id: string; cleaning_date: string; note: string }) => {
      const res = await api.post('/api/cleaning/notes', payload);
      return res.data;
    },
    onSuccess: async (_, vars) => {
      await queryClient.invalidateQueries({ queryKey: ['cleaning-notes'] });
      await queryClient.invalidateQueries({ queryKey: ['cleaning-upcoming-owner'] });
      setNoteDraft((d) => ({ ...d, [vars.room_id]: { date: vars.cleaning_date, text: '' } }));
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
      await queryClient.invalidateQueries({ queryKey: ['cleaning-upcoming-owner'] });
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
      await queryClient.invalidateQueries({ queryKey: ['cleaning-upcoming-owner'] });
      await queryClient.invalidateQueries({ queryKey: ['cleaning-config'] });
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
      await queryClient.invalidateQueries({ queryKey: ['cleaning-upcoming-owner'] });
    },
    onError: () => Alert.alert(t('common.error'), t('settings.cleaning.saveError')),
  });

  const onPullRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['cleaning-upcoming-owner'] }),
        queryClient.refetchQueries({ queryKey: ['cleaning-public-links'] }),
        queryClient.refetchQueries({ queryKey: ['cleaning-config'] }),
        queryClient.refetchQueries({ queryKey: ['cleaning-notes'] }),
        queryClient.refetchQueries({ queryKey: ['rooms'] }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const listLoading = roomsLoading || notesLoading || configLoading;

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

  function notesForRoom(roomId: string) {
    return notes.filter((n) => n.room_id === String(roomId));
  }

  function unreadCleanerNoteIds(roomId: string): string[] {
    return notesForRoom(roomId)
      .filter((n) => n.author_type === 'cleaner' && !n.read_at)
      .map((n) => n.id);
  }

  function tasksForRoom(roomId: string): OwnerCleaningTask[] {
    return upcomingTasks.filter((task) => String(task.room_id) === String(roomId));
  }

  function closePublicLinkModal() {
    setShowPublicLinkModal(false);
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} />}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>{'\u2039'}</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('settings.cleaning.title')}</Text>
            <Text style={styles.subtitle}>{t('mobile.settings.hubCleaningSubtitle')}</Text>
          </View>
        </View>

        <View style={styles.webBanner}>
          <Text style={styles.webBannerTitle}>{t('settings.cleaning.configureOnWebTitle')}</Text>
          <Text style={styles.webBannerBody}>{t('settings.cleaning.configureOnWebBody')}</Text>
          <Pressable style={styles.webBannerBtn} onPress={openWebSettings}>
            <Text style={styles.webBannerBtnText}>{t('settings.cleaning.openWebSettings')}</Text>
          </Pressable>
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
                  <Pressable style={styles.openCreateModalBtn} onPress={() => setShowPublicLinkModal(true)}>
                    <Text style={styles.openCreateModalBtnText}>
                      {t('settings.cleaning.publicLinksOpenCreateButton')}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={styles.mutedInline}>{t('settings.cleaning.noRooms')}</Text>
                )}
              </>
            )}
          </View>
        ) : null}

        <View style={styles.upcomingCard}>
          <Text style={styles.sectionTitle}>{t('settings.cleaning.upcomingTasks')}</Text>
          <Text style={styles.upcomingIntro}>{t('settings.cleaning.upcomingPreviewIntro')}</Text>
          {upcomingLoading ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color="#2563eb" />
          ) : upcomingTasks.length === 0 ? (
            <Text style={styles.mutedInline}>
              {!hasCleaningLinks
                ? t('settings.cleaning.upcomingNoCleaningLinks')
                : configuredRoomCount === 0
                  ? t('settings.cleaning.upcomingEmptyNeedWeb')
                  : t('settings.cleaning.noUpcomingTasks')}
            </Text>
          ) : (
            upcomingTasks.slice(0, 30).map((task) => {
              const timeRange = t('settings.cleaning.upcomingTimeRange', {
                start: formatTimeShort(task.start_iso),
                end: formatTimeShort(task.end_iso),
              });
              return (
                <View key={task.id} style={styles.taskCard}>
                  <Text style={styles.taskDate}>
                    {task.date} · {timeRange}
                  </Text>
                  <Text style={styles.taskTitle}>{task.summary}</Text>
                  <Text style={styles.taskSub}>
                    {task.room_name || roomNameById(String(task.room_id))}
                    {task.guest_name ? ` · ${task.guest_name}` : ''}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {listLoading ? (
          <ActivityIndicator style={{ marginTop: 24 }} color="#2563eb" />
        ) : !rooms?.length ? (
          <Text style={styles.muted}>{t('settings.cleaning.noRooms')}</Text>
        ) : (
          rooms.map((room) => {
            const cfg = configByRoom.get(String(room.id));
            const expanded = expandedId === room.id;
            const unread = unreadCleanerNoteIds(room.id);
            const roomTasks = tasksForRoom(room.id);

            return (
              <View key={room.id} style={styles.card}>
                <Pressable onPress={() => openRoom(room)} style={styles.cardHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <Text style={styles.status}>
                      {cfg
                        ? cfg.ical_enabled
                          ? t('settings.cleaning.active')
                          : t('settings.cleaning.inactive')
                        : t('settings.cleaning.notConfigured')}
                    </Text>
                    <Text style={styles.scheduleHintCompact} numberOfLines={3}>
                      {buildRoomScheduleHint(cfg)}
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
                    <Text style={styles.mutedInline}>{buildRoomScheduleHint(cfg)}</Text>
                    <Text style={[styles.mutedInline, { marginTop: 6, fontSize: 12 }]}>
                      {t('settings.cleaning.cleanerScheduleSubtitle')}
                    </Text>

                    <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
                      {t('settings.cleaning.upcomingTasks')}
                    </Text>
                    {roomTasks.length === 0 ? (
                      <Text style={styles.mutedInline}>{t('settings.cleaning.noUpcomingTasks')}</Text>
                    ) : (
                      roomTasks.slice(0, 8).map((task) => {
                        const timeRange = t('settings.cleaning.upcomingTimeRange', {
                          start: formatTimeShort(task.start_iso),
                          end: formatTimeShort(task.end_iso),
                        });
                        return (
                          <View key={task.id} style={styles.taskCard}>
                            <Text style={styles.taskDate}>
                              {task.date} · {timeRange}
                            </Text>
                            <Text style={styles.taskTitle}>{task.summary}</Text>
                            {task.guest_name ? <Text style={styles.taskSub}>{task.guest_name}</Text> : null}
                          </View>
                        );
                      })
                    )}

                    <Text style={[styles.mutedInline, { marginTop: 14 }]}>
                      {t('settings.cleaning.roomAdvancedOnWeb')}
                    </Text>
                    <Pressable style={styles.secondaryBtn} onPress={openWebSettings}>
                      <Text style={styles.secondaryBtnText}>{t('settings.cleaning.openWebSettings')}</Text>
                    </Pressable>

                    {cfg?.ical_token ? (
                      <>
                        <Text style={[styles.label, { marginTop: 14 }]}>{t('settings.cleaning.icalLink')}</Text>
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

      <KeyboardAwareFormModal visible={showPublicLinkModal} onRequestClose={closePublicLinkModal}>
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
              const roomCfg = configByRoom.get(id);
              return (
                <Pressable
                  key={room.id}
                  style={[styles.roomSelectRow, on && styles.roomSelectRowOn]}
                  onPress={() => togglePublicLinkRoom(id)}
                >
                  <View style={[styles.roomCheckCircle, on && styles.roomCheckCircleOn]}>
                    {on ? <Check size={16} color="white" strokeWidth={3} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roomSelectName, on && styles.roomSelectNameOn]}>{room.name}</Text>
                    <Text
                      style={[styles.roomSelectSchedule, on && styles.roomSelectScheduleOn]}
                      numberOfLines={3}
                    >
                      {buildRoomScheduleHint(roomCfg)}
                    </Text>
                  </View>
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
  webBanner: {
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  webBannerTitle: { fontSize: 15, fontWeight: '800', color: '#1e3a8a' },
  webBannerBody: { marginTop: 8, fontSize: 13, color: '#374151', lineHeight: 19 },
  webBannerBtn: {
    marginTop: 12,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  webBannerBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },
  upcomingCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  upcomingIntro: { marginTop: 6, fontSize: 12, color: '#6b7280', lineHeight: 17 },
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
  scheduleHintCompact: { marginTop: 4, fontSize: 11, color: '#6b7280', lineHeight: 15 },
  unread: { marginTop: 4, fontSize: 12, color: '#b45309', fontWeight: '700' },
  chev: { fontSize: 18, color: '#9ca3af' },
  cardBody: { paddingHorizontal: 14, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  label: { fontSize: 12, fontWeight: '700', color: '#374151', marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#f9fafb',
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
  roomSelectName: { fontSize: 15, fontWeight: '600', color: '#374151' },
  roomSelectNameOn: { color: '#1e3a8a' },
  roomSelectSchedule: { marginTop: 4, fontSize: 11, color: '#6b7280', lineHeight: 15 },
  roomSelectScheduleOn: { color: '#4b5563' },
  selectedCountText: { marginTop: 12, fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
});
