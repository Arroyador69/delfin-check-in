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

  const [cronCreations, setCronCreations] = useState<{
    stats: { status: string; count: string; today_count: string; published_today: string }[];
    scheduled_today: number;
  } | null>(null)
  const [loadingCronCreations, setLoadingCronCreations] = useState(true)
  const [errorCronCreations, setErrorCronCreations] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
    fetchRadarReachStats()
    fetchCronCreations()
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

  const fetchCronCreations = async () => {
    setErrorCronCreations(null)
    setLoadingCronCreations(true)
    try {
      const response = await fetch('/api/superadmin/programmatic/cron?action=status', { credentials: 'include' })
      if (!response.ok) {
        const errText = await response.text()
        setCronCreations(null)
        setErrorCronCreations(errText || `Error ${response.status}`)
        return
      }
      const data = await response.json()
      setCronCreations({
        stats: data.stats || [],
        scheduled_today: typeof data.scheduled_today === 'number' ? data.scheduled_today : parseInt(data.scheduled_today, 10) || 0
      })
    } catch (e: any) {
      setCronCreations(null)
      setErrorCronCreations(e?.message || 'Error al conectar')
    } finally {
      setLoadingCronCreations(false)
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

          {/* Botón destacado: Crear artículo */}
          <div className="bg-white rounded-lg shadow p-6 mb-6 border-2 border-blue-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">📝 Crear artículo del blog</h2>
                <p className="text-sm text-gray-600 mt-1">Redactar y publicar un nuevo artículo en el blog</p>
              </div>
              <a
                href="/superadmin/blog-manager"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md"
              >
                ➕ Crear artículo
              </a>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-900">⚡ Acciones Rápidas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a 
                href="/superadmin/metrics"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <p className="font-semibold text-gray-900">Métricas</p>
                  <p className="text-sm text-gray-700">Tracción, ingresos, retención</p>
                </div>
              </a>

              <a 
                href="/superadmin/affiliates"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">🧩</span>
                <div>
                  <p className="font-semibold text-gray-900">Afiliados</p>
                  <p className="text-sm text-gray-700">Gestionar afiliados y comisiones</p>
                </div>
              </a>

              <a 
                href="/superadmin/referrals"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">🔗</span>
                <div>
                  <p className="font-semibold text-gray-900">Referidos</p>
                  <p className="text-sm text-gray-700">Sistema de referidos</p>
                </div>
              </a>

              <a 
                href="/superadmin/emails"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">📬</span>
                <div>
                  <p className="font-semibold text-gray-900">Emails</p>
                  <p className="text-sm text-gray-700">Enviar y trackear emails</p>
                </div>
              </a>

              <a 
                href="/superadmin/waitlist"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">📋</span>
                <div>
                  <p className="font-semibold text-gray-900">Waitlist</p>
                  <p className="text-sm text-gray-700">Gestionar lista de espera</p>
                </div>
              </a>

              <a 
                href="/superadmin/landing-analytics"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <p className="font-semibold text-gray-900">Monitoreo Landing</p>
                  <p className="text-sm text-gray-700">Analytics de la landing page</p>
                </div>
              </a>

              <a 
                href="/superadmin/blog-analytics"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <p className="font-semibold text-gray-900">Monitoreo Artículos</p>
                  <p className="text-sm text-gray-700">Analytics de artículos del blog</p>
                </div>
              </a>

              <a 
                href="/superadmin/blog-manager"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">✏️</span>
                <div>
                  <p className="font-semibold text-gray-900">Gestión de Artículos</p>
                  <p className="text-sm text-gray-700">CMS para crear y editar artículos</p>
                </div>
              </a>

              <a 
                href="/superadmin/investor-mode"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">📈</span>
                <div>
                  <p className="font-semibold text-gray-900">Investor Mode</p>
                  <p className="text-sm text-gray-700">Vista para inversores</p>
                </div>
              </a>

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

          {/* Tarjeta: Estado del cron - Creaciones programáticas */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">🔄 Creaciones programáticas (Cron)</h2>
              <a
                href="/superadmin/programmatic"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Ir a Páginas programáticas →
              </a>
            </div>

            {loadingCronCreations ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <p className="mt-4 text-gray-600">Cargando estado del cron...</p>
              </div>
            ) : errorCronCreations ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No se pudo cargar el estado del cron.</p>
                <p className="text-sm text-gray-500 mt-1">{errorCronCreations}</p>
                <button
                  type="button"
                  onClick={fetchCronCreations}
                  className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Reintentar
                </button>
              </div>
            ) : cronCreations ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <p className="text-xs text-gray-600 mb-1">Programadas hoy</p>
                    <p className="text-2xl font-bold text-gray-900">{cronCreations.scheduled_today}</p>
                  </div>
                  {(cronCreations.stats && cronCreations.stats.length > 0) ? cronCreations.stats.map((row: any) => (
                    <div
                      key={row.status}
                      className={`rounded-lg p-4 border ${
                        row.status === 'published' ? 'bg-green-50 border-green-200' :
                        row.status === 'scheduled' ? 'bg-blue-50 border-blue-200' :
                        row.status === 'draft' ? 'bg-gray-50 border-gray-200' :
                        'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <p className="text-xs text-gray-600 mb-1">{row.status}</p>
                      <p className="text-2xl font-bold text-gray-900">{row.count}</p>
                      {(row.published_today !== undefined && parseInt(row.published_today, 10) > 0) && (
                        <p className="text-xs text-gray-500 mt-1">Publicadas hoy: {row.published_today}</p>
                      )}
                    </div>
                  )) : (
                    <div className="col-span-3 text-sm text-gray-500 py-2">
                      Aún no hay páginas en la base de datos. Crea páginas en Páginas programáticas.
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  El cron publica páginas a las 9:00 y 17:00 UTC. Aquí ves cuántas hay por estado y cuántas se programaron para hoy.
                </p>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Sin datos de creaciones programáticas.
              </div>
            )}
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

