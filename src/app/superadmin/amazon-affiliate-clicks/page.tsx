'use client';

import { useCallback, useEffect, useState } from 'react';
import { MousePointerClick, RefreshCw } from 'lucide-react';
import { useClientTranslations, getCurrentLocale } from '@/hooks/useClientTranslations';

type ApiResponse = {
  success: boolean;
  days: number;
  summary: {
    totalAllTime: number;
    totalInRange: number;
    clicksLoggedIn: number;
    clicksAnonymous: number;
    uniqueTenants: number;
  };
  byPlacement: { placement: string; count: number }[];
  byDay: { day: string; count: number }[];
  topTenants: { tenantId: string; clicks: number; name: string | null; email: string | null }[];
  recent: {
    at: string;
    tenantId: string | null;
    ip: string | null;
    placement: string | null;
    asin: string | null;
    tenantName: string | null;
    tenantEmail: string | null;
  }[];
};

export default function SuperAdminAmazonAffiliateClicksPage() {
  const t = useClientTranslations('superadminAmazonAffiliate');
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/amazon-affiliate-clicks?days=${days}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || `HTTP ${res.status}`);
        setData(null);
        return;
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'fetch');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const loc = typeof window !== 'undefined' ? getCurrentLocale() : 'es';
  const dateLocale = loc === 'en' ? 'en-GB' : loc === 'fi' ? 'fi' : loc === 'pt' ? 'pt' : loc === 'it' ? 'it' : loc === 'fr' ? 'fr' : 'es';

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <MousePointerClick className="h-9 w-9 shrink-0 text-orange-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
            <p className="mt-1 text-gray-600">{t('subtitle')}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600">
            <span className="mr-2">{t('periodLabel')}</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value={7}>7</option>
              <option value={14}>14</option>
              <option value={30}>30</option>
              <option value={60}>60</option>
              <option value={90}>90</option>
            </select>
            <span className="ml-2">{t('periodDays')}</span>
          </label>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </button>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        <p className="font-semibold">{t('conversionTitle')}</p>
        <p className="mt-2 leading-relaxed">{t('conversionBody')}</p>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-800">
        <p className="font-semibold">{t('dbNoteTitle')}</p>
        <p className="mt-2 leading-relaxed">{t('dbNoteBody')}</p>
      </div>

      {loading && !data && (
        <div className="py-16 text-center text-gray-600">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
          <p className="mt-4">{t('loading')}</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p>{t('errorPrefix')} {error}</p>
          <button type="button" onClick={() => load()} className="mt-2 text-sm font-semibold underline">
            {t('errorRetry')}
          </button>
        </div>
      )}

      {data && (
        <>
          <p className="mb-3 text-sm text-gray-600">{t('periodCaption').replace('{n}', String(data.days))}</p>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label={t('cardTotal')} value={data.summary.totalAllTime} />
            <StatCard label={t('cardInRange')} value={data.summary.totalInRange} />
            <StatCard label={t('cardUniqueTenants')} value={data.summary.uniqueTenants} />
            <StatCard label={t('cardLoggedIn')} value={data.summary.clicksLoggedIn} />
            <StatCard label={t('cardAnonymous')} value={data.summary.clicksAnonymous} />
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">{t('sectionByPlacement')}</h2>
              {data.byPlacement.length === 0 ? (
                <p className="text-gray-500">{t('noData')}</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 pr-4">{t('colPlacement')}</th>
                      <th className="py-2">{t('colClicks')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byPlacement.map((row) => (
                      <tr key={row.placement} className="border-b border-gray-100">
                        <td className="py-2 pr-4 font-mono text-gray-900">{row.placement}</td>
                        <td className="py-2 font-semibold">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">{t('sectionByDay')}</h2>
              {data.byDay.length === 0 ? (
                <p className="text-gray-500">{t('noData')}</p>
              ) : (
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="sticky top-0 border-b bg-white text-left text-gray-500">
                        <th className="py-2 pr-4">{t('colDay')}</th>
                        <th className="py-2">{t('colClicks')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byDay.map((row) => (
                        <tr key={row.day} className="border-b border-gray-100">
                          <td className="py-2 pr-4 text-gray-900">
                            {new Date(row.day + 'T12:00:00Z').toLocaleDateString(dateLocale)}
                          </td>
                          <td className="py-2 font-semibold">{row.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="mb-8 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">{t('sectionTopTenants')}</h2>
            {data.topTenants.length === 0 ? (
              <p className="text-gray-500">{t('noTopTenants')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 pr-4">{t('colTenant')}</th>
                      <th className="py-2 pr-4">{t('colEmail')}</th>
                      <th className="py-2">{t('colClicks')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topTenants.map((row) => (
                      <tr key={row.tenantId} className="border-b border-gray-100">
                        <td className="py-2 pr-4 text-gray-900">{row.name || '—'}</td>
                        <td className="py-2 pr-4 text-gray-600">{row.email || '—'}</td>
                        <td className="py-2 font-semibold">{row.clicks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-900">{t('sectionRecent')}</h2>
            {data.recent.length === 0 ? (
              <p className="text-gray-500">{t('noData')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-2 pr-3">{t('colWhen')}</th>
                      <th className="py-2 pr-3">{t('colPlacement')}</th>
                      <th className="py-2 pr-3">{t('colTenant')}</th>
                      <th className="py-2 pr-3">{t('colEmail')}</th>
                      <th className="py-2">{t('colIp')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((row, i) => (
                      <tr key={`${row.at}-${i}`} className="border-b border-gray-100">
                        <td className="whitespace-nowrap py-2 pr-3 text-gray-700">
                          {new Date(row.at).toLocaleString(dateLocale)}
                        </td>
                        <td className="py-2 pr-3 font-mono text-gray-800">{row.placement || '—'}</td>
                        <td className="max-w-[140px] truncate py-2 pr-3 text-gray-800">{row.tenantName || '—'}</td>
                        <td className="max-w-[180px] truncate py-2 pr-3 text-gray-600">{row.tenantEmail || '—'}</td>
                        <td className="py-2 font-mono text-gray-500">{row.ip || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
