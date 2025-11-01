'use client'

import { useEffect, useState } from 'react'

interface Analytics {
  totalTenants: number
  activeTenants: number
  trialTenants: number
  totalReservations: number
  reservationsThisMonth: number
  totalCommissions: number
  commissionsThisMonth: number
  averageReservationValue: number
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics>({
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    totalReservations: 0,
    reservationsThisMonth: 0,
    totalCommissions: 0,
    commissionsThisMonth: 0,
    averageReservationValue: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/superadmin/analytics')
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">📊 Analytics Global</h1>
        <p className="text-gray-600 mt-2">Métricas y estadísticas de toda la plataforma</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando analytics...</p>
        </div>
      ) : (
        <>
          {/* KPIs Principales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Tenants</p>
                  <p className="text-3xl font-bold">{analytics.totalTenants}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analytics.activeTenants} activos, {analytics.trialTenants} en prueba
                  </p>
                </div>
                <div className="text-4xl">🏢</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Reservas Mes</p>
                  <p className="text-3xl font-bold">{analytics.reservationsThisMonth}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analytics.totalReservations} total
                  </p>
                </div>
                <div className="text-4xl">📅</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Comisiones Mes</p>
                  <p className="text-3xl font-bold">{analytics.commissionsThisMonth.toFixed(2)}€</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analytics.totalCommissions.toFixed(2)}€ total
                  </p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ticket Promedio</p>
                  <p className="text-3xl font-bold">{analytics.averageReservationValue.toFixed(2)}€</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Por reserva
                  </p>
                </div>
                <div className="text-4xl">📊</div>
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  )
}

