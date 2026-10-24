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

const SIGNUP_DAILY_GOAL = 20;

function fmt(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return d;
  }
}

function statusBadge(lead: Lead): { label: string; className: string } {
  if (lead.opted_out) return { label: 'Baja', className: 'bg-rose-50 text-rose-800 ring-rose-200' };
  if (lead.signed_up_at) return { label: 'Alta', className: 'bg-emerald-50 text-emerald-800 ring-emerald-200' };
  if (lead.clicked_at) return { label: 'Click', className: 'bg-sky-50 text-sky-900 ring-sky-200' };
  if (lead.opened_at) return { label: 'Abierto', className: 'bg-amber-50 text-amber-900 ring-amber-200' };
  if (lead.status === 'sent') return { label: 'Enviado', className: 'bg-slate-100 text-slate-700 ring-slate-200' };
  if (lead.status === 'queued') return { label: 'Cola', className: 'bg-indigo-50 text-indigo-800 ring-indigo-200' };
  return { label: lead.status, className: 'bg-slate-50 text-slate-600 ring-slate-200' };
}

export default function PublicOwnerLeadsAdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableReady, setTableReady] = useState(false);
  const [migrationHint, setMigrationHint] = useState<string | null>(null);
  const [dailyTarget, setDailyTarget] = useState(50);
  const [stats, setStats] = useState<Stats>({});
  const [today, setToday] = useState<Today>({});
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sourcesSummary, setSourcesSummary] = useState<Record<string, number>>({});
  const [urlsText, setUrlsText] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
      setMigrationHint(data.table_ready ? null : data.message || null);
      setDailyTarget(Number(data.daily_target || 50));
      setStats(data.stats || {});
      setToday(data.today || {});
      setLeads(data.leads || []);
      setSourcesSummary(data.sources?.[0]?.summary || {});
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
    setToast(null);
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
      if (body.action === 'add_sources') {
        setToast(
          `URLs: +${data.inserted || 0} nuevas · ${data.duplicates || 0} duplicadas · ${data.blocked || 0} bloqueadas`
        );
        setUrlsText('');
      } else if (body.action === 'run_daily') {
        const r = data.result || {};
        setToast(
          body.dryRun
            ? `Dry-run OK · presupuesto ${r.budget ?? '—'} · descubiertos ${r.leadsDiscovered ?? 0}`
            : `Enviados ${r.sent ?? 0} · fallidos ${r.failed ?? 0} · suppressed ${r.skippedSuppressed ?? 0}`
        );
      } else {
        setToast('Hecho');
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const sentToday = Number(today.sent_today || 0);
  const signupsToday = Number(today.signed_up_today || 0);
  const sendPct = Math.min(100, Math.round((sentToday / Math.max(dailyTarget, 1)) * 100));
  const signupPct = Math.min(100, Math.round((signupsToday / SIGNUP_DAILY_GOAL) * 100));
  const signupGoalMet = signupsToday >= SIGNUP_DAILY_GOAL;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-sky-50/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link href="/superadmin" className="text-sm font-medium text-sky-700 hover:underline">
              ← Superadmin
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Captación propietarios
            </h1>
            <p className="mt-1 text-slate-600 max-w-2xl text-[15px] leading-relaxed">
              Meta <strong className="text-slate-900">{SIGNUP_DAILY_GOAL} altas nuevas / día</strong> · soporte
              outreach <strong className="text-slate-900">{dailyTarget} emails</strong> · destino landing{' '}
              <a
                className="text-sky-700 font-medium underline-offset-2 hover:underline"
                href="https://delfincheckin.com/parte-viajeros/"
                target="_blank"
                rel="noreferrer"
              >
                /parte-viajeros/
              </a>
              . Playbook:{' '}
              <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                docs/growth/EJECUCION_CAPTACION_20_PROPIETARIOS_DIA.md
              </code>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => postAction({ action: 'sync_engagement' })}
              className="px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 shadow-sm"
            >
              Sync opens/clicks
            </button>
            <button
              type="button"
              disabled={busy || !tableReady}
              onClick={() => postAction({ action: 'run_daily', dryRun: true })}
              className="px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 shadow-sm"
            >
              Dry-run 09:00
            </button>
            <button
              type="button"
              disabled={busy || !tableReady}
              onClick={() => {
                if (!confirm(`¿Enviar hasta ${dailyTarget} emails de prueba gratis ahora?`)) return;
                postAction({ action: 'run_daily', dryRun: false });
              }}
              className="px-3.5 py-2 text-sm font-semibold rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 shadow-md shadow-sky-600/20"
            >
              Ejecutar envío
            </button>
          </div>
        </header>

        {migrationHint && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <strong>SQL pendiente.</strong> {migrationHint}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 whitespace-pre-wrap">
            {error}
          </div>
        )}
        {toast && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {toast}
          </div>
        )}

        {loading ? (
          <p className="text-slate-500 text-sm">Cargando métricas…</p>
        ) : (
          <>
            <section className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex justify-between items-baseline gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">Altas nuevas hoy (KPI)</h2>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      signupGoalMet ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {signupGoalMet ? 'Meta OK' : 'Por debajo'}
                  </span>
                </div>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
                  {signupsToday}
                  <span className="text-lg text-slate-400 font-medium"> / {SIGNUP_DAILY_GOAL}</span>
                </p>
                <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${signupGoalMet ? 'bg-emerald-500' : 'bg-sky-500'}`}
                    style={{ width: `${signupPct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Incluye atribución cuando el email del lead se registra (prueba gratis / waitlist).
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex justify-between items-baseline gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">Emails outreach hoy</h2>
                  <span className="text-xs font-semibold text-slate-500">tope {dailyTarget}</span>
                </div>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
                  {sentToday}
                  <span className="text-lg text-slate-400 font-medium"> / {dailyTarget}</span>
                </p>
                <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-slate-700/80 transition-all" style={{ width: `${sendPct}%` }} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <MiniStat label="Abiertos" value={today.opened_today} />
                  <MiniStat label="Clicks" value={today.clicked_today} />
                  <MiniStat label="Descubiertos" value={today.discovered_today} />
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard label="Enviados total" value={stats.sent} />
              <MetricCard label="Abiertos" value={stats.opened} sub={`${stats.open_rate_pct ?? 0}%`} />
              <MetricCard label="Clicks" value={stats.clicked} sub={`${stats.click_rate_pct ?? 0}%`} />
              <MetricCard
                label="Altas atribuidas"
                value={stats.signed_up}
                sub={`${stats.signup_rate_pct ?? 0}%`}
                accent
              />
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
              <div className="flex flex-wrap justify-between gap-2 items-end">
                <div>
                  <h2 className="font-semibold text-slate-900">Cola de webs (España)</h2>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Una URL por línea · solo web propia · pending {sourcesSummary.pending ?? 0} · done{' '}
                    {sourcesSummary.done ?? 0}
                  </p>
                </div>
              </div>
              <textarea
                value={urlsText}
                onChange={(e) => setUrlsText(e.target.value)}
                rows={5}
                placeholder={'https://casa-rural-ejemplo.es\nhttps://apartamentos-costa.com/contacto'}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
              <button
                type="button"
                disabled={busy || !urlsText.trim() || !tableReady}
                onClick={() => postAction({ action: 'add_sources', urlsText })}
                className="px-3.5 py-2 text-sm font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
              >
                Guardar URLs para el cron de las 09:00
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap justify-between gap-2">
                <h2 className="font-semibold text-slate-900">Leads · fecha envío / open / click / alta</h2>
                <span className="text-xs text-slate-500 self-center">
                  cola {stats.queued ?? 0} · nuevos {stats.new_count ?? 0} · bajas {stats.opted_out ?? 0}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50/80 text-left text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Email</th>
                      <th className="px-4 py-2.5 font-semibold">Estado</th>
                      <th className="px-4 py-2.5 font-semibold">Enviado</th>
                      <th className="px-4 py-2.5 font-semibold">Abrió</th>
                      <th className="px-4 py-2.5 font-semibold">Click</th>
                      <th className="px-4 py-2.5 font-semibold">Alta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                          Aún no hay leads. Añade URLs arriba o espera al cron (~09:00 Madrid).
                        </td>
                      </tr>
                    )}
                    {leads.map((l) => {
                      const badge = statusBadge(l);
                      return (
                        <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-slate-900">{l.email}</div>
                            <div className="text-xs text-slate-500 truncate max-w-[240px]">
                              {l.domain || l.source_url}
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">{fmt(l.sent_at)}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">{fmt(l.opened_at)}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap text-slate-700">{fmt(l.clicked_at)}</td>
                          <td className="px-4 py-2.5 whitespace-nowrap font-semibold text-emerald-800">
                            {fmt(l.signed_up_at)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-2 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
      <div className="text-base font-semibold tabular-nums text-slate-900">{value ?? 0}</div>
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
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${accent ? 'text-emerald-700' : 'text-slate-900'}`}>
        {value ?? 0}
      </div>
      {sub != null && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
