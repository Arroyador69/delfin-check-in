'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Audience = 'pending' | 'all' | 'selected'

interface CampaignRow {
  campaign_key: string
  sent_count: number
  opened_count: number
}

export default function SuperAdminEmails() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [stats, setStats] = useState({ total: 0, pending: 0, activated: 0 })
  const [testEmail, setTestEmail] = useState('')
  const [recentCampaigns, setRecentCampaigns] = useState<CampaignRow[]>([])

  const [testSending, setTestSending] = useState(false)
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState('')

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
      const res = await fetch('/api/superadmin/emails/waitlist-broadcast')
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
    setFeedback('')
    setError('')
    try {
      const body: Record<string, unknown> = {
        mode: 'broadcast',
        subject: form.subject,
        message: form.message,
        audience: form.audience,
        confirmSend: true,
      }
      if (form.audience === 'selected') {
        body.emails = parseSelectedEmails()
      }

      const res = await fetch('/api/superadmin/emails/waitlist-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error en el envío')
        return
      }
      setFeedback(data.message || `Enviados ${data.sent}`)
      void loadConfig()
    } catch {
      setError('Error de red')
    } finally {
      setBroadcastSending(false)
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
    <div className="container mx-auto p-6 max-w-3xl">
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
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {feedback && (
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
              disabled={testSending || !form.subject.trim() || !form.message.trim()}
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
              {broadcastSending ? 'Enviando…' : `Enviar a waitlist (${recipientCount()})`}
            </button>
          </div>
        </div>
      </section>

      {recentCampaigns.length > 0 && (
        <section className="bg-gray-50 rounded-lg border p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Campañas recientes (tracking)</h3>
          <ul className="space-y-2 text-sm">
            {recentCampaigns.map((c) => (
              <li key={c.campaign_key} className="flex justify-between gap-4 text-gray-700">
                <span className="font-mono text-xs">{c.campaign_key}</span>
                <span>
                  {c.sent_count} enviados · {c.opened_count} abiertos
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
