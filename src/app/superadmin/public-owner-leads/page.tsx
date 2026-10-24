'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Stats = {
  total?: number;
  opted_out?: number;
  new_count?: number;
  queued?: number;
  sent?: number;
  opened?: number;
  clicked?: number;
  signed_up?: number;
  open_rate_pct?: number;
  click_rate_pct?: number;
  signup_rate_pct?: number;
};

type Today = {
  sent_today?: number;
  opened_today?: number;
  clicked_today?: number;
  signed_up_today?: number;
  discovered_today?: number;
};

type Lead = {
  id: string;
  email: string;
  domain: string | null;
  source_url: string;
  status: string;
  opted_out: boolean;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  signed_up_at: string | null;
  created_at: string;
  last_error?: string | null;
};

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return d;
  }
}

export default function PublicOwnerLeadsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableReady, setTableReady] = useState(false);
  const [dailyTarget, setDailyTarget] = useState(50);
  const [stats, setStats] = useState<Stats>({});
  const [today, setToday] = useState<Today>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sourcesSummary, setSourcesSummary] = useState<Record<string, number>>({});
  const [urlsText, setUrlsText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/superadmin/public-owner-leads?limit=150', {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setError(data.error || data.message || `Error ${res.status}`);
        return;
      }
      setTableReady(Boolean(data.table_ready));
      setDailyTarget(Number(data.daily_target || 50));
      setStats(data.stats || {});
      setToday(data.today || {});
      setLeads(data.leads || []);
      const summary = data.sources?.[0]?.summary;
      setSourcesSummary(summary || {});
      if (data.message) setMessage(data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function postAction(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/superadmin/public-owner-leads', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setError(data.error || `Error ${res.status}`);
        return;
      }
      setMessage(JSON.stringify(data, null, 2));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const sentToday = Number(today.sent_today || 0);
  const progressPct = Math.min(100, Math.round((sentToday / dailyTarget) * 100));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/superadmin" className="text-sm text-teal-700 hover:underline">
            ← Superadmin
          </Link>
          <h1 className="text-2xl font-semibold text-slate-900 mt-2">
            Campaña captación propietarios (España)
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Emails públicos en web propia · prueba gratis · objetivo {dailyTarget}/día · cron ~09:00
            Madrid
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => postAction({ action: 'sync_engagement' })}
            className="px-3 py-2 text-sm rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Sync opens/clicks
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => postAction({ action: 'run_daily', dryRun: true })}
            className="px-3 py-2 text-sm rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50"
          >
            Dry-run diario
          </button>
          <button
            type="button"
            disabled={busy || !tableReady}
            onClick={() => {
              if (
                !confirm(
                  `¿Enviar hasta ${dailyTarget} emails de prueba gratis ahora? (usa cola + fuentes)`
                )
              ) {
                return;
              }
              postAction({ action: 'run_daily', dryRun: false });
            }}
            className="px-3 py-2 text-sm rounded bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50"
          >
            Ejecutar envío ahora
          </button>
        </div>
      </div>

      {loading && <p className="text-slate-500">Cargando…</p>}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm whitespace-pre-wrap">
          {error}
        </div>
      )}
      {message && (
        <pre className="rounded border border-slate-200 bg-slate-50 text-xs p-3 overflow-auto max-h-40">
          {message}
        </pre>
      )}

      {!loading && (
        <>
          <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-slate-800">Progreso hoy (Madrid)</span>
              <span className="tabular-nums">
                {sentToday} / {dailyTarget} enviados
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-teal-600 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
              <Metric label="Descubiertos hoy" value={today.discovered_today} />
              <Metric label="Abiertos hoy" value={today.opened_today} />
              <Metric label="Clicks hoy" value={today.clicked_today} />
              <Metric label="Altas hoy" value={today.signed_up_today} accent />
              <Metric label="Fuentes pending" value={sourcesSummary.pending} />
            </div>
          </section>

          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Enviados total" value={stats.sent} />
            <MetricCard
              label="Abiertos"
              value={stats.opened}
              sub={`${stats.open_rate_pct ?? 0}%`}
            />
            <MetricCard
              label="Clicks"
              value={stats.clicked}
              sub={`${stats.click_rate_pct ?? 0}%`}
            />
            <MetricCard
              label="Se dieron de alta"
              value={stats.signed_up}
              sub={`${stats.signup_rate_pct ?? 0}%`}
              accent
            />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
            <h2 className="font-medium text-slate-900">Añadir URLs de webs (España)</h2>
            <p className="text-sm text-slate-600">
              Una URL por línea (web propia del alojamiento). El cron de las 09:00 las scrapea solo,
              encuentra emails públicos y envía la prueba gratis. Bloqueadas: Airbnb, Booking,
              LinkedIn, IG, etc.
            </p>
            <textarea
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              rows={6}
              placeholder={'https://mi-casa-rural.es\nhttps://apartamentos-ejemplo.com/contacto'}
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm font-mono"
            />
            <button
              type="button"
              disabled={busy || !urlsText.trim()}
              onClick={() => postAction({ action: 'add_sources', urlsText })}
              className="px-3 py-2 text-sm rounded bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Guardar en cola de descubrimiento
            </button>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex justify-between">
              <h2 className="font-medium text-slate-900">Leads recientes</h2>
              <span className="text-xs text-slate-500">
                cola {stats.queued ?? 0} · nuevos {stats.new_count ?? 0} · bajas {stats.opted_out ?? 0}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Enviado</th>
                    <th className="px-3 py-2">Abrió</th>
                    <th className="px-3 py-2">Click</th>
                    <th className="px-3 py-2">Alta</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                        Sin leads aún. Añade URLs o espera al cron.
                      </td>
                    </tr>
                  )}
                  {leads.map((l) => (
                    <tr key={l.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{l.email}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[220px]">
                          {l.domain || l.source_url}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-block rounded px-2 py-0.5 text-xs bg-slate-100">
                          {l.opted_out ? 'baja' : l.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmt(l.sent_at)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmt(l.opened_at)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{fmt(l.clicked_at)}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-teal-800">
                        {fmt(l.signed_up_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value?: number;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${accent ? 'text-teal-700' : 'text-slate-900'}`}>
        {value ?? 0}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value?: number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${accent ? 'text-teal-700' : ''}`}>
        {value ?? 0}
      </div>
      {sub != null && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
