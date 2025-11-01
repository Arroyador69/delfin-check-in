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

  useEffect(() => {
    fetchStats()
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">👑 SuperAdmin Dashboard</h1>
        <p className="text-gray-600 mt-2">Gestión central de la plataforma Delfín Check-in</p>
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
                  <p className="text-sm text-gray-600">Total Tenants</p>
                  <p className="text-3xl font-bold">{stats.totalTenants}</p>
                </div>
                <div className="text-4xl">🏢</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Activos</p>
                  <p className="text-3xl font-bold">{stats.activeTenants}</p>
                </div>
                <div className="text-4xl">✅</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">En Prueba</p>
                  <p className="text-3xl font-bold">{stats.trialTenants}</p>
                </div>
                <div className="text-4xl">⏱️</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Comisiones (Mes)</p>
                  <p className="text-3xl font-bold">{stats.commissionsThisMonth.toFixed(2)}€</p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">⚡ Acciones Rápidas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a 
                href="/superadmin/tenants"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">📋</span>
                <div>
                  <p className="font-semibold">Ver Todos los Tenants</p>
                  <p className="text-sm text-gray-600">Gestionar clientes</p>
                </div>
              </a>

              <a 
                href="/"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">🏖️</span>
                <div>
                  <p className="font-semibold">Ver Mi Panel Tenant</p>
                  <p className="text-sm text-gray-600">Panel normal</p>
                </div>
              </a>

              <a 
                href="/superadmin/analytics"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <p className="font-semibold">Analytics Global</p>
                  <p className="text-sm text-gray-600">Métricas detalladas</p>
                </div>
              </a>

              <a 
                href="/superadmin/logs"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-2xl mr-3">🚨</span>
                <div>
                  <p className="font-semibold">Logs & Errores</p>
                  <p className="text-sm text-gray-600">Errores del sistema</p>
                </div>
              </a>
            </div>
          </div>

        </>
      )}
    </div>
  )
}

