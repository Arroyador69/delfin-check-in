'use client'

import { useEffect, useMemo, useState } from 'react'

type Level = 'all' | 'error' | 'warning' | 'info'

type GroupedItem = {
  signature: string
  level: 'error' | 'warning' | 'info'
  message: string
  error_name: string | null
  url: string | null
  count: number
  last_seen: string
  sample_id: string
}

export default function SuperadminLogsPage() {
  const [stats, setStats] = useState<{ total: number; errors: number; warnings: number; last24h: number } | null>(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const [level, setLevel] = useState<Level>('all')
  const [hours, setHours] = useState<number>(24)
  const [q, setQ] = useState<string>('')

  const [items, setItems] = useState<GroupedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const queryString = useMemo(() => {
    const sp = new URLSearchParams()
    sp.set('grouped', '1')
    sp.set('level', level)
    if (hours > 0) sp.set('hours', String(hours))
    if (q.trim()) sp.set('q', q.trim())
    sp.set('limit', '200')
    return sp.toString()
  }, [level, hours, q])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoadingStats(true)
      try {
        const res = await fetch('/api/superadmin/error-logs/stats', { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!cancelled && res.ok && data?.success) setStats(data.stats)
      } finally {
        if (!cancelled) setLoadingStats(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      setErr(null)
      try {
        const res = await fetch(`/api/superadmin/error-logs?${queryString}`, { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `Error ${res.status}`)
        if (!cancelled) setItems(Array.isArray(data?.items) ? data.items : [])
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || 'Error cargando logs')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [queryString])

  const copySummary = async () => {
    const payload = {
      filters: { level, hours, q: q.trim() || null },
      stats,
      items,
    }
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    alert('Copiado al portapapeles (resumen JSON). Pégamelo en Cursor cuando quieras.')
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900">🧾 Logs (Errores y warnings)</h1>
        <p className="text-gray-700">
          Inbox interno guardado en Neon. Aquí ves lo importante sin entrar a Vercel Logs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border">
          <div className="text-xs text-gray-600">Total</div>
          <div className="text-2xl font-bold text-gray-900">{loadingStats ? '…' : stats?.total ?? 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border">
          <div className="text-xs text-gray-600">Errores</div>
          <div className="text-2xl font-bold text-red-700">{loadingStats ? '…' : stats?.errors ?? 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border">
          <div className="text-xs text-gray-600">Warnings</div>
          <div className="text-2xl font-bold text-amber-700">{loadingStats ? '…' : stats?.warnings ?? 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border">
          <div className="text-xs text-gray-600">Últimas 24h</div>
          <div className="text-2xl font-bold text-gray-900">{loadingStats ? '…' : stats?.last24h ?? 0}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 border mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Nivel</label>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={level}
              onChange={(e) => setLevel(e.target.value as Level)}
            >
              <option value="all">Todos</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Ventana (horas)</label>
            <input
              className="border rounded-md px-3 py-2 text-sm w-28"
              type="number"
              min={1}
              max={24 * 30}
              value={hours}
              onChange={(e) => setHours(Number(e.target.value || 24))}
            />
          </div>

          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs text-gray-600 mb-1">Buscar</label>
            <input
              className="border rounded-md px-3 py-2 text-sm w-full"
              placeholder="texto en message/url/stack…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={copySummary}
            className="px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-semibold hover:bg-slate-800"
          >
            Copiar resumen
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-900 rounded-lg p-3 text-sm">
          {err}
        </div>
      )}

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold text-gray-900">Entradas (agrupadas por firma)</div>
          <div className="text-sm text-gray-600">{loading ? 'Cargando…' : `${items.length} items`}</div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Nivel</th>
                <th className="text-left px-4 py-2">Mensaje</th>
                <th className="text-left px-4 py-2">URL</th>
                <th className="text-right px-4 py-2">Count</th>
                <th className="text-left px-4 py-2">Último</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.signature} className="border-t">
                  <td className="px-4 py-2">
                    <span
                      className={
                        it.level === 'error'
                          ? 'text-red-700 font-semibold'
                          : it.level === 'warning'
                            ? 'text-amber-700 font-semibold'
                            : 'text-slate-700'
                      }
                    >
                      {it.level}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-gray-900">{it.message}</div>
                    {it.error_name ? <div className="text-xs text-gray-600">{it.error_name}</div> : null}
                  </td>
                  <td className="px-4 py-2 text-gray-700">
                    {it.url ? (
                      <a className="text-blue-600 hover:underline" href={it.url} target="_blank" rel="noreferrer">
                        {it.url}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right font-semibold">{it.count}</td>
                  <td className="px-4 py-2 text-gray-700">{new Date(it.last_seen).toLocaleString()}</td>
                </tr>
              ))}
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No hay entradas con estos filtros.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

