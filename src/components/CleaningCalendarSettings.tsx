'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Copy, RefreshCw, Check, Clock, ChevronDown, ChevronUp, MessageSquare, ExternalLink } from 'lucide-react';

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

interface Props {
  rooms: Room[];
  t: (key: string, values?: Record<string, any>) => string;
}

export default function CleaningCalendarSettings({ rooms, t }: Props) {
  const [configs, setConfigs] = useState<CleaningConfig[]>([]);
  const [notes, setNotes] = useState<CleaningNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://admin.delfincheckin.com';

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
      const res = await fetch('/api/cleaning/notes?unread=true&limit=20', { credentials: 'include' });
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

  const regenerateToken = async (roomId: number) => {
    if (!confirm(t('cleaning.regenerateConfirm'))) return;
    try {
      const res = await fetch('/api/cleaning/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ room_id: String(roomId) }),
      });
      const data = await res.json();
      if (data.success) {
        await loadConfigs();
        setMessage({ type: 'success', text: t('cleaning.tokenRegenerated') });
      }
    } catch {
      setMessage({ type: 'error', text: t('cleaning.saveError') });
    }
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const copyLink = (token: string) => {
    const url = `${baseUrl}/api/ical/cleaning/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const markNotesRead = async (noteIds: string[]) => {
    try {
      await fetch('/api/cleaning/notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ note_ids: noteIds }),
      });
      setNotes(prev => prev.filter(n => !noteIds.includes(n.id)));
    } catch {}
  };

  const unreadByRoom = (roomId: string) =>
    notes.filter(n => n.room_id === roomId && n.author_type === 'cleaner' && !n.read_at);

  if (loading) {
    return (
      <div className="bg-white shadow-xl rounded-xl border border-blue-200 p-8 text-center">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
        <p className="text-gray-500">{t('cleaning.loading')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-xl rounded-xl border border-blue-200 p-4 sm:p-8">
      <h4 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1 flex items-center">
        <span className="text-xl sm:text-2xl mr-2 sm:mr-3" style={{ fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif' }}>🧹</span>
        {t('cleaning.title')}
      </h4>
      <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">{t('cleaning.description')}</p>

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
          const icalUrl = config ? `${baseUrl}/api/ical/cleaning/${config.ical_token}` : null;

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
                  {/* Notas sin leer de la limpiadora */}
                  {unread.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <h5 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        {t('cleaning.unreadNotes', { count: unread.length })}
                      </h5>
                      {unread.map(n => (
                        <div key={n.id} className="bg-white rounded-lg p-3 mb-2 border border-amber-100">
                          <p className="text-sm text-gray-800">{n.note}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(n.created_at).toLocaleDateString('es-ES')} · {new Date(n.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))}
                      <button
                        onClick={() => markNotesRead(unread.map(n => n.id))}
                        className="text-sm text-amber-700 hover:text-amber-900 font-medium mt-1"
                      >
                        {t('cleaning.markAsRead')}
                      </button>
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
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config?.ical_enabled ?? true}
                        onChange={e => saveConfig(room.id, { ical_enabled: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">{t('cleaning.calendarEnabled')}</span>
                    </label>
                  </div>

                  {/* Enlace iCal */}
                  {config?.ical_enabled && icalUrl && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                      <p className="text-sm font-medium text-gray-700 mb-2">{t('cleaning.icalLink')}</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={icalUrl}
                          className="flex-1 text-xs bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-600 font-mono"
                        />
                        <button
                          onClick={() => copyLink(config.ical_token)}
                          className="flex-shrink-0 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          title={t('cleaning.copy')}
                        >
                          {copiedToken === config.ical_token ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <a
                          href={icalUrl}
                          target="_blank"
                          rel="noopener"
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {t('cleaning.preview')}
                        </a>
                        <button
                          onClick={() => regenerateToken(room.id)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          {t('cleaning.regenerateToken')}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {t('cleaning.icalInstructions')}
                      </p>
                    </div>
                  )}

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
  );
}
