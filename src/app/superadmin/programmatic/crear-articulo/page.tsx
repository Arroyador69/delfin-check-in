'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'

type ProgressStep = { step: string; message: string; topic?: string; article?: { slug: string; title: string; url: string } }

interface ProgrammaticPageRow {
  id: string
  slug: string
  title: string
  canonical_url: string | null
  published_at: string | null
  created_at: string
}

/**
 * Página dedicada solo a "Crear 1 artículo (Probar)".
 * URL fija: /superadmin/programmatic/crear-articulo
 * Así siempre hay una forma de acceder aunque el dashboard principal no muestre el botón.
 */
export default function CrearArticuloPage() {
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<ProgressStep[]>([])
  const [article, setArticle] = useState<{ slug: string; title: string; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rastro, setRastro] = useState<ProgrammaticPageRow[]>([])
  const [rastroLoading, setRastroLoading] = useState(true)

  const runProbar = useCallback(async () => {
    setLoading(true)
    setSteps([])
    setArticle(null)
    setError(null)
    try {
      const r = await fetch('/api/superadmin/programmatic/cron-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream: true, count: 1 }),
      })
      if (!r.ok || !r.body) {
        const data = await r.json().catch(() => ({}))
        setError(data.error || `Error ${r.status}`)
        return
      }
      const reader = r.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const ev = JSON.parse(line) as ProgressStep & { step?: string; article?: { slug: string; title: string; url: string } }
            setSteps((prev) => [...prev, { step: ev.step || '', message: ev.message || '', topic: ev.topic, article: ev.article }])
            if (ev.step === 'done' && ev.article) setArticle(ev.article)
            if (ev.step === 'error') setError(ev.message || '')
          } catch (_) {}
        }
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRastro = useCallback(async () => {
    try {
      const r = await fetch('/api/superadmin/programmatic/pages?type=article&limit=20')
      if (r.ok) {
        const data = await r.json()
        setRastro(data.pages || [])
      }
    } finally {
      setRastroLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRastro()
  }, [fetchRastro])

  useEffect(() => {
    if (article) fetchRastro()
  }, [article, fetchRastro])

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Link href="/superadmin/programmatic" className="text-gray-600 hover:text-gray-900 text-sm">
          ← Páginas Programáticas
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Crear 1 artículo (Probar)</h1>
      <p className="text-gray-600 mb-6">
        Genera un artículo de 1600–2000 palabras con un tema aleatorio (registro de viajeros, PMS, normativa…). Se publica en delfincheckin.com/articulos y en Monitoreo de artículos.
      </p>

      <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500 mb-6">
        <button
          onClick={runProbar}
          disabled={loading}
          className="w-full sm:w-auto px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold text-lg shadow"
        >
          {loading ? 'Creando artículo...' : 'Probar: crear 1 artículo'}
        </button>

        {steps.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-2">Progreso</p>
            <ul className="space-y-1 text-sm">
              {steps.map((s, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700">{s.message}</span>
                  {s.topic && <span className="text-gray-500">— {s.topic}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {article && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-semibold text-green-800 mb-1">Artículo creado y publicado</p>
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
              {article.title}
            </a>
            <p className="text-xs text-gray-600 mt-1">{article.url}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="text-lg font-bold text-gray-900">Rastro de artículos creados</h2>
          <Link href="/superadmin/blog-manager" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Ver en Monitoreo de artículos →
          </Link>
        </div>
        {rastroLoading ? (
          <p className="text-sm text-gray-500">Cargando...</p>
        ) : rastro.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no hay artículos. Pulsa el botón de arriba para crear el primero.</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {rastro.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 text-sm border-b border-gray-100 pb-2">
                <a href={p.canonical_url || `https://delfincheckin.com/articulos/${p.slug}.html`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate flex-1">
                  {p.title}
                </a>
                <span className="text-gray-400 shrink-0">
                  {p.published_at ? new Date(p.published_at).toLocaleDateString() : new Date(p.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
