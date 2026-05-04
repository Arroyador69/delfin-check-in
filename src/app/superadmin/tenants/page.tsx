'use client'

import { useEffect, useState } from 'react'

interface Tenant {
  id: string
  name: string
  email: string
  plan_id: string
  status: string
  onboarding_status?: string | null
  max_rooms: number
  current_rooms: number
  created_at: string
  onboarding_email_id?: string | null
  onboarding_email_status?: string | null
  onboarding_email_sent_at?: string | null
  onboarding_email_opened_at?: string | null
  onboarding_email_clicked_at?: string | null
}

function formatShortDateTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

function onboardingBadgeClasses(status?: string | null): string {
  const s = String(status || '').toLowerCase()
  if (!s) return 'bg-gray-100 text-gray-800'
  if (s === 'clicked') return 'bg-indigo-100 text-indigo-800'
  if (s === 'opened') return 'bg-purple-100 text-purple-800'
  if (s === 'delivered') return 'bg-green-100 text-green-800'
  if (s === 'sent') return 'bg-blue-100 text-blue-800'
  if (s === 'pending') return 'bg-yellow-100 text-yellow-800'
  if (s === 'failed' || s === 'bounced') return 'bg-red-100 text-red-800'
  return 'bg-gray-100 text-gray-800'
}

function onboardingLabel(status?: string | null): string {
  const s = String(status || '').toLowerCase()
  if (!s) return 'sin registro'
  if (s === 'pending') return 'pendiente envío'
  if (s === 'sent') return 'enviado'
  if (s === 'delivered') return 'entregado'
  if (s === 'opened') return 'abierto'
  if (s === 'clicked') return 'clic'
  if (s === 'failed') return 'fallido'
  if (s === 'bounced') return 'rebotado'
  return s
}

function tenantOnboardingProgressLabel(status?: string | null): string {
  const s = String(status || '').toLowerCase()
  if (!s || s === 'unknown') return ''
  if (s === 'completed') return 'Onboarding: completado'
  if (s === 'in_progress') return 'Onboarding: en curso'
  if (s === 'pending') return 'Onboarding: pendiente'
  return `Onboarding: ${s}`
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/superadmin/tenants')
      if (response.ok) {
        const data = await response.json()
        setTenants(data.tenants || [])
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">📋 Todos los Tenants</h1>
        <p className="text-gray-700 mt-2">Gestión de todos los clientes de la plataforma</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando tenants...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Habitaciones
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Email onboarding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Progreso onboarding
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Última acción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Fecha Creación
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    No hay tenants registrados
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{tenant.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {tenant.plan_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                        tenant.status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tenant.current_rooms} / {tenant.max_rooms === -1 ? '∞' : tenant.max_rooms}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${onboardingBadgeClasses(
                          tenant.onboarding_email_status
                        )}`}
                        title={
                          tenant.onboarding_email_id
                            ? `email_tracking.id=${tenant.onboarding_email_id}`
                            : tenant.onboarding_status === 'completed'
                              ? 'Sin tracking de email, pero el onboarding del tenant está marcado como completado en BD.'
                              : 'Sin registro en email_tracking (histórico previo o no se trackeó el envío).'
                        }
                      >
                        {onboardingLabel(tenant.onboarding_email_status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {tenantOnboardingProgressLabel(tenant.onboarding_status) || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {tenant.onboarding_email_clicked_at
                        ? `Clic: ${formatShortDateTime(tenant.onboarding_email_clicked_at)}`
                        : tenant.onboarding_email_opened_at
                          ? `Abierto: ${formatShortDateTime(tenant.onboarding_email_opened_at)}`
                          : tenant.onboarding_email_sent_at
                            ? `Registro: ${formatShortDateTime(tenant.onboarding_email_sent_at)}`
                            : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tenant.created_at).toLocaleDateString('es-ES')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

