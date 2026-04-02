'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { LifeBuoy, Send, Loader2, CheckCircle, AlertTriangle, ChevronDown } from 'lucide-react';

const CATEGORY_KEYS = [
  'software_issue',
  'integration_error',
  'data_export',
  'account_access',
  'other_technical',
] as const;

const STATUS_KEYS = ['open', 'in_review', 'resolved', 'closed'] as const;

export default function SupportTicketsPage() {
  const t = useTranslations('settings.support');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] =
    useState<(typeof CATEGORY_KEYS)[number]>('software_issue');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [tickets, setTickets] = useState<
    Array<{
      id: string;
      subject: string;
      category: string;
      status: string;
      created_at: string;
    }>
  >([]);
  const [loadingList, setLoadingList] = useState(true);

  const loadTickets = async () => {
    try {
      const res = await fetch('/api/tenant/support-tickets', { credentials: 'include' });
      const data = await res.json();
      if (data.success && Array.isArray(data.tickets)) {
        setTickets(data.tickets);
      }
    } catch {
      /* silencioso */
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/tenant/support-tickets', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'err', text: data.error || t('submitError') });
        return;
      }
      setMessage({ type: 'ok', text: t('submitSuccess') });
      setSubject('');
      setBody('');
      setCategory('software_issue');
      loadTickets();
    } catch {
      setMessage({ type: 'err', text: t('submitError') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="border-l-4 border-slate-700 bg-slate-50 rounded-r-xl p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <LifeBuoy className="w-6 h-6 text-slate-700 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t('title')}</h2>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{t('intro')}</p>
            <p className="text-xs text-slate-500 mt-2">{t('notFor')}</p>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('subjectLabel')}</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-slate-400 focus:border-slate-500"
            placeholder={t('subjectPlaceholder')}
            maxLength={200}
            required
          />
          <p className="text-xs text-slate-500 mt-1">{t('subjectHint')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('categoryLabel')}</label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as (typeof CATEGORY_KEYS)[number])}
              className="w-full appearance-none border border-slate-300 rounded-lg px-3 py-2 text-slate-900 bg-white focus:ring-2 focus:ring-slate-400 focus:border-slate-500 pr-10"
            >
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {t(`categories.${key}`)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('bodyLabel')}</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:ring-2 focus:ring-slate-400 focus:border-slate-500 font-mono text-sm"
            placeholder={t('bodyPlaceholder')}
            maxLength={8000}
            required
          />
          <p className="text-xs text-slate-500 mt-1">{t('bodyHint')}</p>
        </div>

        {message && (
          <div
            className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
              message.type === 'ok'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-red-50 text-red-900 border border-red-200'
            }`}
          >
            {message.type === 'ok' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-900 disabled:opacity-50 transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {submitting ? t('submitting') : t('submit')}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-4">{t('historyTitle')}</h3>
        {loadingList ? (
          <p className="text-sm text-slate-500">{t('loading')}</p>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-slate-500">{t('historyEmpty')}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tickets.map((tk) => (
              <li key={tk.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div>
                  <p className="text-sm font-medium text-slate-900">{tk.subject}</p>
                  <p className="text-xs text-slate-500">
                    {CATEGORY_KEYS.includes(tk.category as (typeof CATEGORY_KEYS)[number])
                      ? t(`categories.${tk.category as (typeof CATEGORY_KEYS)[number]}`)
                      : tk.category}{' '}
                    · {new Date(tk.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-600 bg-slate-100 px-2 py-0.5 rounded w-fit">
                  {STATUS_KEYS.includes(tk.status as (typeof STATUS_KEYS)[number])
                    ? t(`status.${tk.status as (typeof STATUS_KEYS)[number]}`)
                    : tk.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
