'use client'

import { useEffect, useState } from 'react'

interface Referral {
  id: string
  referrerTenantId?: string
  referrerName?: string
  referrerEmail?: string
  referredTenantId?: string
  referredName?: string
  referredEmail?: string
  affiliateId?: string
  affiliateName?: string
  referralCode?: string
  status: string
  activatedAt?: string
  convertedAt?: string
  discountApplied: number
  rewardApplied: number
  createdAt: string
}

export default function SuperAdminReferrals() {
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchReferrals()
  }, [filter])

  const fetchReferrals = async () => {
    try {
      setLoading(true)
      const url = filter !== 'all' ? `/api/superadmin/referrals?status=${filter}` : '/api/superadmin/referrals'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setReferrals(data.referrals)
        }
      }
    } catch (error) {
      console.error('Error fetching referrals:', error)
    } finally {
      setLoading(false)
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🔗 Referidos</h1>
          <p className="text-gray-700 mt-2">Sistema de referidos entre usuarios</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">Todos</option>
          <option value="pending">Pendientes</option>
          <option value="activated">Activados</option>
          <option value="converted">Convertidos</option>
          <option value="expired">Expirados</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referrer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invitado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Afiliado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descuento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recompensa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {referrals.map((referral) => (
              <tr key={referral.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {referral.referrerName ? (
                    <div>
                      <p className="font-medium">{referral.referrerName}</p>
                      <p className="text-sm text-gray-500">{referral.referrerEmail}</p>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {referral.referredName ? (
                    <div>
                      <p className="font-medium">{referral.referredName}</p>
                      <p className="text-sm text-gray-500">{referral.referredEmail}</p>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {referral.affiliateName || <span className="text-gray-400">-</span>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {referral.referralCode ? (
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">{referral.referralCode}</code>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-xs ${
                    referral.status === 'converted' ? 'bg-green-100 text-green-800' :
                    referral.status === 'activated' ? 'bg-blue-100 text-blue-800' :
                    referral.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {referral.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {referral.discountApplied > 0 ? `${referral.discountApplied.toFixed(2)}€` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {referral.rewardApplied > 0 ? `${referral.rewardApplied.toFixed(2)}€` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(referral.createdAt).toLocaleDateString('es-ES')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {referrals.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-600">No hay referidos registrados</p>
        </div>
      )}
    </div>
  )
}

