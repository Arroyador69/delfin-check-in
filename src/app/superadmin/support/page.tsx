'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LifeBuoy,
  Loader2,
  RefreshCw,
  ChevronRight,
  X,
  Send,
  MessageSquare,
} from 'lucide-react';
import { useClientTranslations, getCurrentLocale } from '@/hooks/useClientTranslations';
import type { Locale } from '@/i18n/config';
import {
  isValidTicketUuid,
  normalizeSupportTicketStatus,
} from '@/lib/support-ticket-status';

type TicketRow = {
  id: string;
  ticket_code?: string | null;
  body?: string;
  tenant_id: string;
  tenant_name: string;
  tenant_email: string;
  reporter_email: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
  superadmin_notes: string | null;
  last_support_reply_is_read?: boolean | null;
  last_support_reply_read_at?: string | null;
};

type TicketDetail = TicketRow & { body: string };

const STATUS_FILTERS = ['', 'open', 'in_review', 'resolved', 'closed'] as const;

const CATEGORY_KEYS = [
  'software_issue',
  'integration_error',
  'data_export',
  'account_access',
  'other_technical',
] as const;

const STATUS_EDIT_KEYS = ['open', 'in_review', 'resolved', 'closed'] as const;

const DATE_LOCALE: Record<Locale, string> = {
  es: 'es-ES',
  en: 'en-GB',
  fr: 'fr-FR',
  it: 'it-IT',
  pt: 'pt-PT',
  fi: 'fi-FI',
};

export default function SuperadminSupportPage() {
  const t = useClientTranslations('superadminSupport');
  const tSettings = useClientTranslations('settings');
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [detailMessages, setDetailMessages] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [statusEdit, setStatusEdit] = useState('');
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [dateLocale, setDateLocale] = useState(DATE_LOCALE.es);

  useEffect(() => {
    setDateLocale(DATE_LOCALE[getCurrentLocale()]);
  }, []);

  const formatCategory = (key: string) =>
    CATEGORY_KEYS.includes(key as (typeof CATEGORY_KEYS)[number])
      ? tSettings(`support.categories.${key}`)
      : key;

  const formatStatus = (key: string) => {
    const normalized = normalizeSupportTicketStatus(key);
    return STATUS_EDIT_KEYS.includes(normalized as (typeof STATUS_EDIT_KEYS)[number])
      ? tSettings(`support.status.${normalized}`)
      : key;
  };

  const load = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      if (query.trim()) params.set('q', query.trim());
      const qs = params.toString();
      const res = await fetch(`/api/superadmin/support-tickets${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setTickets([]);
        const secs = typeof data.retryAfter === 'number' ? data.retryAfter : 60;
        setListError(
          data.message ||
            `Demasiadas peticiones. Espera ${secs} s y pulsa Reintentar (no recargues la página en bucle).`
        );
        return;
      }
      if (!res.ok || !data.success) {
        setTickets([]);
        setListError(data.error || data.details || t('listLoadError'));
        return;
      }
      setTickets(Array.isArray(data.tickets) ? data.tickets : []);
    } catch {
      setTickets([]);
      setListError(t('openErrorNetwork'));
    } finally {
      setLoading(false);
    }
    // `t` no va en deps: useClientTranslations devuelve función nueva cada render → bucle infinito de fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const closeDetail = () => {
    setDetail(null);
    setOpenError(null);
    setDetailMessages([]);
    setReply('');
  };

  const openDetail = useCallback(async (id: string) => {
    const ticketId = String(id || '').trim();
    if (!ticketId) {
      setOpenError(t('openErrorInvalidId'));
      setDetail(null);
      return;
    }
    if (!isValidTicketUuid(ticketId)) {
      setOpenError(t('openErrorInvalidId'));
      setDetail(null);
      return;
    }

    setDetailLoading(true);
    setDetail(null);
    setDetailMessages([]);
    setOpenError(null);
    try {
      const res = await fetch(
        `/api/superadmin/support-tickets/${encodeURIComponent(ticketId)}`,
        { credentials: 'include' }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.ticket) {
        setOpenError(data.error || data.details || t('openErrorGeneric'));
        return;
      }
      const ticket = data.ticket as TicketDetail;
      setDetail(ticket);
      setNotes(ticket.superadmin_notes || '');
      setStatusEdit(normalizeSupportTicketStatus(ticket.status));
      setDetailMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch {
      setOpenError(t('openErrorNetwork'));
    } finally {
      setDetailLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const ticketParam = new URLSearchParams(window.location.search).get('ticket')?.trim();
    if (ticketParam && isValidTicketUuid(ticketParam)) {
      openDetail(ticketParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deep link una vez al montar
  }, []);

  const sendReply = async () => {
    if (!detail) return;
    const text = reply.trim();
    if (text.length < 2) return;
    setSendingReply(true);
    try {
      const res = await fetch(
        `/api/superadmin/support-tickets/${encodeURIComponent(detail.id)}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setReply('');
        openDetail(detail.id);
      } else {
        setOpenError(data.error || t('replyError'));
      }
    } catch {
      setOpenError(t('openErrorNetwork'));
    } finally {
      setSendingReply(false);
    }
  };

  const saveDetail = async () => {
    if (!detail) return;
      setSaving(true);
    try {
      const res = await fetch(`/api/superadmin/support-tickets/${encodeURIComponent(detail.id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusEdit, superadmin_notes: notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setOpenError(data.error || t('saveError'));
        return;
      }
      closeDetail();
      void load();
    } catch {
      setOpenError(t('openErrorNetwork'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <LifeBuoy className="w-8 h-8 text-slate-700" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
              <p className="text-sm text-slate-600">{t('subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') load();
              }}
              placeholder="Buscar (esther, email, ticket…)"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white w-64 max-w-[40vw]"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s || 'all'} value={s}>
                  {s === '' ? t('filterAllStatuses') : formatStatus(s)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => load()}
              className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100"
              title={t('refreshTitle')}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/superadmin"
              className="text-sm text-slate-600 hover:text-slate-900 px-3 py-2"
            >
              {t('backToDashboard')}
            </Link>
          </div>
        </div>

        {listError ? (
          <div
            className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex flex-wrap items-center justify-between gap-2"
            role="alert"
          >
            <span>{listError}</span>
            <button
              type="button"
              onClick={() => void load()}
              className="text-sm font-medium text-red-900 underline hover:no-underline"
            >
              {t('retryList')}
            </button>
          </div>
        ) : null}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="p-8 text-center text-slate-500">{t('empty')}</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-700 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('colEstablishment')}</th>
                  <th className="px-4 py-3 font-medium">Ticket</th>
                  <th className="px-4 py-3 font-medium">{t('colSubject')}</th>
                  <th className="px-4 py-3 font-medium">{t('colCategory')}</th>
                  <th className="px-4 py-3 font-medium">{t('colStatus')}</th>
                  <th className="px-4 py-3 font-medium">{t('colDate')}</th>
                  <th className="px-4 py-3 font-medium">Leído</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((tk) => (
                  <tr
                    key={tk.id}
                    className="hover:bg-slate-50 cursor-pointer focus-within:bg-slate-50"
                    onClick={() => {
                      if (!isValidTicketUuid(tk.id)) {
                        setOpenError(t('openErrorInvalidId'));
                        setDetail(null);
                        setDetailLoading(false);
                        return;
                      }
                      openDetail(tk.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDetail(tk.id);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`${t('openTicketAria')}: ${tk.subject}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{tk.tenant_name || t('dash')}</div>
                      <div className="text-xs text-slate-500">{tk.reporter_email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">
                        {tk.ticket_code || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-800 max-w-xs truncate">{tk.subject}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCategory(tk.category)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs uppercase font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {formatStatus(tk.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(tk.created_at).toLocaleString(dateLocale)}
                    </td>
                    <td className="px-4 py-3">
                      {tk.last_support_reply_is_read ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                          Sí
                        </span>
                      ) : tk.last_support_reply_is_read === false ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800">
                          No
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                      {tk.last_support_reply_read_at ? (
                        <div className="mt-1 text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(tk.last_support_reply_read_at).toLocaleString(dateLocale)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-500" aria-hidden>
                      <ChevronRight className="w-5 h-5" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {(detail || detailLoading || openError) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={closeDetail}
          role="presentation"
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="support-detail-title"
          >
            <button
              type="button"
              onClick={closeDetail}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
              aria-label={t('closeDetail')}
            >
              <X className="w-6 h-6" />
            </button>
            {detailLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : openError && !detail ? (
              <div className="pr-6 space-y-3">
                <h2 id="support-detail-title" className="text-lg font-bold text-slate-900">
                  {t('openErrorTitle')}
                </h2>
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
                  {openError}
                </p>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="text-sm text-slate-600 hover:text-slate-900 underline"
                >
                  {t('closeDetail')}
                </button>
              </div>
            ) : detail ? (
              <div className="space-y-4 pr-6">
                <h2 id="support-detail-title" className="text-lg font-bold text-slate-900">
                  {detail.subject}
                </h2>
                {detail.ticket_code ? (
                  <p className="text-xs font-mono text-slate-600 bg-slate-100 inline-block px-2 py-0.5 rounded">
                    {detail.ticket_code}
                  </p>
                ) : null}
                <p className="text-xs text-slate-500">
                  {detail.tenant_name} · {detail.tenant_email} · {t('senderLabel')}:{' '}
                  {detail.reporter_email}
                </p>
                <p className="text-xs text-slate-500">
                  {t('colDate')}: {new Date(detail.created_at).toLocaleString(dateLocale)} ·{' '}
                  {t('updatedAtLabel')}: {new Date(detail.updated_at).toLocaleString(dateLocale)}
                </p>
                {detail.body ? (
                  <div className="text-sm text-slate-800 whitespace-pre-wrap border border-slate-100 rounded-lg p-4 bg-slate-50">
                    {detail.body}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    {t('conversationTitle')}
                  </h3>
                  {detailMessages.length > 0 ? (
                    detailMessages.map((m: any) => (
                      <div
                        key={m.id}
                        className={`rounded-lg border p-3 text-sm whitespace-pre-wrap ${
                          m.sender_type === 'superadmin'
                            ? 'border-amber-200 bg-amber-50/50'
                            : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 mb-1">
                          <span className="font-medium">
                            {m.sender_type === 'superadmin' ? 'Superadmin' : 'Tenant'} · {m.sender_email}
                          </span>
                          <span>{new Date(m.created_at).toLocaleString(dateLocale)}</span>
                        </div>
                        {m.message}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">{t('noMessagesYet')}</p>
                  )}
                </div>

                <div className="border border-slate-200 rounded-lg p-3">
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    {t('replyLabel')}
                  </label>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={4}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                    placeholder={t('replyPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={sendingReply || reply.trim().length < 2}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 text-white px-4 py-2 text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
                  >
                    {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {t('sendReply')}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('statusLabel')}
                  </label>
                  <select
                    value={statusEdit}
                    onChange={(e) => setStatusEdit(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full"
                  >
                    {STATUS_EDIT_KEYS.map((s) => (
                      <option key={s} value={s}>
                        {formatStatus(s)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t('internalNotesLabel')}
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={saveDetail}
                  disabled={saving}
                  className="w-full py-2.5 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 disabled:opacity-50"
                >
                  {saving ? t('saving') : t('save')}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
