'use client'

import { useEffect, useState } from 'react'

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    totalReservations: 0,
    commissionsThisMonth: 0,
    loading: true
  })

  const [radarReachStats, setRadarReachStats] = useState<any>(null)
  const [loadingRadarReach, setLoadingRadarReach] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchRadarReachStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/superadmin/stats')
      if (response.ok) {
        const data = await response.json()
        setStats({ ...data, loading: false })
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setStats(prev => ({ ...prev, loading: false }))
    }
  }

  const fetchRadarReachStats = async () => {
    try {
      const response = await fetch('/api/superadmin/radar-reach/stats')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRadarReachStats(data.stats)
        } else {
          // Si hay error en la respuesta, inicializar con valores por defecto
          setRadarReachStats({
            signals: { total: 0, active: 0, processed: 0, unprocessed: 0, avg_intensity: 0 },
            landings: { total: 0, published: 0, draft: 0, total_views: 0, total_conversions: 0, conversion_rate: 0 },
            top_landings: [],
            recent_signals: []
          })
        }
      } else {
        // Si la respuesta no es OK, inicializar con valores por defecto
        setRadarReachStats({
          signals: { total: 0, active: 0, processed: 0, unprocessed: 0, avg_intensity: 0 },
          landings: { total: 0, published: 0, draft: 0, total_views: 0, total_conversions: 0, conversion_rate: 0 },
          top_landings: [],
          recent_signals: []
        })
      }
    } catch (error) {
      console.error('Error fetching Radar Reach stats:', error)
      // En caso de error, inicializar con valores por defecto
      setRadarReachStats({
        signals: { total: 0, active: 0, processed: 0, unprocessed: 0, avg_intensity: 0 },
        landings: { total: 0, published: 0, draft: 0, total_views: 0, total_conversions: 0, conversion_rate: 0 },
        top_landings: [],
        recent_signals: []
      })
    } finally {
      setLoadingRadarReach(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">👑 SuperAdmin Dashboard</h1>
        <p className="text-gray-700 mt-2">Gestión central de la plataforma Delfín Check-in</p>
      </div>

      {stats.loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-800">Total Tenants</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalTenants}</p>
                </div>
                <div className="text-4xl">🏢</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-800">Activos</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.activeTenants}</p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-800">En Prueba</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.trialTenants}</p>
                </div>
                <div className="text-4xl">⏱️</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-800">Comisiones (Mes)</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.commissionsThisMonth.toFixed(2)}€</p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900">⚡ Acciones Rápidas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a 
                href="/superadmin/tenants"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">📋</span>
                <div>
                  <p className="font-semibold text-gray-900">Ver Todos los Tenants</p>
                  <p className="text-sm text-gray-700">Gestionar clientes</p>
                </div>
              </a>

              <a 
                href="/superadmin/analytics"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <p className="font-semibold text-gray-900">Analytics Global</p>
                  <p className="text-sm text-gray-700">Métricas detalladas</p>
                </div>
              </a>

              <a 
                href="/superadmin/logs"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">🚨</span>
                <div>
                  <p className="font-semibold text-gray-900">Logs & Errores</p>
                  <p className="text-sm text-gray-700">Errores del sistema</p>
                </div>
              </a>

              <a 
                href="/superadmin/programmatic"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">📄</span>
                <div>
                  <p className="font-semibold text-gray-900">Páginas Programáticas</p>
                  <p className="text-sm text-gray-700">SEO y métricas</p>
                </div>
              </a>

              <a 
                href="/superadmin/radar-reach"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">🎯</span>
                <div>
                  <p className="font-semibold text-gray-900">Radar Reach</p>
                  <p className="text-sm text-gray-700">Señales y landings dinámicas</p>
                </div>
              </a>
            </div>
          </div>

          {/* Radar Reach Stats - SIEMPRE VISIBLE */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">🎯 Radar Reach - Resumen</h2>
              <a 
                href="/superadmin/radar-reach"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Ver detalles →
              </a>
            </div>

            {loadingRadarReach ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Cargando estadísticas de Radar Reach...</p>
              </div>
            ) : radarReachStats ? (
              <>
                {/* KPIs Radar Reach */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Señales Activas</p>
                    <p className="text-2xl font-bold text-gray-900">{radarReachStats.signals?.active || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {radarReachStats.signals?.total || 0} total
                    </p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-xs text-gray-600 mb-1">Landings Publicadas</p>
                    <p className="text-2xl font-bold text-gray-900">{radarReachStats.landings?.published || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {radarReachStats.landings?.total || 0} total
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-xs text-gray-600 mb-1">Vistas Totales</p>
                    <p className="text-2xl font-bold text-gray-900">{(radarReachStats.landings?.total_views || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {radarReachStats.landings?.total_conversions || 0} conversiones
                    </p>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                    <p className="text-xs text-gray-600 mb-1">Tasa Conversión</p>
                    <p className="text-2xl font-bold text-gray-900">{(radarReachStats.landings?.conversion_rate || 0).toFixed(1)}%</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Promedio general
                    </p>
                  </div>
                </div>

                {/* Resumen rápido */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Señales pendientes */}
                  {(radarReachStats.signals?.unprocessed || 0) > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">⚠️ Señales sin procesar</p>
                          <p className="text-lg text-gray-700 mt-1">
                            {radarReachStats.signals.unprocessed} señal(es) esperando procesamiento
                          </p>
                        </div>
                        <span className="text-2xl">📡</span>
                      </div>
                    </div>
                  )}

                  {/* Landings en borrador */}
                  {(radarReachStats.landings?.draft || 0) > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">📝 Landings en borrador</p>
                          <p className="text-lg text-gray-700 mt-1">
                            {radarReachStats.landings.draft} landing(s) pendiente(s) de publicar
                          </p>
                        </div>
                        <span className="text-2xl">📄</span>
                      </div>
                    </div>
                  )}

                  {/* Mensaje cuando no hay alertas */}
                  {(radarReachStats.signals?.unprocessed || 0) === 0 && (radarReachStats.landings?.draft || 0) === 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 col-span-2">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">✅</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Todo al día</p>
                          <p className="text-sm text-gray-700 mt-1">
                            No hay señales pendientes ni landings en borrador
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Top Landings */}
                {radarReachStats.top_landings && radarReachStats.top_landings.length > 0 ? (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">🏆 Top 5 Landings por Vistas</h3>
                    <div className="space-y-2">
                      {radarReachStats.top_landings.map((landing: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{landing.slug}</p>
                            <p className="text-sm text-gray-600">{landing.property_name} • {landing.tenant_name}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{landing.views.toLocaleString()} vistas</p>
                            <p className="text-sm text-gray-600">{landing.conversions} conversiones</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 text-center py-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-600">Aún no hay landings publicadas con vistas</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No se pudieron cargar las estadísticas de Radar Reach</p>
                <button
                  onClick={fetchRadarReachStats}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>

        </>
      )}
    </div>
  )
}

