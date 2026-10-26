'use client'

import { useEffect, useState } from 'react'

interface Tenant {
  id: string
  name: string
  email: string
  plan_id: string
  status: string
  onboarding_status?: string | null
  max_rooms: number
  rooms_limit_display: number
  billing_rooms?: number
  current_rooms: number
  created_at: string
  onboarding_email_id?: string | null
  onboarding_email_status?: string | null
  onboarding_email_sent_at?: string | null
  onboarding_email_opened_at?: string | null
  onboarding_email_clicked_at?: string | null
}

function formatShortDateTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

function onboardingBadgeClasses(status?: string | null): string {
  const s = String(status || '').toLowerCase()
  if (!s) return 'bg-gray-100 text-gray-800'
  if (s === 'clicked') return 'bg-indigo-100 text-indigo-800'
  if (s === 'opened') return 'bg-purple-100 text-purple-800'
  if (s === 'delivered') return 'bg-green-100 text-green-800'
  if (s === 'sent') return 'bg-blue-100 text-blue-800'
  if (s === 'pending') return 'bg-yellow-100 text-yellow-800'
  if (s === 'failed' || s === 'bounced') return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}

function onboardingLabel(status?: string | null): string {
  const s = String(status || '').toLowerCase()
  // Sin fila en email_tracking: el tenant existe pero no se registró el mail de acceso
  if (!s) return 'sin email enviado'
  if (s === 'pending') return 'pendiente envío'
  if (s === 'sent') return 'enviado (sin abrir)'
  if (s === 'delivered') return 'entregado'
  if (s === 'opened') return 'abrió el email'
  if (s === 'clicked') return 'clic al enlace'
  if (s === 'failed') return 'fallido'
  if (s === 'bounced') return 'rebotado'
  return s
}

function onboardingTitle(status?: string | null, completed?: boolean): string {
  const s = String(status || '').toLowerCase()
  if (!s) {
    return completed
      ? 'No hay fila en email_tracking (alta antigua o sin track), pero el wizard ya está completado.'
      : 'Sin registro del email de acceso: no se envió o no se trackeó. Cuello de botella: no pueden entrar al onboarding.'
  }
  if (s === 'opened') {
    return 'Abrió el email de acceso pero aún no completó el wizard (o no hizo clic trackeado). Reenviar si hace falta.'
  }
  if (s === 'sent' || s === 'delivered') {
    return 'Email de acceso enviado; aún no hay open/click trackeado.'
  }
  if (s === 'clicked') return 'Hizo clic en el enlace del email de acceso.'
  return `Estado email_tracking: ${s}`
}

function tenantOnboardingProgressLabel(status?: string | null): string {
  const s = String(status || '').toLowerCase()
  if (!s || s === 'unknown') return ''
  if (s === 'completed') return 'Onboarding: completado'
  if (s === 'in_progress') return 'Onboarding: en curso'
  if (s === 'pending') return 'Onboarding: pendiente'
  return `Onboarding: ${s}`
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [duplicateGroups, setDuplicateGroups] = useState<
    Array<{ key: string; reason: string; tenants: Array<{ id: string; email: string; name: string }> }>
  >([])
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [resendBusy, setResendBusy] = useState<string | null>(null)
  const [resendToast, setResendToast] = useState<string | null>(null)
  const [cleanupResult, setCleanupResult] = useState<{
    success?: boolean
    dry_run?: boolean
    total_deleted?: number
    tenants_affected?: number
    tenants_with_errors?: number
    error?: string
    pagination?: { has_more?: boolean; next_offset?: number | null; total_tenants?: number }
    summary?: Array<{
      tenant_id: string
      tenant_name: string
      deleted_ids: number[]
      skipped_ids: number[]
      error?: string
    }>
  } | null>(null)
  const [recoverEmail, setRecoverEmail] = useState('')
  const [recoverLoading, setRecoverLoading] = useState(false)
  const [recoverResetFlow, setRecoverResetFlow] = useState(false)
  const [recoverResult, setRecoverResult] = useState<{
    success?: boolean
    message?: string
    error?: string
    onboardingUrl?: string
    tempPassword?: string
    note?: string
  } | null>(null)

  useEffect(() => {
    fetchTenants()
    fetch('/api/superadmin/tenant-duplicates')
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.groups)) setDuplicateGroups(d.groups)
      })
      .catch(() => {})
  }, [])

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/superadmin/tenants')
      if (response.ok) {
        const data = await response.json()
        setTenants(data.tenants || [])
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendRecoverOnboarding = async (emailRaw: string, resetFlow: boolean) => {
    const email = emailRaw.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      setRecoverResult({ success: false, error: 'Introduce un email válido' })
      return
    }
    setRecoverLoading(true)
    setResendBusy(email)
    setRecoverResult(null)
    setResendToast(null)
    try {
      const res = await fetch('/api/superadmin/recover-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          resetOnboardingFlow: resetFlow,
          locale: 'es',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok && !data?.onboardingUrl) {
        setRecoverResult({
          success: false,
          error: data?.error || 'No se pudo reenviar el onboarding',
        })
        setResendToast(`Error: ${data?.error || 'fallo al reenviar'}`)
        return
      }
      setRecoverResult({
        success: !!data?.success,
        message: data?.message,
        error: data?.error,
        onboardingUrl: data?.onboardingUrl,
        tempPassword: data?.tempPassword,
        note: data?.note,
      })
      setResendToast(`Onboarding reenviado a ${email}`)
      setRecoverEmail(email)
      await fetchTenants()
    } catch {
      setRecoverResult({ success: false, error: 'Error de red al reenviar onboarding' })
      setResendToast('Error de red al reenviar')
    } finally {
      setRecoverLoading(false)
      setResendBusy(null)
    }
  }

  const handleRecoverOnboarding = async () => {
    await sendRecoverOnboarding(recoverEmail, recoverResetFlow)
  }

  const runPropertyCleanup = async (dryRun: boolean, offset = 0) => {
    setCleanupLoading(true)
    try {
      const response = await fetch('/api/superadmin/cleanup-duplicate-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dry_run: dryRun, limit: 40, offset }),
      })
      const data = await response.json()
      setCleanupResult(data)
      if (!response.ok || !data.success) {
        alert(data.error || 'Error al limpiar propiedades duplicadas')
      }
    } catch (err) {
      console.error('cleanup-duplicate-properties:', err)
      alert('Error de red al limpiar propiedades')
    } finally {
      setCleanupLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">📋 Todos los Tenants</h1>
        <p className="text-gray-700 mt-2">Gestión de todos los clientes de la plataforma</p>
      </div>

      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h2 className="font-semibold text-amber-950 mb-2">Qué significa «Email onboarding»</h2>
        <ul className="text-sm text-amber-950 space-y-1.5 list-disc list-inside">
          <li>
            <strong>sin email enviado</strong> — no hay registro del mail de acceso (no se envió o es histórico sin
            track). El cliente no tiene enlace → cuello de botella. Usa «Reenviar».
          </li>
          <li>
            <strong>enviado (sin abrir)</strong> — el mail salió; aún no hay open trackeado.
          </li>
          <li>
            <strong>abrió el email</strong> — abrió el mail de acceso pero no completó el wizard (o no hizo clic
            trackeado). Suelen estar atascados aquí.
          </li>
          <li>
            <strong>clic al enlace</strong> — entró al onboarding desde el email.
          </li>
          <li>
            La columna <strong>Progreso onboarding</strong> es el wizard en la app (pendiente / en curso /
            completado), independiente del estado del email.
          </li>
        </ul>
        {resendToast ? (
          <p className="mt-3 text-xs font-medium text-amber-900 bg-white/70 rounded px-2 py-1.5">{resendToast}</p>
        ) : null}
      </div>

      <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <h2 className="font-semibold text-emerald-950 mb-2">🔑 Reenviar onboarding (enlace + contraseña temporal)</h2>
        <p className="text-sm text-emerald-900 mb-3">
          Para clientes atascados (sin email o «abrió» sin completar): regenera enlace y temp, invalida las
          anteriores y envía un email nuevo. Usa el email del tenant o el botón «Reenviar» en la tabla.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-end mb-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-emerald-900 mb-1">Email del cliente</label>
            <input
              type="email"
              value={recoverEmail}
              onChange={(e) => setRecoverEmail(e.target.value)}
              placeholder="cliente@email.com"
              className="w-full px-3 py-2 rounded-lg border border-emerald-300 text-sm bg-white"
            />
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-emerald-950 pb-2">
            <input
              type="checkbox"
              checked={recoverResetFlow}
              onChange={(e) => setRecoverResetFlow(e.target.checked)}
            />
            Reiniciar onboarding a pendiente
          </label>
          <button
            type="button"
            disabled={recoverLoading}
            onClick={() => void handleRecoverOnboarding()}
            className="px-4 py-2 rounded-lg bg-emerald-700 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {recoverLoading ? 'Enviando…' : 'Reenviar onboarding'}
          </button>
        </div>
        {recoverResult ? (
          <div
            className={`text-sm rounded-md p-3 border ${
              recoverResult.success
                ? 'bg-white/80 border-emerald-100 text-emerald-950'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {recoverResult.message ? <p className="font-medium">{recoverResult.message}</p> : null}
            {recoverResult.error ? <p>{recoverResult.error}</p> : null}
            {recoverResult.note ? <p className="mt-1 text-xs">{recoverResult.note}</p> : null}
            {recoverResult.tempPassword ? (
              <p className="mt-2 font-mono text-sm">
                Temp: <strong>{recoverResult.tempPassword}</strong>
              </p>
            ) : null}
            {recoverResult.onboardingUrl ? (
              <p className="mt-1 break-all text-xs">
                Enlace:{' '}
                <a className="underline" href={recoverResult.onboardingUrl} target="_blank" rel="noreferrer">
                  {recoverResult.onboardingUrl}
                </a>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h2 className="font-semibold text-blue-950 mb-2">🏠 Limpiar propiedades duplicadas (stub €50)</h2>
        <p className="text-sm text-blue-900 mb-3">
          Elimina de la base de datos las fichas de prueba (€50, sin fotos) cuando ya existe la propiedad real del
          tenant. Primero simula; luego ejecuta. No borra propiedades con reservas.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            disabled={cleanupLoading}
            onClick={() => runPropertyCleanup(true, 0)}
            className="px-4 py-2 rounded-lg bg-white border border-blue-300 text-sm font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
          >
            {cleanupLoading ? 'Procesando…' : 'Simular (dry run)'}
          </button>
          <button
            type="button"
            disabled={cleanupLoading}
            onClick={() => {
              if (
                !confirm(
                  '¿Eliminar stubs duplicados en todos los tenants? Solo se borran fichas €50 sin fotos con otra ficha mejor.'
                )
              ) {
                return
              }
              runPropertyCleanup(false, 0)
            }}
            className="px-4 py-2 rounded-lg bg-blue-700 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            Ejecutar limpieza
          </button>
          {cleanupResult?.pagination?.has_more ? (
            <button
              type="button"
              disabled={cleanupLoading}
              onClick={() =>
                runPropertyCleanup(Boolean(cleanupResult?.dry_run), cleanupResult?.pagination?.next_offset || 0)
              }
              className="px-4 py-2 rounded-lg bg-white border border-blue-300 text-sm font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50"
            >
              Siguiente lote
            </button>
          ) : null}
        </div>
        {cleanupResult?.success ? (
          <div className="text-sm text-blue-950 bg-white/80 rounded-md p-3 border border-blue-100">
            <p>
              {cleanupResult.dry_run ? 'Simulación' : 'Ejecutado'}:{' '}
              <strong>{cleanupResult.total_deleted ?? 0}</strong> stub(s){' '}
              {cleanupResult.dry_run ? 'a borrar' : 'borrados'} en{' '}
              <strong>{cleanupResult.tenants_affected ?? 0}</strong> tenant(s).
              {(cleanupResult.tenants_with_errors ?? 0) > 0 ? (
                <span className="text-red-700"> Errores en {cleanupResult.tenants_with_errors} tenant(s).</span>
              ) : null}
            </p>
            {Array.isArray(cleanupResult.summary) && cleanupResult.summary.length > 0 ? (
              <ul className="mt-2 space-y-1 max-h-40 overflow-auto text-xs">
                {cleanupResult.summary.slice(0, 12).map((row) => (
                  <li key={row.tenant_id}>
                    <strong>{row.tenant_name}</strong>
                    {row.error ? (
                      <span className="text-red-700"> — error: {row.error}</span>
                    ) : (
                      <>
                        {row.deleted_ids.length ? ` — borrar IDs: ${row.deleted_ids.join(', ')}` : ''}
                        {row.skipped_ids.length ? ` — omitidos (reservas): ${row.skipped_ids.join(', ')}` : ''}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-blue-800">No se encontraron stubs duplicados en este lote.</p>
            )}
          </div>
        ) : null}
      </div>

      {duplicateGroups.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-950 mb-2">⚠️ Posibles cuentas duplicadas ({duplicateGroups.length})</h2>
          <p className="text-sm text-amber-900 mb-3">
            Mismo nombre o parte local del email distinta (ej. Gmail vs Yahoo). Revisa Polar y unifica el plan en el tenant correcto.
          </p>
          <ul className="space-y-3 text-sm">
            {duplicateGroups.slice(0, 8).map((g) => (
              <li key={`${g.reason}-${g.key}`} className="bg-white/80 rounded-md p-3 border border-amber-200">
                <span className="font-medium text-gray-800">
                  {g.reason === 'name' ? 'Nombre' : 'Email local'}: {g.key}
                </span>
                <ul className="mt-1 text-gray-700 list-disc list-inside">
                  {g.tenants.map((t) => (
                    <li key={t.id}>
                      {t.email} · {t.name} · <code className="text-xs">{t.id.slice(0, 8)}…</code>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando tenants...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <p className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100 sm:hidden">
            Desliza horizontalmente para ver todas las columnas →
          </p>
          <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Habitaciones
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Email onboarding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Progreso onboarding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Última acción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Fecha Creación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Acción
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                    No hay tenants registrados
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => {
                  const emailStatus = String(tenant.onboarding_email_status || '').toLowerCase()
                  const needsResend =
                    !emailStatus ||
                    emailStatus === 'opened' ||
                    emailStatus === 'sent' ||
                    emailStatus === 'failed' ||
                    emailStatus === 'bounced' ||
                    tenant.onboarding_status === 'pending' ||
                    tenant.onboarding_status === 'in_progress'
                  return (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{tenant.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {tenant.plan_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                        tenant.status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.current_rooms} / {tenant.rooms_limit_display ?? tenant.max_rooms}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${onboardingBadgeClasses(
                          tenant.onboarding_email_status
                        )}`}
                        title={onboardingTitle(
                          tenant.onboarding_email_status,
                          tenant.onboarding_status === 'completed'
                        )}
                      >
                        {onboardingLabel(tenant.onboarding_email_status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {tenantOnboardingProgressLabel(tenant.onboarding_status) || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {tenant.onboarding_email_clicked_at
                        ? `Clic: ${formatShortDateTime(tenant.onboarding_email_clicked_at)}`
                        : tenant.onboarding_email_opened_at
                          ? `Abierto: ${formatShortDateTime(tenant.onboarding_email_opened_at)}`
                          : tenant.onboarding_email_sent_at
                            ? `Registro: ${formatShortDateTime(tenant.onboarding_email_sent_at)}`
                            : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tenant.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {needsResend && tenant.onboarding_status !== 'completed' ? (
                        <button
                          type="button"
                          disabled={resendBusy === tenant.email.toLowerCase() || recoverLoading}
                          onClick={() => void sendRecoverOnboarding(tenant.email, false)}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50"
                          title="Regenera enlace + temp y reenvía el email de acceso"
                        >
                          {resendBusy === tenant.email.toLowerCase() ? '…' : 'Reenviar'}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                  )
                })
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}

