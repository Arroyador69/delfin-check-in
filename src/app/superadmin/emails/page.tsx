'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  REACTIVATION_BROADCAST_DEFAULTS,
  buildPlatformBroadcastEmailHtml,
} from '@/lib/platform-broadcast-email'

interface Tenant {
  id: string
  name: string
  email: string
  status: string
  onboarding_status?: string | null
}

type RecipientMode =
  | 'tenant_ids'
  | 'all_active'
  | 'onboarding_pending'
  | 'onboarding_incomplete'

type AudienceCounts = {
  all_active: number
  onboarding_pending: number
  onboarding_incomplete: number
}

const DEFAULTS = REACTIVATION_BROADCAST_DEFAULTS

export default function SuperAdminEmails() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [counts, setCounts] = useState<AudienceCounts | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('onboarding_incomplete')
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const [sending, setSending] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const [form, setForm] = useState({
    subject: DEFAULTS.subject,
    heroTitle: DEFAULTS.heroTitle,
    heroSubtitle: DEFAULTS.heroSubtitle,
    body: DEFAULTS.body,
    ctaLabel: DEFAULTS.ctaLabel,
    ctaUrl: DEFAULTS.ctaUrl,
    footerNote: DEFAULTS.footerNote,
    emailType: 'incident' as 'custom' | 'incident' | 'onboarding' | 'legal_notice' | 'upsell',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tenantsRes, countsRes] = await Promise.all([
        fetch('/api/superadmin/tenants'),
        fetch('/api/superadmin/emails/broadcast'),
      ])
      if (tenantsRes.ok) {
        const data = await tenantsRes.json()
        setTenants(data.tenants || [])
      }
      if (countsRes.ok) {
        const data = await countsRes.json()
        setCounts(data.counts || null)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (tenants.length > 0 && selectedIds.size === 0) {
      const ids = tenants
        .filter(
          (t) =>
            t.status === 'active' && t.onboarding_status !== 'completed'
        )
        .map((t) => t.id)
      setSelectedIds(new Set(ids))
    }
  }, [tenants, selectedIds.size])

  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return tenants
    return tenants.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
    )
  }, [tenants, search])

  const activeTenants = useMemo(
    () => tenants.filter((t) => t.status === 'active'),
    [tenants]
  )

  const pendingTenants = useMemo(
    () =>
      activeTenants.filter(
        (t) => !t.onboarding_status || t.onboarding_status === 'pending'
      ),
    [activeTenants]
  )

  const incompleteTenants = useMemo(
    () =>
      activeTenants.filter((t) => t.onboarding_status !== 'completed'),
    [activeTenants]
  )

  const recipientCount = selectedIds.size

  const toggleTenant = (id: string) => {
    setRecipientMode('tenant_ids')
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectFilter = (mode: RecipientMode) => {
    setRecipientMode(mode)
    if (mode === 'all_active') {
      setSelectedIds(new Set(activeTenants.map((t) => t.id)))
    } else if (mode === 'onboarding_pending') {
      setSelectedIds(new Set(pendingTenants.map((t) => t.id)))
    } else if (mode === 'onboarding_incomplete') {
      setSelectedIds(new Set(incompleteTenants.map((t) => t.id)))
    }
  }

  const openPreview = () => {
    setPreviewHtml(
      buildPlatformBroadcastEmailHtml({
        subject: form.subject,
        heroTitle: form.heroTitle,
        heroSubtitle: form.heroSubtitle,
        body: form.body,
        ctaLabel: form.ctaLabel,
        ctaUrl: form.ctaUrl,
        footerNote: form.footerNote,
      })
    )
    setShowPreview(true)
  }

  const handleSend = async () => {
    if (recipientCount === 0) {
      alert('Selecciona al menos un destinatario')
      return
    }

    if (
      !confirm(
        `¿Enviar este email con plantilla Delfín a ${recipientCount} destinatario(s)?`
      )
    ) {
      return
    }

    setSending(true)
    setLastResult(null)
    try {
      const body: Record<string, unknown> = {
        ...form,
        recipientMode: 'tenant_ids',
        tenantIds: Array.from(selectedIds),
      }

      const res = await fetch('/api/superadmin/emails/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setLastResult(data.error || 'Error al enviar')
        return
      }
      setLastResult(data.message || `Enviados ${data.successCount} emails`)
      if (data.failedCount > 0) {
        console.warn('Fallos:', data.results?.filter((r: { success: boolean }) => !r.success))
      }
    } catch (e) {
      setLastResult('Error de red al enviar')
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">📬 Comunicaciones por email</h1>
        <p className="text-gray-700 mt-2">
          Envía emails con plantilla Delfín a todos los tenants o a los que elijas. Los destinatarios
          pueden solicitar un nuevo enlace de activación desde el panel si lo necesitan.
        </p>
      </div>

      {lastResult && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            lastResult.includes('Error') || lastResult.includes('error')
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}
        >
          {lastResult}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Destinatarios */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Destinatarios</h2>

          <div className="space-y-2 mb-4">
            <FilterButton
              active={recipientMode === 'onboarding_incomplete'}
              label="Onboarding sin completar"
              count={counts?.onboarding_incomplete ?? incompleteTenants.length}
              onClick={() => selectFilter('onboarding_incomplete')}
            />
            <FilterButton
              active={recipientMode === 'onboarding_pending'}
              label="Solo pendiente (nunca empezaron)"
              count={counts?.onboarding_pending ?? pendingTenants.length}
              onClick={() => selectFilter('onboarding_pending')}
            />
            <FilterButton
              active={recipientMode === 'all_active'}
              label="Todos los tenants activos"
              count={counts?.all_active ?? activeTenants.length}
              onClick={() => selectFilter('all_active')}
            />
          </div>

          <p className="text-sm text-gray-600 mb-3">
            Se enviarán <strong>{recipientCount}</strong> email(s). También puedes marcar o
            desmarcar abajo.
          </p>

          <input
            type="search"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg mb-3 text-sm"
          />

          <div className="flex gap-2 mb-2">
            <button
              type="button"
              className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
              onClick={() => {
                setRecipientMode('tenant_ids')
                setSelectedIds((prev) => {
                  const next = new Set(prev)
                  filteredTenants.forEach((t) => next.add(t.id))
                  return next
                })
              }}
            >
              Marcar visibles
            </button>
            <button
              type="button"
              className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
              onClick={() => setSelectedIds(new Set())}
            >
              Desmarcar todos
            </button>
          </div>

          <ul className="max-h-64 overflow-y-auto border rounded-lg divide-y text-sm">
            {filteredTenants.map((t) => (
              <li key={t.id} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedIds.has(t.id)}
                  onChange={() => toggleTenant(t.id)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">{t.name}</div>
                  <div className="text-gray-500 truncate">{t.email}</div>
                  <span className="text-xs text-gray-400">
                    {t.onboarding_status === 'completed'
                      ? 'completado'
                      : t.onboarding_status || 'pendiente'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Composición */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Mensaje (plantilla Delfín)</h2>
            <button
              type="button"
              onClick={() =>
                setForm({
                  subject: DEFAULTS.subject,
                  heroTitle: DEFAULTS.heroTitle,
                  heroSubtitle: DEFAULTS.heroSubtitle,
                  body: DEFAULTS.body,
                  ctaLabel: DEFAULTS.ctaLabel,
                  ctaUrl: DEFAULTS.ctaUrl,
                  footerNote: DEFAULTS.footerNote,
                  emailType: 'incident',
                })
              }
              className="text-sm text-blue-600 hover:underline"
            >
              Restaurar texto reactivación
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Asunto</label>
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Título cabecera</label>
              <input
                value={form.heroTitle}
                onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Subtítulo cabecera</label>
              <input
                value={form.heroSubtitle}
                onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Cuerpo (párrafos separados por línea en blanco)
            </label>
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
              rows={12}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Texto del botón</label>
              <input
                value={form.ctaLabel}
                onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">URL del botón</label>
              <input
                value={form.ctaUrl}
                onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Nota al pie (caja amarilla)</label>
            <input
              value={form.footerNote}
              onChange={(e) => setForm({ ...form, footerNote: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tipo (tracking)</label>
            <select
              value={form.emailType}
              onChange={(e) =>
                setForm({ ...form, emailType: e.target.value as typeof form.emailType })
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="incident">Incidencia / aviso importante</option>
              <option value="custom">Personalizado</option>
              <option value="onboarding">Onboarding</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={openPreview}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Vista previa
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || recipientCount === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {sending ? 'Enviando…' : `Enviar a ${recipientCount} destinatario(s)`}
            </button>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold">Vista previa del email</h3>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-800"
              >
                Cerrar
              </button>
            </div>
            <iframe
              title="Vista previa email"
              srcDoc={previewHtml}
              className="flex-1 w-full min-h-[480px] border-0"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function FilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean
  label: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${
        active
          ? 'border-blue-600 bg-blue-50 text-blue-900'
          : 'border-gray-200 hover:bg-gray-50'
      }`}
    >
      <span className="font-medium">{label}</span>
      <span className="float-right text-gray-500">{count}</span>
    </button>
  )
}
