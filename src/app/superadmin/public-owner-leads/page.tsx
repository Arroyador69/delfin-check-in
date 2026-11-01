'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type Stats = {
  total?: number;
  opted_out?: number;
  new_count?: number;
  queued?: number;
  sent?: number;
  bounced?: number;
  opened?: number;
  clicked?: number;
  signed_up?: number;
  open_rate_pct?: number;
  click_rate_pct?: number;
  signup_rate_pct?: number;
};

type Today = {
  sent_today?: number;
  cold_today?: number;
  fu_today?: number;
  fu_click_today?: number;
  fu_open_today?: number;
  fu_silent_today?: number;
  bounced_today?: number;
  opened_today?: number;
  clicked_today?: number;
  signed_up_today?: number;
  discovered_today?: number;
};

type FollowUpPanel = {
  dueClick?: number;
  dueOpen?: number;
  dueSilent?: number;
  scheduledClick?: number;
  scheduledOpen?: number;
  scheduledSilent?: number;
  stoppedSale?: number;
  exhausted?: number;
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

type DayRow = {
  day: string;
  sent?: number;
  opened?: number;
  clicked?: number;
  signed_up?: number;
  bounced?: number;
};

type IntakeRow = {
  email: string;
  domain: string | null;
  source_url: string;
  status: string;
  notes: string | null;
  created_at: string;
};

/** Metas de negocio (cold+FU → completed → Plan Check-in). */
const ONBOARDING_DAILY_GOAL = 20;
const CHECKIN_PAID_DAILY_GOAL = 10;

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
  if (lead.status === 'bounced') return { label: 'Undelivered', className: 'bg-rose-100 text-rose-900 ring-rose-300' };
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
  const [hardCap, setHardCap] = useState(500);
  const [coldCap, setColdCap] = useState(300);
  const [fuCap, setFuCap] = useState(200);
  const [wavesPerDay, setWavesPerDay] = useState(10);
  const [delayMs, setDelayMs] = useState(1800);
  const [scheduleHint, setScheduleHint] = useState(
    '08:00–17:30 Madrid · 50/oleada · FU primero · Telegram 12:00 + 16:00 + 21:00'
  );
  const [reserveReady, setReserveReady] = useState(0);
  const [onboardingsToday, setOnboardingsToday] = useState(0);
  const [checkinPaidToday, setCheckinPaidToday] = useState(0);
  const [checkinPaidGoal, setCheckinPaidGoal] = useState(CHECKIN_PAID_DAILY_GOAL);
  const [wavesStillRun, setWavesStillRun] = useState(true);
  const [paused, setPaused] = useState(false);
  const [followup, setFollowup] = useState<FollowUpPanel | null>(null);
  const [stats, setStats] = useState<Stats>({});
  const [today, setToday] = useState<Today>({});
  const [byDay, setByDay] = useState<DayRow[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dayFilter, setDayFilter] = useState<string>(''); // '' = todos · YYYY-MM-DD = ese día
  const [sourcesSummary, setSourcesSummary] = useState<Record<string, number>>({});
  const [intakeBySource, setIntakeBySource] = useState<Array<{ source_kind: string; n: number }>>(
    []
  );
  const [intakeRecent, setIntakeRecent] = useState<IntakeRow[]>([]);
  const [urlsText, setUrlsText] = useState('');
  const [bounceText, setBounceText] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [outreachProvider, setOutreachProvider] = useState<{
    provider?: string;
    from?: string;
    zohoRisk?: boolean;
    hint?: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (dayFilter) {
        params.set('day', dayFilter);
      } else {
        params.set('status', 'sent');
      }
      const res = await fetch(`/api/superadmin/public-owner-leads?${params}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || data.ok === false) {
        setError(data.error || data.message || `Error ${res.status}`);
        return;
      }
      setTableReady(Boolean(data.table_ready));
      setMigrationHint(data.table_ready ? null : data.message || null);
      setDailyTarget(Number(data.wave_max || data.daily_target || 50));
      setHardCap(Number(data.daily_hard_cap || 500));
      setColdCap(Number(data.cold_daily_cap || data.system?.cold_cap || 300));
      setFuCap(Number(data.fu_daily_cap || data.system?.fu_cap || 200));
      setWavesPerDay(Number(data.waves_per_day || 10));
      setDelayMs(Number(data.delay_ms || 1800));
      setScheduleHint(
        String(
          data.schedule_hint ||
            '08:00–17:30 Madrid · 50/oleada · FU primero · Telegram 12:00 + 16:00 + 21:00'
        )
      );
      setReserveReady(Number(data.reserve_ready || 0));
      setOnboardingsToday(Number(data.onboardings_today || 0));
      setCheckinPaidToday(Number(data.checkin_paid_today || 0));
      setCheckinPaidGoal(Number(data.checkin_paid_goal || CHECKIN_PAID_DAILY_GOAL));
      setPaused(Boolean(data.paused));
      setFollowup(data.followup || null);
      setWavesStillRun(
        data.waves_still_run != null
          ? Boolean(data.waves_still_run)
          : Boolean(data.afternoon_will_run)
      );
      setStats(data.stats || {});
      setToday(data.today || {});
      setByDay(Array.isArray(data.by_day) ? data.by_day : []);
      setLeads(data.leads || []);
      setSourcesSummary(data.sources?.[0]?.summary || {});
      setIntakeBySource(
        Array.isArray(data.intake?.by_source_today) ? data.intake.by_source_today : []
      );
      setIntakeRecent(Array.isArray(data.intake?.recent) ? data.intake.recent : []);
      setOutreachProvider(data.outreach_provider || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [dayFilter]);

  useEffect(() => {
    load();
  }, [load]);

  function selectDay(day: string) {
    setDayFilter(day);
  }

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
      } else if (body.action === 'import_bounces') {
        const r = data.result || {};
        setToast(
          `Undelivered: ${r.emails ?? 0} emails · leads marcados ${r.leadsMarked ?? 0} · suppression +${r.suppressed ?? 0}`
        );
        setBounceText('');
      } else if (body.action === 'sync_bounces') {
        const z = data.zoho || {};
        setToast(
          z.ok
            ? `Zoho OK · escaneados ${z.messagesScanned ?? 0} · emails ${z.emailsFound ?? 0} · leads bounced ${z.leadsMarked ?? 0}`
            : `Zoho no pudo leer Undelivered (${z.error || 'sin scope/IMAP'}). Pega el CSV abajo.`
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
  const coldToday = Number(today.cold_today || 0);
  const fuToday = Number(today.fu_today || 0);
  const signupsToday = Number(today.signed_up_today || 0);
  const sendPct = Math.min(100, Math.round((sentToday / Math.max(hardCap, 1)) * 100));
  const coldPct = Math.min(100, Math.round((coldToday / Math.max(coldCap, 1)) * 100));
  const fuPct = Math.min(100, Math.round((fuToday / Math.max(fuCap, 1)) * 100));
  const signupPct = Math.min(
    100,
    Math.round((onboardingsToday / Math.max(ONBOARDING_DAILY_GOAL, 1)) * 100)
  );
  const checkinPct = Math.min(
    100,
    Math.round((checkinPaidToday / Math.max(checkinPaidGoal, 1)) * 100)
  );
  const signupGoalMet = onboardingsToday >= ONBOARDING_DAILY_GOAL;
  const checkinGoalMet = checkinPaidToday >= checkinPaidGoal;
  const waveSize = dailyTarget; // 50 por oleada
  const queueTarget = hardCap; // recámara ≈ tope día (500)
  const delaySec = Math.round((delayMs / 1000) * 10) / 10;
  const dueTotal =
    Number(followup?.dueClick || 0) +
    Number(followup?.dueOpen || 0) +
    Number(followup?.dueSilent || 0);
  const scheduledTotal =
    Number(followup?.scheduledClick || 0) +
    Number(followup?.scheduledOpen || 0) +
    Number(followup?.scheduledSilent || 0);

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
            <p className="mt-1 text-slate-600 max-w-3xl text-[15px] leading-relaxed">
              Sistema <strong className="text-slate-900">cold + follow-up (A→B→C)</strong> · tope{' '}
              <strong className="text-slate-900">{hardCap}/día</strong> (
              <strong className="text-slate-900">{coldCap} cold</strong> +{' '}
              <strong className="text-slate-900">{fuCap} FU</strong>) · FU primero en cada oleada ·
              metas <strong className="text-slate-900">{ONBOARDING_DAILY_GOAL} onboardings</strong> +{' '}
              <strong className="text-slate-900">{checkinPaidGoal} Plan Check-in</strong> ·{' '}
              {scheduleHint} · cola <strong className="text-slate-900">{reserveReady}</strong>
              {paused ? (
                <span className="ml-2 inline-flex items-center rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-900">
                  PAUSADO
                </span>
              ) : null}
            </p>
            {outreachProvider && (
              <p
                className={`mt-3 text-sm rounded-lg px-3 py-2 max-w-2xl ring-1 ${
                  outreachProvider.zohoRisk
                    ? 'bg-amber-50 text-amber-950 ring-amber-200'
                    : 'bg-emerald-50 text-emerald-950 ring-emerald-200'
                }`}
              >
                <strong>Proveedor outreach:</strong>{' '}
                {String(outreachProvider.provider || '—').toUpperCase()}
                {outreachProvider.from ? ` · from ${outreachProvider.from}` : ''}
                <br />
                <span className="opacity-90">{outreachProvider.hint}</span>
              </p>
            )}
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
              disabled={busy}
              onClick={() => postAction({ action: 'sync_bounces' })}
              className="px-3.5 py-2 text-sm font-semibold rounded-xl border border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100 disabled:opacity-50 shadow-sm"
            >
              Sync Zoho undelivered
            </button>
            <button
              type="button"
              disabled={busy || !tableReady}
              onClick={() => postAction({ action: 'run_daily', dryRun: true })}
              className="px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 shadow-sm"
            >
              Dry-run oleada ({waveSize})
            </button>
            <button
              type="button"
              disabled={busy || !tableReady || signupGoalMet || paused}
              onClick={() => {
                if (
                  !confirm(
                    `¿Enviar hasta ${waveSize} emails ahora? (FU primero · delay ${delaySec}s · tope ${hardCap}: ${coldCap} cold + ${fuCap} FU)`
                  )
                )
                  return;
                postAction({ action: 'run_daily', dryRun: false, max: waveSize });
              }}
              className="px-3.5 py-2 text-sm font-semibold rounded-xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 shadow-md shadow-sky-600/20"
            >
              Ejecutar oleada ({waveSize})
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
            <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div
                className={`rounded-2xl border p-5 shadow-sm ${
                  reserveReady >= queueTarget
                    ? 'border-indigo-200 bg-indigo-50/50'
                    : 'border-amber-200 bg-amber-50/60'
                }`}
              >
                <div className="flex justify-between items-baseline gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">Cola lista (stock)</h2>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      reserveReady >= queueTarget
                        ? 'bg-indigo-100 text-indigo-900'
                        : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {reserveReady >= queueTarget ? 'OK para oleadas' : 'Por debajo del mínimo'}
                  </span>
                </div>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-indigo-950">
                  {reserveReady}
                  <span className="text-lg text-slate-400 font-medium"> / {queueTarget}</span>
                </p>
                <div className="mt-3 h-2.5 rounded-full bg-white/80 overflow-hidden ring-1 ring-indigo-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      reserveReady >= queueTarget ? 'bg-indigo-600' : 'bg-amber-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((reserveReady / Math.max(1, queueTarget)) * 100))}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Stock para cold. En cola: <strong>{stats.queued ?? 0}</strong>
                  {(stats.new_count ?? 0) > 0 ? ` · new ${stats.new_count}` : ''}. Nuevos hoy:{' '}
                  {today.discovered_today ?? 0}.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex justify-between items-baseline gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">Onboardings hoy</h2>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      signupGoalMet ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    }`}
                  >
                    {signupGoalMet ? 'Meta OK' : 'En curso'}
                  </span>
                </div>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
                  {onboardingsToday}
                  <span className="text-lg text-slate-400 font-medium"> / {ONBOARDING_DAILY_GOAL}</span>
                </p>
                <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${signupGoalMet ? 'bg-emerald-500' : 'bg-sky-500'}`}
                    style={{ width: `${signupPct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Altas atribuidas hoy: {signupsToday}.{' '}
                  {wavesStillRun
                    ? `Oleadas activas hasta meta o tope.`
                    : `Meta onboardings alcanzada — sin más envíos hoy.`}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-5 shadow-sm">
                <div className="flex justify-between items-baseline gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">Plan Check-in hoy</h2>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      checkinGoalMet
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-white text-emerald-900 ring-1 ring-emerald-200'
                    }`}
                  >
                    {checkinGoalMet ? '¡Meta!' : 'Meta rentable'}
                  </span>
                </div>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-emerald-950">
                  {checkinPaidToday}
                  <span className="text-lg text-slate-400 font-medium"> / {checkinPaidGoal}</span>
                </p>
                <div className="mt-3 h-2.5 rounded-full bg-white/80 overflow-hidden ring-1 ring-emerald-100">
                  <div
                    className={`h-full rounded-full transition-all ${checkinGoalMet ? 'bg-emerald-600' : 'bg-teal-500'}`}
                    style={{ width: `${checkinPct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-600">
                  Tenants con plan checkin/standard/pro actualizados hoy. Objetivo ~{checkinPaidGoal}/día.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex justify-between items-baseline gap-2">
                  <h2 className="text-sm font-semibold text-slate-800">Emails hoy</h2>
                  <span className="text-xs font-semibold text-slate-500">
                    {wavesPerDay}×{waveSize} · tope {hardCap}
                  </span>
                </div>
                <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
                  {sentToday}
                  <span className="text-lg text-slate-400 font-medium"> / {hardCap}</span>
                </p>
                <div className="mt-3 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-slate-700/80 transition-all"
                    style={{ width: `${sendPct}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 ring-1 ring-slate-100 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Cold
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-slate-900">
                      {coldToday}
                      <span className="text-sm text-slate-400 font-medium"> / {coldCap}</span>
                    </p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white overflow-hidden">
                      <div
                        className="h-full rounded-full bg-slate-500"
                        style={{ width: `${coldPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="rounded-xl bg-violet-50 ring-1 ring-violet-100 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                      Follow-up
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-violet-950">
                      {fuToday}
                      <span className="text-sm text-violet-400 font-medium"> / {fuCap}</span>
                    </p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white overflow-hidden">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{ width: `${fuPct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-violet-700/80">
                      A {today.fu_click_today ?? 0} · B {today.fu_open_today ?? 0} · C{' '}
                      {today.fu_silent_today ?? 0}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  <MiniStat label="Abiertos" value={today.opened_today} />
                  <MiniStat label="Clicks" value={today.clicked_today} />
                  <MiniStat label="Undelivered" value={today.bounced_today} />
                  <MiniStat label="Nuevos" value={today.discovered_today} />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-violet-200/70 bg-violet-50/40 p-5 shadow-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-violet-950">
                    Embudo follow-up (A click → B open → C silencio)
                  </h2>
                  <p className="mt-0.5 text-xs text-violet-800/80">
                    Prioridad en cada oleada: due A, luego B, luego C; el resto del cupo a cold.
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-900">
                  Due ahora: {dueTotal} · Programados: {scheduledTotal}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <MetricCard label="Due A (click)" value={followup?.dueClick} accent />
                <MetricCard label="Due B (open)" value={followup?.dueOpen} />
                <MetricCard label="Due C (silencio)" value={followup?.dueSilent} />
                <MetricCard label="Prog. A" value={followup?.scheduledClick} />
                <MetricCard label="Prog. B" value={followup?.scheduledOpen} />
                <MetricCard label="Prog. C" value={followup?.scheduledSilent} />
              </div>
              <p className="mt-3 text-xs text-violet-900/70">
                Parados por venta: {followup?.stoppedSale ?? 0} · Secuencia agotada:{' '}
                {followup?.exhausted ?? 0} · Cupo FU día: {fuToday}/{fuCap}
              </p>
            </section>

            <section className="rounded-2xl border border-sky-100 bg-sky-50/60 px-5 py-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Horario · sistema rentable (Europe/Madrid)</p>
              <p className="mt-1 leading-relaxed">
                Prepare ~07:00 · oleadas {wavesPerDay}×{waveSize} entre 08:00–17:30 · en cada oleada{' '}
                <strong>FU primero</strong> (click→open→silent) luego cold hasta cupos ({coldCap}+
                {fuCap}={hardCap}) · Telegram 12:00 · 16:00 · 21:00 · delay {delaySec}s. Si onboardings ≥
                {ONBOARDING_DAILY_GOAL}, se para el día.
              </p>
            </section>

            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard
                label="En cola"
                value={stats.queued}
                sub={`objetivo ≥${queueTarget}`}
                accent
              />
              <MetricCard label="Enviados total" value={stats.sent} />
              <MetricCard label="Undelivered" value={stats.bounced} sub="no volver a enviar" />
              <MetricCard label="Abiertos" value={stats.opened} sub={`${stats.open_rate_pct ?? 0}%`} />
              <MetricCard label="Clicks" value={stats.clicked} sub={`${stats.click_rate_pct ?? 0}%`} />
              <MetricCard
                label="Altas atribuidas"
                value={stats.signed_up}
                sub={`${stats.signup_rate_pct ?? 0}%`}
              />
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Entradas web + email (estadísticas)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Qué webs y correos han entrado · por fuente · últimos 7 días
                </p>
              </div>
              <div className="px-5 py-3 flex flex-wrap gap-2">
                {intakeBySource.length === 0 ? (
                  <span className="text-xs text-slate-500">Sin altas de stock hoy aún</span>
                ) : (
                  intakeBySource.map((r) => (
                    <span
                      key={r.source_kind}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 ring-1 ring-slate-200"
                    >
                      {r.source_kind}: {r.n}
                    </span>
                  ))
                )}
              </div>
              <div className="overflow-x-auto max-h-56 overflow-y-auto border-t border-slate-100">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-2 font-semibold">Email</th>
                      <th className="text-left px-4 py-2 font-semibold">Web / dominio</th>
                      <th className="text-left px-4 py-2 font-semibold">Fuente</th>
                      <th className="text-left px-4 py-2 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intakeRecent.slice(0, 25).map((row) => (
                      <tr key={`${row.email}-${row.created_at}`} className="border-t border-slate-50">
                        <td className="px-4 py-1.5 font-mono text-slate-800">{row.email}</td>
                        <td className="px-4 py-1.5 text-slate-600 truncate max-w-[220px]">
                          {row.domain || row.source_url}
                        </td>
                        <td className="px-4 py-1.5 text-slate-500 truncate max-w-[160px]">
                          {row.notes || '—'}
                        </td>
                        <td className="px-4 py-1.5">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex flex-wrap justify-between gap-2 items-center">
                <div>
                  <h2 className="font-semibold text-slate-900">Envíos por día (últimos 30)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pulsa un día para ver solo esos envíos · timezone Europe/Madrid
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => selectDay('')}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg ring-1 ring-inset ${
                    !dayFilter
                      ? 'bg-slate-900 text-white ring-slate-900'
                      : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Ver todos los enviados
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50/80 text-left text-slate-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Día</th>
                      <th className="px-4 py-2.5 font-semibold">Enviados</th>
                      <th className="px-4 py-2.5 font-semibold">Abiertos</th>
                      <th className="px-4 py-2.5 font-semibold">Clicks</th>
                      <th className="px-4 py-2.5 font-semibold">Altas</th>
                      <th className="px-4 py-2.5 font-semibold">Undelivered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDay.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          Aún no hay envíos registrados.
                        </td>
                      </tr>
                    )}
                    {byDay.map((row) => {
                      const active = dayFilter === row.day;
                      return (
                        <tr
                          key={row.day}
                          onClick={() => selectDay(row.day)}
                          className={`border-t border-slate-100 cursor-pointer hover:bg-sky-50/60 ${
                            active ? 'bg-sky-50' : ''
                          }`}
                        >
                          <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                            {row.day}
                            {active ? (
                              <span className="ml-2 text-[10px] uppercase tracking-wide text-sky-700 font-semibold">
                                filtro
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums font-semibold text-slate-900">
                            {row.sent ?? 0}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums text-slate-700">{row.opened ?? 0}</td>
                          <td className="px-4 py-2.5 tabular-nums text-slate-700">{row.clicked ?? 0}</td>
                          <td className="px-4 py-2.5 tabular-nums font-semibold text-emerald-800">
                            {row.signed_up ?? 0}
                          </td>
                          <td className="px-4 py-2.5 tabular-nums text-rose-800">{row.bounced ?? 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-rose-200/80 bg-rose-50/40 p-5 shadow-sm space-y-3">
              <div>
                <h2 className="font-semibold text-rose-950">Zoho Undelivered → eliminar de captación</h2>
                <p className="text-sm text-rose-900/80 mt-0.5">
                  Si el sync API falla (scopes OAuth / IMAP off), exporta Undelivered en Zoho Mail y pega aquí
                  emails o CSV. Se marcan como <strong>bounced</strong> y entran en suppression (no se reenvían).
                </p>
              </div>
              <textarea
                value={bounceText}
                onChange={(e) => setBounceText(e.target.value)}
                rows={4}
                placeholder={'email\nbad@casa-ejemplo.es\notro@fallo.com'}
                className="w-full border border-rose-200 rounded-xl px-3 py-2.5 text-sm font-mono bg-white focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
              <button
                type="button"
                disabled={busy || !bounceText.trim() || !tableReady}
                onClick={() => postAction({ action: 'import_bounces', text: bounceText })}
                className="px-3.5 py-2 text-sm font-semibold rounded-xl bg-rose-700 text-white hover:bg-rose-800 disabled:opacity-50"
              >
                Marcar undelivered y excluir
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
              <div className="flex flex-wrap justify-between gap-2 items-end">
                <div>
                  <h2 className="font-semibold text-slate-900">Cola de webs (opcional)</h2>
                  <p className="text-sm text-slate-600 mt-0.5">
                    El cron ya siembra y descubre alojamientos ES solo. Puedes añadir URLs a mano si quieres ·
                    pending {sourcesSummary.pending ?? 0} · done {sourcesSummary.done ?? 0}
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
                <h2 className="font-semibold text-slate-900">
                  {dayFilter
                    ? `Envíos del ${dayFilter}`
                    : 'Todos los enviados · fecha envío / open / click / alta'}
                </h2>
                <span className="text-xs text-slate-500 self-center">
                  {leads.length} filas · cola {stats.queued ?? 0} · nuevos {stats.new_count ?? 0}
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
