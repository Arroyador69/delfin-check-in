'use client'

import { useEffect, useState } from 'react'
import { Users, TrendingUp, Gift, CheckCircle, XCircle, Calendar } from 'lucide-react'

interface Referral {
  id: string
  referrerTenantId: string
  referrerName?: string
  referrerEmail?: string
  referrerCode?: string
  referredTenantId: string
  referredName?: string
  referredEmail?: string
  referredCurrentPlan?: string
  referralLevel: number
  referralCodeUsed: string
  status: string
  referredPlanType?: string
  registeredAt: string
  firstPaidAt?: string
  lastPaidAt?: string
  cancelledAt?: string
  monthsPaidCompleted: number
  createdAt: string
}

interface GlobalStats {
  totalReferrals: number
  registeredCount: number
  activeCheckinCount: number
  activeProCount: number
  cancelledCount: number
  paidCount: number
  totalReferrers: number
}

interface RewardsStats {
  totalRewards: number
  appliedCount: number
  pendingCount: number
  revokedCount: number
  totalCheckinMonths: number
  totalProMonths: number
}

interface TopReferrer {
  referrerTenantId: string
  referrerName?: string
  referrerEmail?: string
  totalReferrals: number
  activeReferrals: number
  paidReferrals: number
}

export default function SuperAdminReferrals() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [rewardsStats, setRewardsStats] = useState<RewardsStats | null>(null)
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchData()
  }, [filter])

  const fetchData = async () => {
    try {
      setLoading(true)
      const url = filter !== 'all' ? `/api/superadmin/referrals?status=${filter}` : '/api/superadmin/referrals'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setReferrals(data.referrals || [])
          setGlobalStats(data.globalStats)
          setRewardsStats(data.rewardsStats)
          setTopReferrers(data.topReferrers || [])
        }
      }
    } catch (error) {
      console.error('Error fetching referrals:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPlanBadge = (planType: string | undefined) => {
    const p = (planType || 'free').toLowerCase()
    if (p === 'pro') return <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700">Pro</span>
    if (p === 'standard') return <span className="px-2 py-1 text-xs rounded bg-amber-100 text-amber-700">Standard</span>
    if (p === 'checkin') return <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">Check-in</span>
    return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">Gratis</span>
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">Registrado</span>
      case 'active_checkin':
        return <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">Activo Check-in</span>
      case 'active_pro':
        return <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700">Activo Pro</span>
      case 'cancelled':
        return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">Cancelado</span>
      case 'past_due':
        return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">Pago Fallido</span>
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
          Sistema de Referidos
        </h1>
        <p className="text-gray-700 mt-2">Gestión y auditoría del sistema de referidos entre propietarios</p>
      </div>

      {/* Estadísticas Globales */}
      {globalStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Referidos</p>
            <p className="text-2xl font-bold text-gray-900">{globalStats.totalReferrals}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Activos Check-in</p>
            <p className="text-2xl font-bold text-blue-600">{globalStats.activeCheckinCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Activos Pro</p>
            <p className="text-2xl font-bold text-purple-600">{globalStats.activeProCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total Referentes</p>
            <p className="text-2xl font-bold text-gray-900">{globalStats.totalReferrers}</p>
          </div>
        </div>
      )}

      {/* Estadísticas de Recompensas */}
      {rewardsStats && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-6 mb-6 border border-blue-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Gift className="w-5 h-5 mr-2 text-purple-600" />
            Estadísticas de Recompensas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Recompensas</p>
              <p className="text-2xl font-bold text-gray-900">{rewardsStats.totalRewards}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Aplicadas</p>
              <p className="text-2xl font-bold text-green-600">{rewardsStats.appliedCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Meses Check-in Otorgados</p>
              <p className="text-2xl font-bold text-blue-600">{rewardsStats.totalCheckinMonths}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Meses Pro Otorgados</p>
              <p className="text-2xl font-bold text-purple-600">{rewardsStats.totalProMonths}</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Referentes */}
      {topReferrers.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-gray-700" />
            Top 10 Referentes
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Referente</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Activos</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Pagados</th>
                </tr>
              </thead>
              <tbody>
                {topReferrers.map((referrer) => (
                  <tr key={referrer.referrerTenantId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{referrer.referrerName || 'Sin nombre'}</p>
                        <p className="text-sm text-gray-500">{referrer.referrerEmail}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{referrer.totalReferrals}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{referrer.activeReferrals}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{referrer.paidReferrals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filtros y Tabla de Referidos */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Todos los Referidos</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">Todos</option>
          <option value="registered">Registrados</option>
          <option value="active_checkin">Activos Check-in</option>
          <option value="active_pro">Activos Pro</option>
          <option value="cancelled">Cancelados</option>
          <option value="past_due">Pago Fallido</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referido</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nivel</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Meses Pagados</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registrado</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {referrals.map((referral) => (
                <tr key={referral.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {referral.referrerName ? (
                      <div>
                        <p className="font-medium text-gray-900">{referral.referrerName}</p>
                        <p className="text-sm text-gray-500">{referral.referrerEmail}</p>
                        {referral.referrerCode && (
                          <code className="text-xs text-gray-400">{referral.referrerCode}</code>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {referral.referredName ? (
                      <div>
                        <p className="font-medium text-gray-900">{referral.referredName}</p>
                        <p className="text-sm text-gray-500">{referral.referredEmail}</p>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                      Nivel {referral.referralLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">{referral.referralCodeUsed}</code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(referral.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPlanBadge(referral.referredCurrentPlan || referral.referredPlanType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {referral.monthsPaidCompleted}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(referral.registeredAt).toLocaleDateString('es-ES')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {referrals.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50 text-gray-400" />
          <p className="text-gray-600">No hay referidos registrados</p>
        </div>
      )}
    </div>
  )
}
