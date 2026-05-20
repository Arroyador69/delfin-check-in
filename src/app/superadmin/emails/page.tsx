'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Audience = 'pending' | 'all' | 'selected'

interface CampaignRow {
  campaign_key: string
  sent_count: number
  opened_count: number
  subject?: string
  first_sent_at?: string
}

interface CampaignDetailRow {
  id: string
  email: string
  name: string | null
  sent_at: string
  opened: boolean
  opened_at: string | null
  status: string
}

type DetailFilter = 'all' | 'opened' | 'not_opened'

const BROADCAST_CHUNK_SIZE = 3

export default function SuperAdminEmails() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [stats, setStats] = useState({ total: 0, pending: 0, activated: 0 })
  const [testEmail, setTestEmail] = useState('')
  const [recentCampaigns, setRecentCampaigns] = useState<CampaignRow[]>([])

  const [testSending, setTestSending] = useState(false)
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [broadcastProgress, setBroadcastProgress] = useState<{
    current: number
    total: number
  } | null>(null)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

  const [selectedCampaignKey, setSelectedCampaignKey] = useState<string | null>(null)
  const [campaignDetail, setCampaignDetail] = useState<CampaignDetailRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailFilter, setDetailFilter] = useState<DetailFilter>('all')

  const [form, setForm] = useState({
    subject: '',
    message: '',
    audience: 'pending' as Audience,
    selectedEmailsRaw: '',
  })

  useEffect(() => {
    void loadConfig()
  }, [])

  useEffect(() => {
    const selected = searchParams.get('selected')
    if (selected) {
      const emails = selected
        .split(',')
        .map((e) => decodeURIComponent(e.trim()))
        .filter(Boolean)
        .join('\n')
      setForm((prev) => ({
        ...prev,
        audience: 'selected',
        selectedEmailsRaw: emails,
      }))
    }
  }, [searchParams])

  const loadConfig = async () => {
    try {
      setLoading(true)
      setForbidden(false)
      const res = await fetch('/api/superadmin/emails/waitlist-broadcast', {
        credentials: 'include',
      })
      const data = await res.json()
      if (res.status === 403) {
        setForbidden(true)
        return
      }
      if (!res.ok || !data.success) {
        setError(data.error || 'No se pudo cargar')
        return
      }
      setStats(data.stats || { total: 0, pending: 0, activated: 0 })
      setTestEmail(data.defaultTestEmail || '')
      setRecentCampaigns(data.recentCampaigns || [])
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  const fetchCampaignDetail = async (campaignKey: string) => {
    setDetailLoading(true)
    setSelectedCampaignKey(campaignKey)
    setDetailFilter('all')
    try {
      const res = await fetch(
        `/api/superadmin/emails/waitlist-broadcast?campaign_key=${encodeURIComponent(campaignKey)}`,
        { credentials: 'include' }
      )
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'No se pudo cargar el detalle')
        return
      }
      setCampaignDetail(data.detail || [])
    } catch {
      setError('Error al cargar detalle de campaña')
    } finally {
      setDetailLoading(false)
    }
  }

  const parseSelectedEmails = (): string[] => {
    return form.selectedEmailsRaw
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@'))
  }

  const recipientCount = () => {
    if (form.audience === 'pending') return stats.pending
    if (form.audience === 'all') return stats.total
    return parseSelectedEmails().length
  }

  const sendTest = async (e: React.FormEvent) => {
    e.preventDefault()
    setTestSending(true)
    setFeedback('')
    setError('')
    try {
      const res = await fetch('/api/superadmin/emails/waitlist-broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'test',
          subject: form.subject,
          message: form.message,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || data.message || 'Error al enviar prueba')
        return
      }
      setFeedback(data.message || 'Prueba enviada')
      void loadConfig()
    } catch {
      setError('Error de red')
    } finally {
      setTestSending(false)
    }
  }

  const sendBroadcast = async () => {
    const count = recipientCount()
    if (count === 0) {
      setError('No hay destinatarios para enviar')
      return
    }
    if (
      !confirm(
        `¿Enviar este email a ${count} persona(s) de la waitlist?\n\nAsunto: ${form.subject}\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return
    }

    setBroadcastSending(true)
    setBroadcastProgress({ current: 0, total: count })
    setFeedback('')
    setError('')

    let campaignKey = ''
    let offset = 0
    let totalSent = 0

    try {
      while (true) {
        const body: Record<string, unknown> = {
          mode: 'broadcast',
          subject: form.subject,
          message: form.message,
          audience: form.audience,
          confirmSend: true,
          chunkOffset: offset,
          chunkSize: BROADCAST_CHUNK_SIZE,
        }
        if (campaignKey) body.campaignKey = campaignKey
        if (form.audience === 'selected') {
          body.emails = parseSelectedEmails()
        }

        const res = await fetch('/api/superadmin/emails/waitlist-broadcast', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Error en el envío')
          return
        }

        campaignKey = data.campaign_key || campaignKey
        totalSent += data.sent ?? 0
        const processed = data.processed ?? offset
        const total = data.total ?? count

        setBroadcastProgress({ current: processed, total })

        if (data.done) {
          setFeedback(data.message || `Enviados ${totalSent} de ${total} emails`)
          void loadConfig()
          if (campaignKey) void fetchCampaignDetail(campaignKey)
          break
        }

        offset = processed
      }
    } catch {
      setError('Error de red durante el envío')
    } finally {
      setBroadcastSending(false)
      setBroadcastProgress(null)
    }
  }

  const formatCampaignDate = (key: string, fallback?: string) => {
    if (fallback) {
      return new Date(fallback).toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
    const m = key.match(/(\d{4})_(\d{2})_(\d{2})_(\d{2})(\d{2})/)
    if (!m) return key
    return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`
  }

  const filteredDetail = campaignDetail.filter((r) => {
    if (detailFilter === 'opened') return r.opened
    if (detailFilter === 'not_opened') return !r.opened
    return true
  })

  const progressPct =
    broadcastProgress && broadcastProgress.total > 0
      ? Math.min(100, Math.round((broadcastProgress.current / broadcastProgress.total) * 100))
      : 0

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    )
  }

  if (forbidden) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900">📬 Comunicación waitlist</h1>
        <p className="mt-4 text-gray-600">
          Solo disponible para la cuenta oficial de plataforma (superadmin).
        </p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">📬 Email — Waitlist</h1>
        <p className="text-gray-700 mt-2">
          Comunícate con quien está en la <strong>lista de espera</strong>: novedades, marketing,
          recordatorios. Plantilla Delfín; tú escribes solo texto (sin HTML). No es onboarding ni
          emails a tenants.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          <Link href="/superadmin/waitlist" className="text-blue-600 hover:underline">
            Gestionar waitlist →
          </Link>{' '}
          (activar usuarios, encuesta, selección manual).
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-gray-600">En waitlist</div>
        </div>
        <div className="bg-amber-50 rounded-lg shadow p-4 border border-amber-200">
          <div className="text-2xl font-bold text-amber-800">{stats.pending}</div>
          <div className="text-sm text-amber-700">Pendientes</div>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-800">{stats.activated}</div>
          <div className="text-sm text-green-700">Ya activados</div>
        </div>
      </div>

      <section className="bg-white rounded-xl shadow border p-6 mb-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Redactar mensaje</h2>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">Asunto</label>
          <input
            type="text"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Ej.: Novedades de Delfín Check-in — marzo 2026"
            maxLength={200}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">
            Mensaje (texto plano)
          </label>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm leading-relaxed"
            rows={10}
            maxLength={8000}
            placeholder={'Escribe aquí tu mensaje.\n\nPuedes usar párrafos separados por una línea en blanco.\n\nEj.: Gracias por estar en la lista de espera. En breve abriremos más plazas...'}
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Se envuelve en la plantilla de la waitlist (cabecera 🐬, pie legal). No editas HTML.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">Destinatarios</label>
          <select
            value={form.audience}
            onChange={(e) => setForm({ ...form, audience: e.target.value as Audience })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            disabled={broadcastSending}
          >
            <option value="pending">Solo pendientes ({stats.pending})</option>
            <option value="all">Toda la waitlist ({stats.total})</option>
            <option value="selected">Lista manual (emails abajo)</option>
          </select>
        </div>

        {form.audience === 'selected' && (
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1">
              Emails (separados por coma o salto de línea)
            </label>
            <textarea
              value={form.selectedEmailsRaw}
              onChange={(e) => setForm({ ...form, selectedEmailsRaw: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
              rows={4}
              placeholder="a@ejemplo.com, b@ejemplo.com"
              disabled={broadcastSending}
            />
          </div>
        )}

        {broadcastProgress && (
          <div
            className="rounded-xl border border-blue-200 bg-blue-50/80 p-4"
            role="status"
            aria-live="polite"
          >
            <div className="flex justify-between items-center mb-2 text-sm">
              <span className="font-medium text-blue-900">Enviando campaña…</span>
              <span className="text-blue-800 tabular-nums">
                {broadcastProgress.current} / {broadcastProgress.total}
              </span>
            </div>
            <div className="w-full h-3 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-blue-700 mt-2">{progressPct}% — no cierres esta pestaña</p>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {feedback && !broadcastSending && (
          <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {feedback}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-100">
          <form onSubmit={sendTest} className="flex-1">
            <p className="text-xs text-amber-800 mb-2">
              Prueba a <strong>{testEmail}</strong> (tu cuenta, asunto con [PRUEBA])
            </p>
            <button
              type="submit"
              disabled={
                testSending ||
                broadcastSending ||
                !form.subject.trim() ||
                !form.message.trim()
              }
              className="w-full px-4 py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {testSending ? 'Enviando prueba…' : 'Enviar prueba a mi email'}
            </button>
          </form>
          <div className="flex-1">
            <p className="text-xs text-gray-600 mb-2">
              Envío real: <strong>{recipientCount()}</strong> destinatario(s)
            </p>
            <button
              type="button"
              onClick={() => void sendBroadcast()}
              disabled={
                broadcastSending || !form.subject.trim() || !form.message.trim() || recipientCount() === 0
              }
              className="w-full px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {broadcastSending
                ? `Enviando… ${broadcastProgress?.current ?? 0}/${broadcastProgress?.total ?? recipientCount()}`
                : `Enviar a waitlist (${recipientCount()})`}
            </button>
          </div>
        </div>
      </section>

      {recentCampaigns.length > 0 && (
        <section className="bg-white rounded-xl shadow border p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h3 className="font-bold text-gray-900">Campañas recientes (tracking)</h3>
            <button
              type="button"
              onClick={() => void loadConfig()}
              className="text-sm text-blue-600 hover:underline"
            >
              Actualizar lista
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Pulsa una campaña para ver cada email y quién abrió el mensaje (pixel de apertura).
          </p>
          <div className="space-y-2">
            {recentCampaigns.map((c) => {
              const isSelected = selectedCampaignKey === c.campaign_key
              const openRate =
                c.sent_count > 0 ? Math.round((c.opened_count / c.sent_count) * 100) : 0
              return (
                <button
                  key={c.campaign_key}
                  type="button"
                  onClick={() => void fetchCampaignDetail(c.campaign_key)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                    isSelected
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">
                        {c.subject || 'Comunicación waitlist'}
                      </p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">
                        {formatCampaignDate(c.campaign_key, c.first_sent_at)}
                      </p>
                    </div>
                    <div className="text-sm text-gray-700 text-right shrink-0">
                      <span className="font-semibold text-blue-700">{c.opened_count}</span> abiertos
                      <span className="text-gray-400"> / </span>
                      {c.sent_count} enviados
                      <span className="text-gray-500 text-xs block">({openRate}%)</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {selectedCampaignKey && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h4 className="font-semibold text-gray-900">
                  Detalle: {selectedCampaignKey}
                </h4>
                {detailLoading && (
                  <span className="text-sm text-gray-500">Cargando…</span>
                )}
              </div>

              {!detailLoading && campaignDetail.length > 0 && (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(
                      [
                        ['all', `Todos (${campaignDetail.length})`],
                        [
                          'opened',
                          `Abiertos (${campaignDetail.filter((r) => r.opened).length})`,
                        ],
                        [
                          'not_opened',
                          `Sin abrir (${campaignDetail.filter((r) => !r.opened).length})`,
                        ],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setDetailFilter(key)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                          detailFilter === key
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Email</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Nombre</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Enviado</th>
                          <th className="text-left py-2 px-3 font-medium text-gray-700">Abierto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDetail.map((r) => (
                          <tr
                            key={r.id}
                            className={`border-t border-gray-100 ${
                              r.opened ? 'bg-green-50/50' : ''
                            }`}
                          >
                            <td className="py-2 px-3 font-mono text-xs">{r.email}</td>
                            <td className="py-2 px-3 text-gray-600">{r.name || '—'}</td>
                            <td className="py-2 px-3 text-gray-600 whitespace-nowrap">
                              {new Date(r.sent_at).toLocaleString('es-ES')}
                            </td>
                            <td className="py-2 px-3">
                              {r.opened ? (
                                <span className="text-green-800 font-medium" title={r.opened_at || ''}>
                                  Sí
                                  {r.opened_at && (
                                    <span className="block text-xs font-normal text-green-700">
                                      {new Date(r.opened_at).toLocaleString('es-ES')}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {detailFilter === 'opened' && filteredDetail.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-xs font-medium text-green-900 mb-2">
                        Emails que abrieron ({filteredDetail.length})
                      </p>
                      <p className="text-xs text-green-800 font-mono break-all leading-relaxed">
                        {filteredDetail.map((r) => r.email).join(', ')}
                      </p>
                    </div>
                  )}
                </>
              )}

              {!detailLoading && campaignDetail.length === 0 && (
                <p className="text-sm text-gray-500">Sin registros de tracking para esta campaña.</p>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
