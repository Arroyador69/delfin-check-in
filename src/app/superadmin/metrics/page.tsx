'use client'

import { useEffect, useState } from 'react'

interface Metrics {
  traction: any
  revenue: any
  retention: any
  legal: any
  email: any
  funnel: any
}

export default function SuperAdminMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month')

  useEffect(() => {
    fetchMetrics()
  }, [period])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/superadmin/metrics?period=${period}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMetrics(data.metrics)
        }
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando métricas...</p>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-red-600">Error cargando métricas</p>
          <button
            onClick={fetchMetrics}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Métricas del SuperAdmin</h1>
          <p className="text-gray-700 mt-2">Métricas completas de la plataforma</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="day">Hoy</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mes</option>
          <option value="year">Este año</option>
        </select>
      </div>

      {/* TRACCIÓN Y USO */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">🌊 Tracción y Uso</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Usuarios Totales" value={metrics.traction.totalUsers} />
          <MetricCard label="Usuarios Activos" value={metrics.traction.activeUsers} />
          <MetricCard label="DAU" value={metrics.traction.dau} />
          <MetricCard label="WAU" value={metrics.traction.wau} />
          <MetricCard label="MAU" value={metrics.traction.mau} />
          <MetricCard label="Propiedades Activas" value={metrics.traction.activeProperties} />
          <MetricCard label="Check-ins" value={metrics.traction.checkins} />
          <MetricCard label="XML Enviados" value={metrics.traction.xmlSent} />
          <MetricCard label="Errores XML" value={metrics.traction.xmlErrors} />
          <MetricCard label="Modo Offline (%)" value={`${metrics.traction.offlineUsagePercent.toFixed(1)}%`} />
        </div>
      </div>

      {/* INGRESOS */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">💰 Ingresos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard label="MRR" value={`${metrics.revenue.mrr.toFixed(2)}€`} />
          <MetricCard label="ARR" value={`${metrics.revenue.arr.toFixed(2)}€`} />
          <MetricCard label="ARPU" value={`${metrics.revenue.arpu.toFixed(2)}€`} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Ingresos por Plan</h3>
            <div className="space-y-2">
              {metrics.revenue.revenueByPlan.map((r: any, i: number) => (
                <div key={i} className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>{r.plan}</span>
                  <span className="font-semibold">{r.revenue.toFixed(2)}€</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Ingresos por País</h3>
            <div className="space-y-2">
              {metrics.revenue.revenueByCountry.map((r: any, i: number) => (
                <div key={i} className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>{r.country}</span>
                  <span className="font-semibold">{r.revenue.toFixed(2)}€</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">MRR Histórico</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {metrics.revenue.mrrHistory.slice(-6).map((r: any, i: number) => (
                <div key={i} className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>{new Date(r.month).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}</span>
                  <span className="font-semibold">{r.mrr.toFixed(2)}€</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RETENCIÓN Y CHURN */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">🔁 Retención y Churn</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard label="Churn Rate (%)" value={`${metrics.retention.churnRate.toFixed(2)}%`} />
          <MetricCard label="Usuarios Cancelados" value={metrics.retention.usersCancelled} />
          <MetricCard label="LTV Promedio" value={`${metrics.retention.avgLTV.toFixed(2)}€`} />
          <MetricCard label="Free → Pago" value={metrics.retention.freeToPaid} />
        </div>
      </div>

      {/* MÉTRICAS LEGALES */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">⚖️ Métricas Legales</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Tasa Éxito (%)" value={`${metrics.legal.successRate.toFixed(2)}%`} />
          <MetricCard label="Tiempo Medio (min)" value={`${metrics.legal.avgTimeToSendMinutes.toFixed(1)}`} />
          <MetricCard label="Incidencias Evitadas" value={metrics.legal.incidentsAvoided} />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Cumplimiento por Propiedad</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {metrics.legal.complianceByProperty.map((p: any, i: number) => (
                <div key={i} className="p-3 bg-gray-50 rounded">
                  <p className="font-medium">{p.propertyName}</p>
                  <p className="text-sm text-gray-600">
                    {p.successfulSends} / {p.totalSends} enviados correctamente
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Cumplimiento por País</h3>
            <div className="space-y-2">
              {metrics.legal.complianceByCountry.map((c: any, i: number) => (
                <div key={i} className="p-3 bg-gray-50 rounded">
                  <p className="font-medium">{c.country}</p>
                  <p className="text-sm text-gray-600">
                    {c.successfulSends} / {c.totalSends} enviados correctamente
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* EMAIL TRACKING */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">📬 Email Tracking</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Emails Enviados" value={metrics.email.totalSent} />
          <MetricCard label="Open Rate (%)" value={`${metrics.email.openRate.toFixed(2)}%`} />
          <MetricCard label="Click Rate (%)" value={`${metrics.email.clickRate.toFixed(2)}%`} />
          <MetricCard label="Conversión (%)" value={`${metrics.email.conversionRate.toFixed(2)}%`} />
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Emails por Tipo</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {metrics.email.emailsByType.map((e: any, i: number) => (
              <div key={i} className="p-3 bg-gray-50 rounded">
                <p className="font-medium text-sm">{e.type}</p>
                <p className="text-lg font-bold">{e.sent}</p>
                <p className="text-xs text-gray-600">{e.opened} abiertos</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FUNNELS */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">🔄 Funnels</h2>
        <div className="space-y-4">
          <FunnelStep label="1. Registro" value={metrics.funnel.signups} />
          <FunnelStep label="2. Crea Propiedad" value={metrics.funnel.propertiesCreated} conversion={metrics.funnel.conversionRates.signupToProperty} />
          <FunnelStep label="3. Primer Check-in" value={metrics.funnel.firstCheckins} conversion={metrics.funnel.conversionRates.propertyToCheckin} />
          <FunnelStep label="4. Envía XML" value={metrics.funnel.xmlSent} conversion={metrics.funnel.conversionRates.checkinToXml} />
          <FunnelStep label="5. Pasa a Pago" value={metrics.funnel.paid} conversion={metrics.funnel.conversionRates.xmlToPaid} />
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function FunnelStep({ label, value, conversion }: { label: string; value: number; conversion?: number }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="font-medium">{label}</span>
          <span className="font-bold">{value}</span>
        </div>
        {conversion !== undefined && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${Math.min(conversion, 100)}%` }}
            ></div>
          </div>
        )}
      </div>
      {conversion !== undefined && (
        <span className="text-sm text-gray-600 w-20 text-right">
          {conversion.toFixed(1)}%
        </span>
      )}
    </div>
  )
}

