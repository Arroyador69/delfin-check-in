'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

interface FunnelStats {
  total: number;
  onboarding_incomplete: number;
  onboarding_complete: number;
  with_property: number;
  /** Cobro verificado (Polar/Stripe/subscription_events) */
  paying_customers: number;
  /** Plan checkin/standard/pro en BD (puede incluir cuentas internas sin cobro) */
  plan_assigned: number;
  /** @deprecated usar paying_customers */
  paid_plan?: number;
}

interface EnrollmentRow {
  enrollment_id: string;
  tenant_id: string;
  tenant_name: string;
  email: string;
  onboarding_status: string | null;
  current_rooms: number;
  plan_type: string | null;
  current_step: number;
  enrollment_status: string;
  enrolled_at: string;
  last_sent_at: string | null;
  next_send_at: string | null;
  completed_at: string | null;
  sequence_key: string;
  sequence_name: string;
  phase: number;
  emails_sent: number;
  emails_opened: number;
  sends_on_current_step?: number;
  current_step_opened?: boolean;
  step_retry_count?: number;
  engagement_status?: string;
}

const ENGAGEMENT_LABELS: Record<string, string> = {
  pendiente_primer_envio: 'Pendiente Mail actual',
  esperando_apertura: 'Esperando apertura',
  abierto_siguiente_paso: 'Abrió → siguiente paso',
  reintento_sin_abrir: 'Reintento (sin abrir)',
};

function engagementBadge(status: string): string {
  const map: Record<string, string> = {
    pendiente_primer_envio: 'bg-slate-100 text-slate-700',
    esperando_apertura: 'bg-amber-100 text-amber-900',
    abierto_siguiente_paso: 'bg-green-100 text-green-800',
    reintento_sin_abrir: 'bg-orange-100 text-orange-900',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

interface StepStat {
  sequence_key: string;
  template_key: string;
  step_order: number;
  sent: number;
  opened: number;
  clicked: number;
}

interface TenantDetail {
  tenant: {
    tenant_id: string;
    email: string;
    name: string;
    segment: string;
    onboarding_status: string | null;
    phase_1_goal_met: boolean;
    phase_2_goal_met: boolean;
    current_rooms: number;
    properties_count: number;
    effective_plan: string;
  };
  enrollments: Array<Record<string, unknown>>;
  emails: Array<{
    id: string;
    subject: string;
    status: string;
    created_at: string;
    opened_at: string | null;
    clicked_at: string | null;
    metadata: { template_key?: string; step_order?: number; sequence_key?: string } | null;
  }>;
}

const TEMPLATE_LABELS: Record<string, string> = {
  p1_welcome: 'Bienvenida / activar',
  p1_video: 'Vídeo onboarding (YouTube)',
  p1_mir_video: 'Vídeo credenciales MIR',
  p1_social_proof: 'Prueba social check-in',
  p1_resume: 'Retomar a medias',
  p1_help: 'Oferta ayuda 15 min',
  p1_last_push: 'Último empujón',
  p1_reengagement: 'Reengagement no-openers',
  p2_unlock: 'Desbloquear plan Pro',
  p2_use_case: 'Caso de uso multi-unidad',
  p2_offer: 'Oferta planes',
  p2_questions: '¿Dudas sobre planes?',
};

function fmtDate(v: string | null | undefined): string {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return v;
  }
}

function statusBadge(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    paused: 'bg-amber-100 text-amber-800',
    cancelled: 'bg-gray-100 text-gray-600',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

export default function EmailSequencesPage() {
  const [loading, setLoading] = useState(true);
  const [funnel, setFunnel] = useState<FunnelStats | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [stepStats, setStepStats] = useState<StepStat[]>([]);
  const [unsubCount, setUnsubCount] = useState(0);
  const [dueNow, setDueNow] = useState(0);
  const [activeEnrollments, setActiveEnrollments] = useState(0);
  const [phaseFilter, setPhaseFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [engagementFilter, setEngagementFilter] = useState<string>('');
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [running, setRunning] = useState<string | null>(null);

  const loadOverview = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const fetchOpts = { credentials: 'include' as const, signal };
      const [overviewRes, listRes] = await Promise.all([
        fetch('/api/superadmin/email-sequences', fetchOpts),
        fetch(
          `/api/superadmin/email-sequences/enrollments?${new URLSearchParams({
            ...(phaseFilter ? { phase: phaseFilter } : {}),
            ...(statusFilter ? { status: statusFilter } : {}),
          })}`,
          fetchOpts
        ),
      ]);
      const overview = await overviewRes.json();
      const list = await listRes.json();
      if (!overviewRes.ok || !overview.success) {
        setActionError(overview.error || `Error API overview (${overviewRes.status})`);
      } else {
        setFunnel(overview.funnel);
        setStepStats(overview.step_stats || []);
        setUnsubCount(overview.unsubscribed_count || 0);
        setDueNow(overview.due_now || 0);
        setActiveEnrollments(overview.active_enrollments || 0);
      }
      if (!listRes.ok || !list.success) {
        setActionError((prev) => prev || list.error || `Error API listado (${listRes.status})`);
      } else {
        let rows = (list.enrollments || []) as EnrollmentRow[];
        if (engagementFilter) {
          rows = rows.filter((r) => r.engagement_status === engagementFilter);
        }
        setEnrollments(rows);
      }
    } catch (e) {
      if (signal?.aborted) return;
      console.error(e);
      setActionError('No se pudo cargar el panel. Reintenta en unos segundos.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [phaseFilter, statusFilter, engagementFilter]);

  useEffect(() => {
    const ac = new AbortController();
    void loadOverview(ac.signal);
    return () => ac.abort();
  }, [loadOverview]);

  useEffect(() => {
    if (initialSyncDone || loading) return;
    if (enrollments.length > 0) {
      setInitialSyncDone(true);
      return;
    }
    setInitialSyncDone(true);
    void (async () => {
      try {
        const res = await fetch('/api/superadmin/email-sequences', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sync' }),
        });
        const data = await res.json();
        if (data.success) {
          setActionMsg(
            `Auto-sync: ${data.synced} revisados · Fase 1: +${data.enrolled_phase_1} (elegibles ${data.eligible_phase_1 ?? '?'}) · Fase 2: +${data.enrolled_phase_2} · Pendientes envío: ${data.due_now ?? 0}. Pulsa «Activar y enviar Mail 1».`
          );
          await loadOverview();
        } else {
          setActionError(data.error || 'Error en auto-sync');
        }
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Error en auto-sync');
      }
    })();
  }, [loading, enrollments.length, initialSyncDone, loadOverview]);

  const runAction = async (
    action: 'sync' | 'run' | 'activate' | 'reconcile',
    dryRun = false
  ) => {
    setRunning(action + (dryRun ? '-dry' : ''));
    setActionMsg('');
    setActionError('');
    try {
      const res = await fetch('/api/superadmin/email-sequences', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, dryRun, maxSends: action === 'activate' ? 80 : 40 }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setActionError(data.error || 'Error en la acción');
        return;
      }
      if (action === 'sync') {
        setDueNow(data.reconcile?.due_now_after ?? data.due_now ?? dueNow);
        setActionMsg(
          `Sync OK: ${data.synced} revisados · Fase 1: +${data.enrolled_phase_1} · Reconciliados: ${data.reconcile?.opens_inferred ?? 0} aperturas inferidas, ${data.reconcile?.schedules_corrected ?? 0} calendarios · Pendientes: ${data.reconcile?.due_now_after ?? data.due_now ?? 0}`
        );
      } else if (action === 'reconcile') {
        setDueNow(data.due_now_after ?? dueNow);
        setActionMsg(
          dryRun
            ? `[Simulación] ${data.enrollments_scanned} inscripciones · Se inferirían ${data.opens_inferred} aperturas · ${data.schedules_corrected} calendarios`
            : `Reconciliación OK: ${data.opens_inferred} aperturas recuperadas (actividad en app) · ${data.schedules_corrected} calendarios ajustados · Pendientes envío: ${data.due_now_after ?? 0}. Pulsa «Enviar pendientes».`
        );
      } else if (action === 'activate') {
        setDueNow(data.due_now ?? 0);
        setActionMsg(
          `¡Secuencias activadas! Fase1 +${data.enrolled_phase_1} · Enviados: ${data.sent} · Pendientes restantes: ${Math.max(0, (data.due_now ?? 0) - (data.sent ?? 0))}${data.errors?.length ? ` · ${data.errors.length} errores` : ''}`
        );
      } else {
        setActionMsg(
          `Envío OK: ${data.sent} enviados · ${data.skipped} omitidos · ${data.completed} completados${data.errors?.length ? ` · ${data.errors.length} errores` : ''}`
        );
      }
      await loadOverview();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Error');
    } finally {
      setRunning(null);
    }
  };

  const loadDetail = async (tenantId: string) => {
    setSelectedTenantId(tenantId);
    setDetailLoading(true);
    try {
      const res = await fetch(
        `/api/superadmin/email-sequences/enrollments?tenant_id=${encodeURIComponent(tenantId)}`
      );
      const data = await res.json();
      if (data.success) setDetail(data);
    } finally {
      setDetailLoading(false);
    }
  };

  const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '—');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📧 Secuencias lifecycle</h1>
          <p className="text-gray-600 mt-1">
            Fase 1: completar onboarding · Fase 2: conversión a plan de pago
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Vídeos:{' '}
            <a
              href="https://www.youtube.com/watch?v=-bcIKsL1vsM"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Onboarding
            </a>
            {' · '}
            <a
              href="https://www.youtube.com/watch?v=FVI2aoR05ww"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Credenciales MIR
            </a>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!running}
            onClick={() => {
              if (
                !window.confirm(
                  `¿Activar secuencias y enviar el mail correspondiente a hasta 80 propietarios ahora? (${dueNow} pendientes, ${activeEnrollments} inscritos activos)`
                )
              )
                return;
              void runAction('activate');
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {running === 'activate' ? 'Activando…' : '🚀 Activar y enviar Mail 1'}
          </button>
          <button
            type="button"
            disabled={!!running}
            onClick={() => runAction('run', true)}
            className="px-4 py-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-sm font-medium hover:bg-amber-100 disabled:opacity-50"
          >
            Simular envío (dry-run)
          </button>
          <button
            type="button"
            disabled={!!running}
            onClick={() => {
              if (
                !window.confirm(
                  `¿Enviar emails pendientes ahora? (${dueNow} inscripciones con envío vencido)`
                )
              )
                return;
              void runAction('run');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {running === 'run' ? 'Enviando…' : `Enviar pendientes (${dueNow})`}
          </button>
          <button
            type="button"
            disabled={!!running}
            onClick={() => runAction('sync')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {running === 'sync' ? 'Sincronizando…' : 'Sincronizar'}
          </button>
          <button
            type="button"
            disabled={!!running}
            onClick={() => {
              if (
                !window.confirm(
                  '¿Reconciliar mails ya enviados? Recupera aperturas si el propietario entró en la app tras el envío, y programa reintentos si llevan 4+ días sin abrir.'
                )
              )
                return;
              void runAction('reconcile');
            }}
            className="px-4 py-2 bg-violet-50 border border-violet-200 text-violet-900 rounded-lg text-sm font-medium hover:bg-violet-100 disabled:opacity-50"
          >
            {running === 'reconcile' ? 'Reconciliando…' : 'Reconciliar enviados'}
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          {actionMsg}
        </div>
      )}
      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
          {actionError}
        </div>
      )}

      {funnel && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total propietarios', value: funnel.total },
            { label: 'Onboarding incompleto', value: funnel.onboarding_incomplete },
            { label: 'Onboarding OK', value: funnel.onboarding_complete },
            { label: 'Con propiedad', value: funnel.with_property },
            {
              label: 'Clientes de pago',
              value: funnel.paying_customers ?? funnel.paid_plan ?? 0,
              hint:
                (funnel.plan_assigned ?? 0) > (funnel.paying_customers ?? 0)
                  ? `${funnel.plan_assigned} con plan asignado en BD (sin cobro verificado)`
                  : undefined,
            },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-xl border p-4 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{c.value}</div>
              <div className="text-sm text-gray-600">{c.label}</div>
              {'hint' in c && c.hint ? (
                <div className="text-xs text-amber-700 mt-1 leading-snug">{c.hint}</div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Rendimiento por email</h2>
          {stepStats.length === 0 ? (
            <p className="text-sm text-gray-500">Aún no hay envíos lifecycle registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-4">Fase</th>
                    <th className="pb-2 pr-4">Paso</th>
                    <th className="pb-2 pr-4">Enviados</th>
                    <th className="pb-2 pr-4">Abiertos</th>
                    <th className="pb-2 pr-4">Clics</th>
                    <th className="pb-2">Open rate</th>
                  </tr>
                </thead>
                <tbody>
                  {stepStats.map((s) => (
                    <tr key={`${s.sequence_key}-${s.step_order}`} className="border-b border-gray-50">
                      <td className="py-2 pr-4">F{s.sequence_key.includes('phase_1') ? '1' : '2'}</td>
                      <td className="py-2 pr-4">
                        {TEMPLATE_LABELS[s.template_key] || s.template_key}
                      </td>
                      <td className="py-2 pr-4">{s.sent}</td>
                      <td className="py-2 pr-4">{s.opened}</td>
                      <td className="py-2 pr-4">{s.clicked}</td>
                      <td className="py-2">{pct(s.opened, s.sent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Legal y estado</h2>
          <ul className="text-sm space-y-2 text-gray-700">
            <li>
              <strong>Bajas lifecycle:</strong> {unsubCount}
            </li>
            <li>
              <strong>Inscripciones activas:</strong> {activeEnrollments}
            </li>
            <li>
              <strong>Pendientes de envío:</strong> {dueNow}
            </li>
            <li className="text-gray-500 pt-2 border-t">
              <strong>Lógica inteligente:</strong> si abre → siguiente mail al día siguiente. Si no abre → reintento a los 4 días (mismo paso). Cron 09:30 UTC.
            </li>
            <li className="text-gray-500">
              Cada email incluye enlace de baja (RGPD/LSSI).
            </li>
            <li className="text-gray-500 text-xs">
              Aperturas: pixel al abrir el correo (imágenes activadas). Mails ya enviados sin señal: «Reconciliar enviados» (login/actividad en app = apertura; 4+ días sin abrir = reintento).
            </li>
          </ul>
          <Link href="/superadmin/tenants" className="inline-block mt-4 text-sm text-blue-600 hover:underline">
            Ver todos los tenants →
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-wrap gap-3 items-center">
          <h2 className="font-semibold text-gray-900">Inscripciones por propietario</h2>
          <select
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value)}
            className="text-sm border rounded-lg px-2 py-1"
          >
            <option value="">Todas las fases</option>
            <option value="1">Fase 1 — Activación</option>
            <option value="2">Fase 2 — Upgrade</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border rounded-lg px-2 py-1"
          >
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="completed">Completados</option>
            <option value="paused">Pausados (baja)</option>
          </select>
          <select
            value={engagementFilter}
            onChange={(e) => setEngagementFilter(e.target.value)}
            className="text-sm border rounded-lg px-2 py-1"
          >
            <option value="">Toda la interacción</option>
            <option value="pendiente_primer_envio">Pendiente mail actual</option>
            <option value="esperando_apertura">Esperando apertura</option>
            <option value="abierto_siguiente_paso">Abrió → siguiente</option>
            <option value="reintento_sin_abrir">Reintento sin abrir</option>
          </select>
        </div>

        {loading ? (
          <p className="p-6 text-gray-500 text-sm">Cargando…</p>
        ) : enrollments.length === 0 ? (
          <div className="p-6 text-sm text-gray-600 space-y-3">
            <p className="font-medium text-gray-900">Aún no hay inscripciones visibles</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Asegúrate de tener desplegado el fix del panel (PR #128) y las tablas SQL (
                <code className="text-xs bg-gray-100 px-1 rounded">database/create-email-sequences.sql</code>
                ).
              </li>
              <li>
                Pulsa <strong>Sincronizar</strong> — inscribe propietarios en Fase 1 (onboarding incompleto) o Fase 2 (onboarding OK sin plan de pago).
              </li>
              <li>
                Pulsa <strong>Activar y enviar Mail 1</strong> — envía el mail del paso que toca a cada uno (no siempre el de bienvenida).
              </li>
              <li>
                El cron diario (09:30 UTC) seguirá con reintentos y siguiente paso solo si abren el email.
              </li>
            </ol>
            {funnel && (
              <p className="text-xs text-gray-500">
                Elegibles aprox.: Fase 1 ≈ {funnel.onboarding_incomplete} con onboarding incompleto · Fase 2 ≈{' '}
                {Math.max(0, (funnel.with_property || 0) - (funnel.plan_assigned || 0))} con propiedad sin plan asignado (elegibles Fase 2).
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left p-3">Propietario</th>
                  <th className="text-left p-3">Fase</th>
                  <th className="text-left p-3">Paso</th>
                  <th className="text-left p-3">Interacción</th>
                  <th className="text-left p-3">Inscripción</th>
                  <th className="text-left p-3">Emails</th>
                  <th className="text-left p-3">Próximo envío</th>
                  <th className="text-left p-3"></th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.enrollment_id} className="border-t hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{e.tenant_name || '—'}</div>
                      <div className="text-gray-500 text-xs">{e.email}</div>
                    </td>
                    <td className="p-3">F{e.phase}</td>
                    <td className="p-3">Mail {e.current_step + 1}</td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${engagementBadge(e.engagement_status || '')}`}
                      >
                        {ENGAGEMENT_LABELS[e.engagement_status || ''] || e.engagement_status || '—'}
                      </span>
                      {e.current_step_opened && (
                        <span className="block text-xs text-green-700 mt-1">✓ Abierto paso actual</span>
                      )}
                      {(e.step_retry_count ?? 0) > 0 && (
                        <span className="block text-xs text-orange-700 mt-0.5">
                          Reintentos: {e.step_retry_count}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge(e.enrollment_status)}`}
                      >
                        {e.enrollment_status}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {e.onboarding_status || 'pending'}
                        {e.current_rooms > 0 && ` · ${e.current_rooms} u.`}
                      </div>
                    </td>
                    <td className="p-3">
                      {e.emails_sent} env. · {e.emails_opened} ab.
                    </td>
                    <td className="p-3 text-xs">{fmtDate(e.next_send_at)}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => loadDetail(e.tenant_id)}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Detalle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTenantId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Timeline del propietario</h3>
              <button
                type="button"
                onClick={() => {
                  setSelectedTenantId(null);
                  setDetail(null);
                }}
                className="text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
            </div>
            {detailLoading || !detail ? (
              <p className="text-sm text-gray-500">Cargando detalle…</p>
            ) : (
              <>
                <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                  <p>
                    <strong>{detail.tenant.name}</strong> · {detail.tenant.email}
                  </p>
                  <p className="text-gray-600 mt-1">
                    Segmento: {detail.tenant.segment} · Onboarding:{' '}
                    {detail.tenant.onboarding_status || 'pending'} · Plan:{' '}
                    {detail.tenant.effective_plan}
                  </p>
                  <p className="text-gray-600">
                    Objetivo F1: {detail.tenant.phase_1_goal_met ? '✓' : '✗'} · Objetivo F2:{' '}
                    {detail.tenant.phase_2_goal_met ? '✓' : '✗'}
                  </p>
                </div>
                <h4 className="font-medium mb-2">Emails enviados</h4>
                {detail.emails.length === 0 ? (
                  <p className="text-sm text-gray-500 mb-4">Sin emails lifecycle aún.</p>
                ) : (
                  <ul className="space-y-2 mb-6">
                    {detail.emails.map((em) => (
                      <li key={em.id} className="text-sm border rounded-lg p-3">
                        <div className="font-medium">{em.subject}</div>
                        <div className="text-gray-500 text-xs mt-1">
                          {fmtDate(em.created_at)} · {em.status}
                          {em.metadata?.template_key &&
                            ` · ${TEMPLATE_LABELS[em.metadata.template_key] || em.metadata.template_key}`}
                          {em.opened_at && ' · Abierto ✓'}
                          {em.clicked_at && ' · Clic ✓'}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
