'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

type ProgressStep = { step: string; message: string; topic?: string; article?: { slug: string; title: string; url: string } }

function ProbarArticuloCard({
  loading,
  steps,
  article,
  error,
  onProbar,
  onCreated,
}: {
  loading: boolean
  steps: ProgressStep[]
  article: { slug: string; title: string; url: string } | null
  error: string | null
  onProbar: () => void
  onCreated?: () => void
}) {
  // Cuando hay artículo creado, notificar para refrescar rastro
  useEffect(() => {
    if (article) onCreated?.()
  }, [article, onCreated])

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500 ring-2 ring-green-100">
      <h2 className="text-xl font-bold mb-2 text-gray-900">📝 Probar creación de artículo</h2>
      <p className="text-sm text-gray-600 mb-4">
        Crea <strong>1 artículo</strong> (1600–2000 palabras) con un tema aleatorio de los 10 definidos en código. Se publica en <strong>articulos/*.html</strong> con header, footer, popup, waitlist y FAQ. Verás el progreso paso a paso.
      </p>
      <button
        onClick={onProbar}
        disabled={loading}
        className="px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold text-base shadow"
      >
        {loading ? 'Creando artículo...' : 'Probar: crear 1 artículo'}
      </button>

      {steps.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-700 mb-2">Progreso:</p>
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
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
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
  )
}

interface KPI {
  totalPages: number
  publishedPages: number
  indexedPages: number
  scheduledPages: number
  createdLastDays: number
  publishedLastDays: number
  avgSeoScore: number
  avgLocalSignals: number
  lowSeoPages: number
}

interface Metrics {
  kpis: KPI
  indexation: {
    indexedCount: number
    notIndexedCount: number
    avgDaysToIndex: number
    indexationRate: number
  }
  traffic: {
    totalSessions: number
    totalClicks: number
    totalImpressions: number
    avgCtr: number
    avgPosition: number
    totalConversions: number
    totalRevenue: number
    conversionRate: number
  }
  topPages: Array<{
    id: string
    slug: string
    title: string
    type: string
    totalSessions: number
    totalConversions: number
    totalRevenue: number
    conversionRate: number
  }>
  lowPerformance: Array<{
    id: string
    slug: string
    title: string
    type: string
    publishedAt: string
    totalSessions: number
  }>
  byTemplate: Array<{
    templateName: string
    type: string
    totalPages: number
    published: number
    avgSeoScore: number
    avgLocalSignals: number
  }>
  growth: Array<{
    date: string
    pagesCreated: number
    pagesPublished: number
  }>
}

interface ProgrammaticPageRow {
  id: string
  slug: string
  title: string
  type: string
  status: string
  published_at: string | null
  created_at: string
  canonical_url: string | null
}

function RastroArticulosCard() {
  const [pages, setPages] = useState<ProgrammaticPageRow[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const fetchPages = async () => {
      try {
        const r = await fetch('/api/superadmin/programmatic/pages?type=article&limit=20')
        if (r.ok) {
          const data = await r.json()
          setPages(data.pages || [])
        }
      } catch (_) {}
      finally { setLoading(false) }
    }
    fetchPages()
  }, [])

  return (
    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h2 className="text-xl font-bold text-gray-900">📋 Rastro de artículos creados</h2>
        <Link href="/superadmin/blog-manager" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          Ver todos en Monitoreo de artículos →
        </Link>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Los artículos generados aquí (Probar o cron) se guardan en <strong>blog_articles</strong> y <strong>programmatic_pages</strong> y aparecen también en <strong>Monitoreo de artículos / Blog</strong> para edición y seguimiento.
      </p>
      {loading ? (
        <p className="text-sm text-gray-500">Cargando listado...</p>
      ) : pages.length === 0 ? (
        <p className="text-sm text-gray-500">Aún no hay artículos programáticos (tipo article). Usa &quot;Probar: crear 1 artículo&quot; para crear el primero.</p>
      ) : (
        <ul className="space-y-2 max-h-64 overflow-y-auto">
          {pages.map((p) => (
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
  )
}

export default function ProgrammaticPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [rastroRefresh, setRastroRefresh] = useState(0)
  const [probarLoading, setProbarLoading] = useState(false)
  const [probarSteps, setProbarSteps] = useState<ProgressStep[]>([])
  const [probarArticle, setProbarArticle] = useState<{ slug: string; title: string; url: string } | null>(null)
  const [probarError, setProbarError] = useState<string | null>(null)

  const runProbar = useCallback(async () => {
    setProbarLoading(true)
    setProbarSteps([])
    setProbarArticle(null)
    setProbarError(null)
    try {
      const r = await fetch('/api/superadmin/programmatic/cron-articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stream: true, count: 1 }),
      })
      if (!r.ok || !r.body) {
        const data = await r.json().catch(() => ({}))
        setProbarError(data.error || `Error ${r.status}`)
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
            setProbarSteps((prev) => [...prev, { step: ev.step || '', message: ev.message || '', topic: ev.topic, article: ev.article }])
            if (ev.step === 'done' && ev.article) setProbarArticle(ev.article)
            if (ev.step === 'error') setProbarError(ev.message || '')
          } catch (_) {}
        }
      }
    } catch (e) {
      setProbarError(String(e))
    } finally {
      setProbarLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      setMetricsLoading(true)
      const response = await fetch('/api/superadmin/programmatic/metrics?days=30')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Error obteniendo métricas:', error)
    } finally {
      setMetricsLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Primera línea: título + botón Probar + enlace a página dedicada */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">📄 Páginas Programáticas</h1>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={runProbar}
            disabled={probarLoading}
            className="px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold shadow"
          >
            {probarLoading ? 'Creando...' : 'Probar: crear 1 artículo'}
          </button>
          <Link
            href="/superadmin/programmatic/crear-articulo"
            className="px-4 py-2 border-2 border-green-600 text-green-700 rounded-lg hover:bg-green-50 font-medium"
          >
            Página solo Crear artículo
          </Link>
          <Link href="/superadmin/blog-manager" className="text-sm text-gray-600 hover:text-blue-600">
            Ver artículos en Blog →
          </Link>
        </div>
      </div>

      {/* Siempre visible: Probar (card con progreso) + Rastro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProbarArticuloCard
          loading={probarLoading}
          steps={probarSteps}
          article={probarArticle}
          error={probarError}
          onProbar={runProbar}
          onCreated={() => setRastroRefresh((n) => n + 1)}
        />
        <RastroArticulosCard key={rastroRefresh} />
      </div>

      {/* Métricas: cargando o contenido */}
      {metricsLoading ? (
        <div className="text-center py-8 text-gray-500">Cargando métricas...</div>
      ) : !metrics ? (
        <div className="text-center py-8 text-red-600">Error cargando métricas</div>
      ) : (
        <>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-800">Total Páginas</div>
          <div className="text-2xl font-bold text-gray-900">{metrics.kpis.totalPages}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-800">Publicadas</div>
          <div className="text-2xl font-bold text-green-600">{metrics.kpis.publishedPages}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-800">Indexadas</div>
          <div className="text-2xl font-bold text-blue-600">{metrics.kpis.indexedPages}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-800">Programadas</div>
          <div className="text-2xl font-bold text-orange-600">{metrics.kpis.scheduledPages}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-800">SEO Promedio</div>
          <div className="text-2xl font-bold text-gray-900">{((metrics.kpis.avgSeoScore ?? 0)).toFixed(1)}/100</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-800">Tasa Indexación</div>
          <div className="text-2xl font-bold text-gray-900">{((metrics.indexation.indexationRate ?? 0)).toFixed(1)}%</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-800">Sesiones (30d)</div>
          <div className="text-2xl font-bold text-gray-900">{(metrics.traffic.totalSessions ?? 0).toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-800">Tasa Conversión</div>
          <div className="text-2xl font-bold text-gray-900">{((metrics.traffic.conversionRate ?? 0)).toFixed(2)}%</div>
        </div>
      </div>

      {/* Tráfico */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900">📊 Tráfico (últimos 30 días)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-800">Impresiones</div>
            <div className="text-xl font-bold text-gray-900">{metrics.traffic.totalImpressions.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-800">Clics</div>
            <div className="text-xl font-bold text-gray-900">{metrics.traffic.totalClicks.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-800">CTR</div>
            <div className="text-xl font-bold text-gray-900">{((metrics.traffic.avgCtr ?? 0)).toFixed(2)}%</div>
          </div>
          <div>
            <div className="text-sm text-gray-800">Posición Media</div>
            <div className="text-xl font-bold text-gray-900">{((metrics.traffic.avgPosition ?? 0)).toFixed(1)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-800">Conversiones</div>
            <div className="text-xl font-bold text-green-600">{metrics.traffic.totalConversions ?? 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-800">Ingresos</div>
            <div className="text-xl font-bold text-green-600">€{((metrics.traffic.totalRevenue ?? 0)).toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Top Páginas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900">🏆 Top Páginas por Conversión</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 text-gray-800 font-semibold">Título</th>
                <th className="text-right p-2 text-gray-800 font-semibold">Sesiones</th>
                <th className="text-right p-2 text-gray-800 font-semibold">Conversiones</th>
                <th className="text-right p-2 text-gray-800 font-semibold">Tasa</th>
                <th className="text-right p-2 text-gray-800 font-semibold">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {metrics.topPages.map((page) => (
                <tr key={page.id} className="border-b">
                  <td className="p-2">
                    <a 
                      href={`https://delfincheckin.com/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {page.title}
                    </a>
                  </td>
                  <td className="text-right p-2">{(page.totalSessions ?? 0).toLocaleString()}</td>
                  <td className="text-right p-2 text-green-600 font-bold">{page.totalConversions ?? 0}</td>
                  <td className="text-right p-2">{((page.conversionRate ?? 0)).toFixed(2)}%</td>
                  <td className="text-right p-2">€{((page.totalRevenue ?? 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Páginas con Bajo Rendimiento */}
      {metrics.lowPerformance.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">⚠️ Páginas con Bajo Rendimiento (0 sesiones en 14 días)</h2>
          <div className="space-y-2">
            {metrics.lowPerformance.map((page) => (
              <div key={page.id} className="flex items-center justify-between p-2 border-b">
                <div>
                  <a 
                    href={`https://delfincheckin.com/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {page.title}
                  </a>
                  <div className="text-sm text-gray-500">
                    Publicada: {new Date(page.publishedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-red-600 font-bold">0 sesiones</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Por Plantilla con Semáforos */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900">📋 Estadísticas por Plantilla (con Semáforos)</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 text-gray-800 font-semibold">Plantilla</th>
                <th className="text-left p-2 text-gray-800 font-semibold">Tipo</th>
                <th className="text-right p-2 text-gray-800 font-semibold">Total</th>
                <th className="text-right p-2 text-gray-800 font-semibold">Publicadas</th>
                <th className="text-right p-2 text-gray-800 font-semibold">Sesiones/día</th>
                <th className="text-right p-2 text-gray-800 font-semibold">Objetivo</th>
                <th className="text-right p-2 text-gray-800 font-semibold">CR %</th>
                <th className="text-right p-2 text-gray-800 font-semibold">Objetivo CR</th>
                <th className="text-center p-2 text-gray-800 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {metrics.byTemplate.map((template: any, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-2">{template.templateName}</td>
                  <td className="p-2">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {template.type}
                    </span>
                  </td>
                  <td className="text-right p-2">{template.totalPages}</td>
                  <td className="text-right p-2">{template.published}</td>
                  <td className={`text-right p-2 font-bold ${
                    (template.avgSessionsPerDay ?? 0) >= template.targetSessionsPerDay ? 'text-green-600' :
                    (template.avgSessionsPerDay ?? 0) >= template.targetSessionsPerDay * 0.7 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {((template.avgSessionsPerDay ?? 0)).toFixed(2)}
                  </td>
                  <td className="text-right p-2 text-gray-500">{template.targetSessionsPerDay}</td>
                  <td className={`text-right p-2 font-bold ${
                    (template.avgConversionRate ?? 0) >= template.targetConversionRate ? 'text-green-600' :
                    (template.avgConversionRate ?? 0) >= template.targetConversionRate * 0.7 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {((template.avgConversionRate ?? 0)).toFixed(2)}%
                  </td>
                  <td className="text-right p-2 text-gray-500">{template.targetConversionRate}%</td>
                  <td className="text-center p-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      template.performanceStatus === 'green' ? 'bg-green-100 text-green-700' :
                      template.performanceStatus === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {template.performanceStatus === 'green' ? '✓' :
                       template.performanceStatus === 'yellow' ? '⚠' : '✗'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Semáforos:</strong> Verde = ✓ Objetivo cumplido | Amarillo = ⚠ Entre 70-100% del objetivo | Rojo = ✗ Menos del 70%
          </p>
          <p className="text-sm text-gray-700 mt-2">
            <strong>Recomendación:</strong> Si Local &lt; 1.2 sesiones/pág/día → bajar a 26-28/día y subir Problema a 12-14/día.
            Si Problema &gt; 0.6% CR → priorizar hasta 14-16/día.
          </p>
        </div>
      </div>
        </>
      )}
    </div>
  )
}

