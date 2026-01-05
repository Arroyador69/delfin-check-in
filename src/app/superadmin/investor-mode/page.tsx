'use client'

import { useEffect, useState } from 'react'

export default function SuperAdminInvestorMode() {
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/superadmin/metrics?period=month')
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

  if (loading || !metrics) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">📊 Investor Mode</h1>
        <p className="text-gray-700 mt-2">Vista resumida para inversores - Métricas clave en 10 minutos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Usuarios */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">👥 Usuarios</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total</span>
              <span className="font-bold text-2xl">{metrics.traction.totalUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Activos (MAU)</span>
              <span className="font-bold text-xl">{metrics.traction.mau}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Activos Hoy (DAU)</span>
              <span className="font-bold text-xl">{metrics.traction.dau}</span>
            </div>
          </div>
        </div>

        {/* Ingresos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">💰 Ingresos</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">MRR</span>
              <span className="font-bold text-2xl">{metrics.revenue.mrr.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ARR</span>
              <span className="font-bold text-xl">{metrics.revenue.arr.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">ARPU</span>
              <span className="font-bold text-xl">{metrics.revenue.arpu.toFixed(2)}€</span>
            </div>
          </div>
        </div>

        {/* Retención */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">🔁 Retención</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Churn Rate</span>
              <span className="font-bold text-2xl">{metrics.retention.churnRate.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">LTV Promedio</span>
              <span className="font-bold text-xl">{metrics.retention.avgLTV.toFixed(2)}€</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Free → Pago</span>
              <span className="font-bold text-xl">{metrics.retention.freeToPaid}</span>
            </div>
          </div>
        </div>

        {/* Legal */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">⚖️ Cumplimiento Legal</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Tasa Éxito</span>
              <span className="font-bold text-2xl">{metrics.legal.successRate.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">XML Enviados</span>
              <span className="font-bold text-xl">{metrics.traction.xmlSent}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Incidencias Evitadas</span>
              <span className="font-bold text-xl">{metrics.legal.incidentsAvoided}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Países Activos */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">🌍 Países Activos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.legal.complianceByCountry.map((c: any, i: number) => (
            <div key={i} className="p-3 bg-gray-50 rounded">
              <p className="font-bold text-lg">{c.country}</p>
              <p className="text-sm text-gray-600">{c.totalSends} envíos</p>
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap Próximo Trimestre */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">🗺️ Roadmap Próximo Trimestre</h2>
        <div className="space-y-2 text-gray-700">
          <p>• Expansión a nuevos países (IT, PT, FR)</p>
          <p>• Mejoras en el módulo legal</p>
          <p>• Optimización de funnels de conversión</p>
          <p>• Programa de afiliados activo</p>
        </div>
      </div>
    </div>
  )
}

