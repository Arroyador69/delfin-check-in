'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

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

export default function ProgrammaticPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
    
    // Auto-refresh cada 5 minutos
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/superadmin/programmatic/metrics?days=30')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Error obteniendo métricas:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Cargando métricas...</div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-600">Error cargando métricas</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">📄 Páginas Programáticas</h1>
        <Link
          href="/superadmin/programmatic/manage"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Gestionar Plantillas
        </Link>
      </div>

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
    </div>
  )
}

