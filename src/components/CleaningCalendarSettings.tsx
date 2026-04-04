'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import {
  Calendar,
  Check,
  Clock,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import CleaningPublicLinksSection from '@/components/CleaningPublicLinksSection';

interface Room {
  id: number;
  name: string;
}

interface CleaningConfig {
  id: string;
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
}

interface CleaningNote {
  id: string;
  room_id: string;
  room_name: string | null;
  cleaning_date: string;
  author_type: 'owner' | 'cleaner';
  note: string;
  read_at: string | null;
  created_at: string;
}

function sortRoomNotes(list: CleaningNote[]): CleaningNote[] {
  return [...list].sort((a, b) => {
    const aUnread = a.author_type === 'cleaner' && !a.read_at;
    const bUnread = b.author_type === 'cleaner' && !b.read_at;
    if (aUnread !== bUnread) return aUnread ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

interface Props {
  rooms: Room[];
  t: (key: string, values?: Record<string, any>) => string;
}

export default function CleaningCalendarSettings({ rooms, t }: Props) {
  const locale = useLocale();
  const [configs, setConfigs] = useState<CleaningConfig[]>([]);
  const [notes, setNotes] = useState<CleaningNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [deleteFlow, setDeleteFlow] = useState<{ noteId: string; step: 1 | 2 } | null>(null);

  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/cleaning/config', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setConfigs(data.configs);
    } catch (err) {
      console.error('Error loading cleaning configs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNotes = useCallback(async () => {
    try {
      const res = await fetch('/api/cleaning/notes?limit=100', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setNotes(data.notes);
    } catch (err) {
      console.error('Error loading cleaning notes:', err);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
    loadNotes();
  }, [loadConfigs, loadNotes]);

  const getConfigForRoom = (roomId: number): CleaningConfig | undefined => {
    return configs.find(c => c.room_id === String(roomId));
  };

  const saveConfig = async (roomId: number, updates: Partial<CleaningConfig>) => {
    setSaving(String(roomId));
    try {
      const existing = getConfigForRoom(roomId);
      const body = {
        room_id: String(roomId),
        checkout_time: existing?.checkout_time?.slice(0, 5) || '11:00',
        checkin_time: existing?.checkin_time?.slice(0, 5) || '16:00',
        cleaning_duration_minutes: existing?.cleaning_duration_minutes || 120,
        cleaning_trigger: existing?.cleaning_trigger || 'on_checkout',
        same_day_alert: existing?.same_day_alert ?? true,
        ical_enabled: existing?.ical_enabled ?? true,
        cleaner_name: existing?.cleaner_name || null,
        ...updates,
      };

      const res = await fetch('/api/cleaning/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        await loadConfigs();
        setMessage({ type: 'success', text: t('cleaning.saved') });
      } else {
        setMessage({ type: 'error', text: data.error || t('cleaning.saveError') });
      }
    } catch {
      setMessage({ type: 'error', text: t('cleaning.saveError') });
    } finally {
      setSaving(null);
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }
  };

  const markNotesRead = async (noteIds: string[]) => {
    try {
      await fetch('/api/cleaning/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note_ids: noteIds }),
      });
      await loadNotes();
    } catch {}
  };

  const deleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/cleaning/notes?id=${encodeURIComponent(noteId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setDeleteFlow(null);
        setMessage({ type: 'success', text: t('cleaning.noteDeleted') });
        await loadNotes();
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
      } else {
        setMessage({ type: 'error', text: t('cleaning.noteDeleteError') });
        setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      }
    } catch {
      setMessage({ type: 'error', text: t('cleaning.noteDeleteError') });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const unreadByRoom = (roomId: string) =>
    notes.filter(n => n.room_id === roomId && n.author_type === 'cleaner' && !n.read_at);

  const notesForRoom = (roomId: string) =>
    sortRoomNotes(notes.filter(n => n.room_id === roomId));

  if (loading) {
    return (
      <div className="bg-white shadow-xl rounded-xl border border-blue-200 p-8 text-center">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
        <p className="text-gray-500">{t('cleaning.loading')}</p>
      </div>
    );
  }

  return (
    <>
    <div className="bg-white shadow-xl rounded-xl border border-blue-200 p-4 sm:p-8">
      <h4 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 flex items-center">
        <span className="text-xl sm:text-2xl mr-2 sm:mr-3" style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>🧹</span>
        {t('cleaning.title')}
      </h4>
      <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">{t('cleaning.description')}</p>

      <CleaningPublicLinksSection rooms={rooms} t={t} />

      <p className="text-xs text-gray-500 mb-4 border-t border-gray-100 pt-4">{t('cleaning.perRoomHint')}</p>

      {message.text && (
        <div className={`p-3 rounded-xl mb-4 text-sm font-medium ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {rooms.map(room => {
          const config = getConfigForRoom(room.id);
          const isExpanded = expandedRoom === String(room.id);
          const unread = unreadByRoom(String(room.id));
          const roomNotesList = notesForRoom(String(room.id));

          return (
            <div key={room.id} className="border-2 border-gray-200 rounded-xl overflow-hidden transition-all hover:border-blue-300">
              {/* Header */}
              <button
                onClick={() => setExpandedRoom(isExpanded ? null : String(room.id))}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 hover:from-blue-50 hover:to-indigo-50 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-800">{room.name}</p>
                    <p className="text-xs text-gray-500">
                      {config ? (
                        <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${config.ical_enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {config.ical_enabled ? t('cleaning.active') : t('cleaning.inactive')}
                          {config.cleaner_name && ` · ${config.cleaner_name}`}
                        </span>
                      ) : t('cleaning.notConfigured')}
                    </p>
                  </div>
                  {unread.length > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {unread.length}
                    </span>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="p-4 sm:p-6 space-y-5 border-t border-gray-200">
                  {/* Notas de limpieza (historial por habitación) */}
                  {roomNotesList.length > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <h5 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-slate-600" />
                        {t('cleaning.notesSectionTitle')}
                        {unread.length > 0 && (
                          <span className="text-xs font-normal text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            {t('cleaning.unreadNotes', { count: unread.length })}
                          </span>
                        )}
                      </h5>
                      <div className="space-y-3">
                        {roomNotesList.map(n => {
                          const isCleaner = n.author_type === 'cleaner';
                          const isPending = isCleaner && !n.read_at;
                          return (
                            <div
                              key={n.id}
                              className={`rounded-lg p-3 border ${
                                isPending
                                  ? 'bg-amber-50/80 border-amber-200'
                                  : 'bg-white border-slate-100'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                <span
                                  className={`text-xs font-semibold uppercase tracking-wide ${
                                    isCleaner ? 'text-emerald-700' : 'text-blue-700'
                                  }`}
                                >
                                  {isCleaner ? t('cleaning.authorCleaner') : t('cleaning.authorOwner')}
                                </span>
                                {isCleaner && (
                                  <span
                                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                      isPending
                                        ? 'bg-amber-200 text-amber-900'
                                        : 'bg-emerald-100 text-emerald-800'
                                    }`}
                                  >
                                    {isPending ? t('cleaning.noteStatusPending') : t('cleaning.noteStatusDone')}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{n.note}</p>
                              <p className="text-xs text-gray-500 mt-2">
                                {t('cleaning.cleaningDateLabel', {
                                  date: new Date(n.cleaning_date + 'T12:00:00').toLocaleDateString(locale, {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                  }),
                                })}{' '}
                                · {t('cleaning.sentAt', {
                                  date: new Date(n.created_at).toLocaleString(locale, {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }),
                                })}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {isCleaner && isPending && (
                                  <button
                                    type="button"
                                    onClick={() => markNotesRead([n.id])}
                                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    {t('cleaning.markDone')}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setDeleteFlow({ noteId: n.id, step: 1 })}
                                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-700 bg-white hover:bg-red-50"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  {t('cleaning.deleteNote')}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {unread.length > 1 && (
                        <button
                          type="button"
                          onClick={() => markNotesRead(unread.map(n => n.id))}
                          className="text-sm text-slate-600 hover:text-slate-900 font-medium mt-3 underline-offset-2 hover:underline"
                        >
                          {t('cleaning.markAllDone')}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Horarios */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {t('cleaning.checkoutTime')}
                      </label>
                      <input
                        type="time"
                        value={config?.checkout_time?.slice(0, 5) || '11:00'}
                        onChange={e => saveConfig(room.id, { checkout_time: e.target.value })}
                        className="w-full border-2 border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Clock className="w-4 h-4 inline mr-1" />
                        {t('cleaning.checkinTime')}
                      </label>
                      <input
                        type="time"
                        value={config?.checkin_time?.slice(0, 5) || '16:00'}
                        onChange={e => saveConfig(room.id, { checkin_time: e.target.value })}
                        className="w-full border-2 border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('cleaning.duration')}
                      </label>
                      <select
                        value={config?.cleaning_duration_minutes || 120}
                        onChange={e => saveConfig(room.id, { cleaning_duration_minutes: parseInt(e.target.value) })}
                        className="w-full border-2 border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={60}>1h</option>
                        <option value={90}>1h 30min</option>
                        <option value={120}>2h</option>
                        <option value={150}>2h 30min</option>
                        <option value={180}>3h</option>
                        <option value={240}>4h</option>
                      </select>
                    </div>
                  </div>

                  {/* Trigger y alertas */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('cleaning.whenToClean')}
                      </label>
                      <select
                        value={config?.cleaning_trigger || 'on_checkout'}
                        onChange={e => saveConfig(room.id, { cleaning_trigger: e.target.value as any })}
                        className="w-full border-2 border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="on_checkout">{t('cleaning.triggerCheckout')}</option>
                        <option value="day_before_checkin">{t('cleaning.triggerDayBefore')}</option>
                        <option value="both">{t('cleaning.triggerBoth')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('cleaning.cleanerName')}
                      </label>
                      <input
                        type="text"
                        value={config?.cleaner_name || ''}
                        onChange={e => {
                          const existing = getConfigForRoom(room.id);
                          if (existing) {
                            setConfigs(prev => prev.map(c =>
                              c.room_id === String(room.id) ? { ...c, cleaner_name: e.target.value } : c
                            ));
                          }
                        }}
                        onBlur={e => saveConfig(room.id, { cleaner_name: e.target.value || null })}
                        placeholder={t('cleaning.cleanerNamePlaceholder')}
                        className="w-full border-2 border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config?.same_day_alert ?? true}
                        onChange={e => saveConfig(room.id, { same_day_alert: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{t('cleaning.sameDayAlert')}</span>
                    </label>
                  </div>

                  {/* Quick setup si no hay config */}
                  {!config && (
                    <button
                      onClick={() => saveConfig(room.id, {})}
                      disabled={saving === String(room.id)}
                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50"
                    >
                      {saving === String(room.id) ? t('cleaning.activating') : t('cleaning.activate')}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {rooms.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>{t('cleaning.noRooms')}</p>
        </div>
      )}
    </div>

    {deleteFlow && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cleaning-delete-title"
      >
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200">
          {deleteFlow.step === 1 ? (
            <>
              <h3 id="cleaning-delete-title" className="text-lg font-semibold text-gray-900 mb-2">
                {t('cleaning.deleteStep1Title')}
              </h3>
              <p className="text-sm text-gray-600 mb-6">{t('cleaning.deleteStep1Body')}</p>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteFlow(null)}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                >
                  {t('cleaning.deleteCancel')}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteFlow({ noteId: deleteFlow.noteId, step: 2 })}
                  className="px-4 py-2.5 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800"
                >
                  {t('cleaning.deleteContinue')}
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                {t('cleaning.deleteStep2Title')}
              </h3>
              <p className="text-sm text-gray-600 mb-6">{t('cleaning.deleteStep2Body')}</p>
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteFlow({ noteId: deleteFlow.noteId, step: 1 })}
                  className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                >
                  {t('cleaning.deleteBack')}
                </button>
                <button
                  type="button"
                  onClick={() => deleteNote(deleteFlow.noteId)}
                  className="px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700"
                >
                  {t('cleaning.deleteFinal')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}
    </>
  );
}
