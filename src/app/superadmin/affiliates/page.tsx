'use client'

import { useEffect, useState } from 'react'
import { Users, TrendingUp, DollarSign, CheckCircle, XCircle, Calendar } from 'lucide-react'

interface Affiliate {
  id: string
  email: string
  fullName: string
  companyName?: string
  phone?: string
  status: string
  referralCode: string
  commissionRate: number
  emailVerified: boolean
  totalClicks: number
  totalCustomers: number
  activeCustomers: number
  registeredCustomers: number
  cancelledCustomers: number
  pendingCommissions: number
  paidCommissions: number
  totalEarnings: number
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

interface GlobalStats {
  totalAffiliates: number
  activeAffiliates: number
  suspendedAffiliates: number
  inactiveAffiliates: number
}

export default function SuperAdminAffiliates() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAffiliates()
  }, [])

  const fetchAffiliates = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/superadmin/affiliates')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAffiliates(data.affiliates || [])
          setGlobalStats(data.globalStats)
        }
      }
    } catch (error) {
      console.error('Error fetching affiliates:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">Activo</span>
      case 'suspended':
        return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">Suspendido</span>
      case 'inactive':
        return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">Inactivo</span>
      default:
        return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">{status}</span>
    }
  }

  if (loading) {
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
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Users className="w-8 h-8 mr-3 text-blue-600" />
          Afiliados
        </h1>
        <p className="text-gray-700 mt-2">Gestión del portal de afiliados - Sistema completo</p>
      </div>

      {/* Estadísticas Globales */}
      {globalStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Afiliados</p>
            <p className="text-2xl font-bold text-gray-900">{globalStats.totalAffiliates}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Activos</p>
            <p className="text-2xl font-bold text-green-600">{globalStats.activeAffiliates}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Suspendidos</p>
            <p className="text-2xl font-bold text-red-600">{globalStats.suspendedAffiliates}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Inactivos</p>
            <p className="text-2xl font-bold text-gray-600">{globalStats.inactiveAffiliates}</p>
          </div>
        </div>
      )}

      {/* Tabla de Afiliados */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Afiliado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clicks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clientes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activos</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comisiones Pendientes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comisiones Pagadas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Ganado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Último Login</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {affiliates.map((affiliate) => (
                <tr key={affiliate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-medium text-gray-900">{affiliate.fullName || 'Sin nombre'}</p>
                      <p className="text-sm text-gray-500">{affiliate.email}</p>
                      {affiliate.companyName && (
                        <p className="text-xs text-gray-400">{affiliate.companyName}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">{affiliate.referralCode}</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(affiliate.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {affiliate.totalClicks}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    <div>
                      <p className="font-medium">{affiliate.totalCustomers}</p>
                      <p className="text-xs text-gray-500">
                        {affiliate.registeredCustomers} reg. / {affiliate.cancelledCustomers} canc.
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {affiliate.activeCustomers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {affiliate.pendingCommissions.toFixed(2)}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {affiliate.paidCommissions.toFixed(2)}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                    {affiliate.totalEarnings.toFixed(2)}€
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {affiliate.lastLoginAt 
                      ? new Date(affiliate.lastLoginAt).toLocaleDateString('es-ES')
                      : 'Nunca'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {affiliates.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50 text-gray-400" />
          <p className="text-gray-600">No hay afiliados registrados</p>
        </div>
      )}
    </div>
  )
}
