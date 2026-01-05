'use client'

import { useEffect, useState } from 'react'

interface Affiliate {
  id: string
  name: string
  email: string
  code: string
  referralLink: string
  commissionRate: number
  commissionMonths: number
  status: string
  totalUsersBrought: number
  totalRevenueGenerated: number
  totalCommissionEarned: number
  totalCommissionPaid: number
  totalReferrals: number
  convertedReferrals: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export default function SuperAdminAffiliates() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    commission_rate: 25,
    commission_months: 12,
    status: 'active',
    notes: ''
  })

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
          setAffiliates(data.affiliates)
        }
      }
    } catch (error) {
      console.error('Error fetching affiliates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingAffiliate(null)
    setFormData({
      name: '',
      email: '',
      commission_rate: 25,
      commission_months: 12,
      status: 'active',
      notes: ''
    })
    setShowModal(true)
  }

  const handleEdit = (affiliate: Affiliate) => {
    setEditingAffiliate(affiliate)
    setFormData({
      name: affiliate.name,
      email: affiliate.email,
      commission_rate: affiliate.commissionRate,
      commission_months: affiliate.commissionMonths,
      status: affiliate.status,
      notes: affiliate.notes || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingAffiliate
        ? '/api/superadmin/affiliates'
        : '/api/superadmin/affiliates'
      const method = editingAffiliate ? 'PUT' : 'POST'
      
      const body = editingAffiliate
        ? { id: editingAffiliate.id, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        setShowModal(false)
        fetchAffiliates()
      } else {
        alert('Error al guardar afiliado')
      }
    } catch (error) {
      console.error('Error saving affiliate:', error)
      alert('Error al guardar afiliado')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de desactivar este afiliado?')) return

    try {
      const response = await fetch(`/api/superadmin/affiliates?id=${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchAffiliates()
      }
    } catch (error) {
      console.error('Error deleting affiliate:', error)
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
          <h1 className="text-3xl font-bold text-gray-900">🧩 Afiliados</h1>
          <p className="text-gray-700 mt-2">Gestiona los afiliados que promocionan Delfín Check-in</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Nuevo Afiliado
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuarios</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ingresos</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comisión</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {affiliates.map((affiliate) => (
              <tr key={affiliate.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{affiliate.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{affiliate.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <code className="bg-gray-100 px-2 py-1 rounded text-sm">{affiliate.code}</code>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {affiliate.totalUsersBrought} ({affiliate.convertedReferrals} convertidos)
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{affiliate.totalRevenueGenerated.toFixed(2)}€</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {affiliate.totalCommissionEarned.toFixed(2)}€ / {affiliate.totalCommissionPaid.toFixed(2)}€ pagado
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded text-xs ${
                    affiliate.status === 'active' ? 'bg-green-100 text-green-800' :
                    affiliate.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {affiliate.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleEdit(affiliate)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(affiliate.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Desactivar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">
              {editingAffiliate ? 'Editar Afiliado' : 'Nuevo Afiliado'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Comisión (%)</label>
                  <input
                    type="number"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Meses</label>
                  <input
                    type="number"
                    value={formData.commission_months}
                    onChange={(e) => setFormData({ ...formData, commission_months: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-lg"
                    min="1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="active">Activo</option>
                  <option value="pending">Pendiente</option>
                  <option value="blocked">Bloqueado</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

