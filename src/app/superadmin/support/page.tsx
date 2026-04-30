'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LifeBuoy,
  Loader2,
  RefreshCw,
  ChevronRight,
  X,
} from 'lucide-react';
import { useClientTranslations, getCurrentLocale } from '@/hooks/useClientTranslations';
import type { Locale } from '@/i18n/config';

type TicketRow = {
  id: string;
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
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [statusEdit, setStatusEdit] = useState('');
  const [saving, setSaving] = useState(false);
  const [dateLocale, setDateLocale] = useState(DATE_LOCALE.es);

  useEffect(() => {
    setDateLocale(DATE_LOCALE[getCurrentLocale()]);
  }, []);

  const formatCategory = (key: string) =>
    CATEGORY_KEYS.includes(key as (typeof CATEGORY_KEYS)[number])
      ? tSettings(`support.categories.${key}`)
      : key;

  const formatStatus = (key: string) =>
    STATUS_EDIT_KEYS.includes(key as (typeof STATUS_EDIT_KEYS)[number])
      ? tSettings(`support.status.${key}`)
      : key;

  const load = async () => {
    setLoading(true);
    try {
      const q = filter ? `?status=${encodeURIComponent(filter)}` : '';
      const res = await fetch(`/api/superadmin/support-tickets${q}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setTickets(data.tickets);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload al cambiar filtro
  }, [filter]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/superadmin/support-tickets/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.ticket) {
        setDetail(data.ticket);
        setNotes(data.ticket.superadmin_notes || '');
        setStatusEdit(data.ticket.status);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const saveDetail = async () => {
    if (!detail) return;
    setSaving(true);
    try {
      await fetch(`/api/superadmin/support-tickets/${detail.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusEdit, superadmin_notes: notes }),
      });
      setDetail(null);
      load();
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
                  <th className="px-4 py-3 font-medium">{t('colSubject')}</th>
                  <th className="px-4 py-3 font-medium">{t('colCategory')}</th>
                  <th className="px-4 py-3 font-medium">{t('colStatus')}</th>
                  <th className="px-4 py-3 font-medium">{t('colDate')}</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((tk) => (
                  <tr key={tk.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{tk.tenant_name || t('dash')}</div>
                      <div className="text-xs text-slate-500">{tk.reporter_email}</div>
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
                      <button
                        type="button"
                        onClick={() => openDetail(tk.id)}
                        className="text-slate-700 hover:text-slate-900"
                        title={t('detailTooltip')}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700"
            >
              <X className="w-6 h-6" />
            </button>
            {detailLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : detail ? (
              <div className="space-y-4 pr-6">
                <h2 className="text-lg font-bold text-slate-900">{detail.subject}</h2>
                <p className="text-xs text-slate-500">
                  {detail.tenant_name} · {detail.tenant_email} · {t('senderLabel')}:{' '}
                  {detail.reporter_email}
                </p>
                <div className="text-sm text-slate-800 whitespace-pre-wrap border border-slate-100 rounded-lg p-4 bg-slate-50">
                  {detail.body}
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
