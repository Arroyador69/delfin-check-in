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
  if (!s) return 'sin registro'
  if (s === 'pending') return 'pendiente envío'
  if (s === 'sent') return 'enviado'
  if (s === 'delivered') return 'entregado'
  if (s === 'opened') return 'abierto'
  if (s === 'clicked') return 'clic'
  if (s === 'failed') return 'fallido'
  if (s === 'bounced') return 'rebotado'
  return s
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    No hay tenants registrados
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
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
                        title={
                          tenant.onboarding_email_id
                            ? `email_tracking.id=${tenant.onboarding_email_id}`
                            : tenant.onboarding_status === 'completed'
                              ? 'Sin tracking de email, pero el onboarding del tenant está marcado como completado en BD.'
                              : 'Sin registro en email_tracking (histórico previo o no se trackeó el envío).'
                        }
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}

