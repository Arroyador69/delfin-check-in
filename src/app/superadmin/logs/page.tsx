'use client'

import { useEffect, useState, useCallback } from 'react'

interface Log {
  id: string
  timestamp: string
  level: string
  message: string
  tenant_id?: string
  user_id?: string
  error?: string
  url?: string
  metadata?: Record<string, any>
}

interface LogStats {
  total: number
  errors: number
  warnings: number
  last24h: number
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [stats, setStats] = useState<LogStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'error' | 'warning'>('all')

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/superadmin/logs?level=${filter}`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchLogs()
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(() => {
      fetchLogs()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [fetchLogs])

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🚨 Logs del Sistema</h1>
            <p className="text-gray-700 mt-2">Errores y eventos críticos de toda la plataforma</p>
          </div>
          {stats && (
            <div className="flex gap-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-600 font-medium">Errores</p>
                <p className="text-2xl font-bold text-red-700">{stats.errors}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-600 font-medium">Warnings</p>
                <p className="text-2xl font-bold text-yellow-700">{stats.warnings}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium">Últimas 24h</p>
                <p className="text-2xl font-bold text-blue-700">{stats.last24h}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('error')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'error' 
              ? 'bg-red-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Solo Errores
        </button>
        <button
          onClick={() => setFilter('warning')}
          className={`px-4 py-2 rounded-lg font-medium ${
            filter === 'warning' 
              ? 'bg-yellow-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Warnings
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-xl text-gray-900 mb-2">¡Todo funcionando correctamente!</p>
          <p className="text-gray-600">No hay errores críticos en este momento</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log, idx) => (
            <div
              key={idx}
              className={`bg-white rounded-lg shadow p-4 border-l-4 ${getLevelColor(log.level)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${getLevelColor(log.level)}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString('es-ES')}
                    </span>
                    {log.tenant_id && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        Tenant: {log.tenant_id.substring(0, 8)}...
                      </span>
                    )}
                    {log.url && (
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {log.url}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 font-medium mb-1">{log.message}</p>
                  {log.error && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                        Ver stack trace
                      </summary>
                      <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded mt-2 overflow-x-auto max-h-64">
                        {log.error.substring(0, 2000)}
                      </pre>
                    </details>
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                        Ver metadata
                      </summary>
                      <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded mt-2 overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          💡 <strong>Nota:</strong> Los logs se actualizan automáticamente cada 30 segundos. 
          Los logs detallados también están disponibles en{' '}
          <a href="https://sentry.io" target="_blank" rel="noopener noreferrer" className="underline">
            Sentry
          </a>{' '}
          y{' '}
          <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">
            Vercel Dashboard
          </a>.
        </p>
      </div>
    </div>
  )
}

