'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link2, Copy, Check, Trash2, RefreshCw, Plus, Users } from 'lucide-react';
import { getCleaningPublicBaseUrlClient } from '@/lib/cleaning-public-base-url';

interface Room {
  id: string;
  name: string;
}

interface PublicLink {
  id: string;
  label: string;
  public_token: string;
  room_ids: string[];
  created_at?: string;
}

interface Props {
  rooms: Room[];
  t: (key: string, values?: Record<string, string | number>) => string;
  /** Horario de limpieza por habitación (misma lógica que el bloque «por habitación» debajo). */
  getRoomScheduleLabel?: (roomId: string) => string;
  /** Tras crear/editar enlaces, recargar configuración por si se crearon filas por defecto. */
  onLinksMutated?: () => void;
}

export default function CleaningPublicLinksSection({
  rooms,
  t,
  getRoomScheduleLabel,
  onLinksMutated,
}: Props) {
  const [links, setLinks] = useState<PublicLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [selectedRooms, setSelectedRooms] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const baseUrl = useMemo(() => getCleaningPublicBaseUrlClient(), []);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/cleaning/links', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setLinks(data.links || []);
    } catch {
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleRoom = (id: string) => {
    setSelectedRooms(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const createLink = async () => {
    const label = newLabel.trim();
    if (!label) {
      setMessage({ type: 'error', text: t('cleaning.publicLinksNameRequired') });
      return;
    }
    if (selectedRooms.size === 0) {
      setMessage({ type: 'error', text: t('cleaning.publicLinksRoomsRequired') });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/cleaning/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ label, room_ids: Array.from(selectedRooms) }),
      });
      const data = await res.json();
      if (data.success) {
        setNewLabel('');
        setSelectedRooms(new Set());
        await load();
        onLinksMutated?.();
        setMessage({ type: 'success', text: t('cleaning.publicLinksCreated') });
      } else {
        setMessage({ type: 'error', text: data.error || t('cleaning.saveError') });
      }
    } catch {
      setMessage({ type: 'error', text: t('cleaning.saveError') });
    } finally {
      setCreating(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    }
  };

  const copyUrl = (token: string) => {
    const url = `${baseUrl}/limpieza/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const regenerate = async (id: string) => {
    if (!confirm(t('cleaning.publicLinksRegenerateConfirm'))) return;
    try {
      const res = await fetch(`/api/cleaning/links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ regenerate_token: true }),
      });
      const data = await res.json();
      if (data.success) await load();
    } catch {
      setMessage({ type: 'error', text: t('cleaning.saveError') });
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t('cleaning.publicLinksDeleteConfirm'))) return;
    try {
      await fetch(`/api/cleaning/links/${id}`, { method: 'DELETE', credentials: 'include' });
      await load();
    } catch {
      setMessage({ type: 'error', text: t('cleaning.saveError') });
    }
  };

  const roomLabel = (rid: string) => rooms.find(r => String(r.id) === rid)?.name || rid;

  if (loading) {
    return (
      <div className="mb-8 p-4 rounded-xl border border-dashed border-gray-200 text-gray-500 text-sm">
        {t('cleaning.publicLinksLoading')}
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-xl border-2 border-blue-100 bg-gradient-to-br from-sky-50 to-indigo-50 p-4 sm:p-6">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <Link2 className="w-5 h-5 text-blue-700" />
        </div>
        <div>
          <h5 className="font-semibold text-gray-900 text-base">{t('cleaning.publicLinksTitle')}</h5>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{t('cleaning.publicLinksIntro')}</p>
        </div>
      </div>

      {message.text && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white/80 rounded-xl p-4 border border-blue-100 mb-6">
        <p className="text-sm font-medium text-gray-800 mb-3">{t('cleaning.publicLinksNewTitle')}</p>
        <input
          type="text"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder={t('cleaning.publicLinksNamePlaceholder')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 text-sm"
        />
        <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {t('cleaning.publicLinksPickRooms')}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {rooms.map(r => {
            const id = String(r.id);
            const on = selectedRooms.has(id);
            const schedule =
              typeof getRoomScheduleLabel === 'function' ? getRoomScheduleLabel(id) : null;
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleRoom(id)}
                className={`text-left text-xs sm:text-sm px-3 py-1.5 rounded-full border transition-colors max-w-[220px] sm:max-w-none ${
                  on
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                <span className="font-medium block truncate">{r.name}</span>
                {schedule ? (
                  <span
                    className={`block text-[10px] sm:text-xs mt-0.5 leading-tight line-clamp-2 ${
                      on ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {schedule}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={createLink}
          disabled={creating || rooms.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {creating ? '…' : t('cleaning.publicLinksCreate')}
        </button>
      </div>

      {links.length > 0 && (
        <ul className="space-y-3">
          {links.map(link => (
            <li
              key={link.id}
              className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{link.label}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {link.room_ids?.map(rid => roomLabel(rid)).join(' · ') || '—'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    readOnly
                    value={`${baseUrl}/limpieza/${link.public_token}`}
                    className="flex-1 text-xs bg-gray-50 border rounded px-2 py-1.5 font-mono truncate"
                  />
                  <button
                    type="button"
                    onClick={() => copyUrl(link.public_token)}
                    className="p-2 rounded-lg bg-blue-600 text-white shrink-0"
                    title={t('cleaning.copy')}
                  >
                    {copied === link.public_token ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => regenerate(link.id)}
                  className="p-2 rounded-lg border border-amber-200 text-amber-800 hover:bg-amber-50"
                  title={t('cleaning.publicLinksRegenerate')}
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(link.id)}
                  className="p-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                  title={t('cleaning.publicLinksDelete')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {rooms.length === 0 && (
        <p className="text-sm text-gray-500">{t('cleaning.noRooms')}</p>
      )}
    </div>
  );
}
