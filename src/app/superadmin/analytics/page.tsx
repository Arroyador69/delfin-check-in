'use client'

import { useEffect, useState } from 'react'

interface TopTenant {
  tenantId: string
  tenantName: string
  status: string
  reservationCount: number
  revenue: number
}

interface GrowthData {
  month: string
  newTenants?: number
  reservationCount?: number
  revenue?: number
}

interface Analytics {
  totalTenants: number
  activeTenants: number
  trialTenants: number
  totalReservations: number
  reservationsThisMonth: number
  totalCommissions: number
  commissionsThisMonth: number
  averageReservationValue: number
  topTenantsByReservations: TopTenant[]
  tenantGrowth: GrowthData[]
  reservationsGrowth: GrowthData[]
  directReservationsCount: number
  directReservationsThisMonth: number
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
    averageReservationValue: 0,
    topTenantsByReservations: [],
    tenantGrowth: [],
    reservationsGrowth: [],
    directReservationsCount: 0,
    directReservationsThisMonth: 0
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

          {/* Reservas Directas */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">🎫 Reservas Directas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-600 font-medium">Total Reservas Directas</p>
                <p className="text-3xl font-bold text-blue-700">{analytics.directReservationsCount}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {analytics.directReservationsThisMonth} este mes
                </p>
              </div>
            </div>
          </div>

          {/* Top Tenants por Reservas */}
          {analytics.topTenantsByReservations.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">🏆 Top Tenants por Reservas (Este Mes)</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tenant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reservas
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ingresos
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analytics.topTenantsByReservations.map((tenant, idx) => (
                      <tr key={tenant.tenantId} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="text-sm font-medium text-gray-900">{tenant.tenantName}</p>
                          <p className="text-xs text-gray-500">{tenant.tenantId.substring(0, 8)}...</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            tenant.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : tenant.status === 'trial'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {tenant.status === 'active' ? 'Activo' : tenant.status === 'trial' ? 'Prueba' : tenant.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <p className="text-sm font-medium text-gray-900">{tenant.reservationCount}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <p className="text-sm font-medium text-gray-900">{tenant.revenue.toFixed(2)}€</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Crecimiento de Tenants */}
          {analytics.tenantGrowth.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">📈 Crecimiento de Tenants (Últimos 12 Meses)</h2>
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="flex items-end justify-between space-x-2 h-64">
                    {analytics.tenantGrowth.map((data) => (
                      <div key={data.month} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-blue-100 border border-blue-300 rounded-t-lg flex flex-col justify-end">
                          <div
                            className="bg-blue-500 rounded-t-lg"
                            style={{
                              height: data.newTenants ? `${Math.max(data.newTenants * 10, 5)}%` : '0%',
                            }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                          {new Date(data.month).toLocaleDateString('es-ES', { month: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      Total nuevos tenants: {analytics.tenantGrowth.reduce((sum, d) => sum + (d.newTenants || 0), 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Crecimiento de Reservas */}
          {analytics.reservationsGrowth.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-bold mb-4">📊 Crecimiento de Reservas (Últimos 12 Meses)</h2>
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  <div className="flex items-end justify-between space-x-2 h-64">
                    {analytics.reservationsGrowth.map((data) => (
                      <div key={data.month} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-green-100 border border-green-300 rounded-t-lg flex flex-col justify-end">
                          <div
                            className="bg-green-500 rounded-t-lg"
                            style={{
                              height: data.reservationCount ? `${Math.min(Math.max(data.reservationCount / 2, 2), 100)}%` : '0%',
                            }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left whitespace-nowrap">
                          {new Date(data.month).toLocaleDateString('es-ES', { month: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      Total reservas: {analytics.reservationsGrowth.reduce((sum, d) => sum + (d.reservationCount || 0), 0)}
                    </p>
                    <p className="text-sm text-green-600 font-semibold">
                      Total ingresos: {analytics.reservationsGrowth.reduce((sum, d) => sum + (d.revenue || 0), 0).toFixed(2)}€
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  )
}

