'use client'

import { useState, useEffect } from 'react'

/**
 * 🔍 PÁGINA DE DEBUG PARA TENANTS
 * 
 * Esta página permite verificar el estado de tenants y usuarios
 * y crear usuarios para tenants existentes
 */

export default function AdminDebugPage() {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [createUserForm, setCreateUserForm] = useState({
    tenantEmail: 'contacto@delfincheckin.com',
    userEmail: 'contacto@delfincheckin.com',
    userFullName: 'Administrador',
    password: '',
    role: 'owner'
  })

  const fetchData = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/admin/check-tenants')
      const result = await response.json()
      
      if (response.ok) {
        setData(result)
      } else {
        setError(result.error || 'Error al obtener datos')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error de conexión')
    } finally {
      setIsLoading(false)
    }
  }

  const createUser = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/admin/check-tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createUserForm),
      })

      const result = await response.json()
      
      if (response.ok) {
        alert('✅ Usuario creado exitosamente!')
        setCreateUserForm(prev => ({ ...prev, password: '' }))
        fetchData() // Recargar datos
      } else {
        setError(result.error || 'Error al crear usuario')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error de conexión')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (isLoading && !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">🔍 Debug de Tenants</h1>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Actualizar
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {data && (
            <div className="space-y-6">
              {/* Resumen */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-blue-900 mb-2">📊 Resumen</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-blue-700">Total Tenants</p>
                    <p className="text-2xl font-bold text-blue-900">{data.summary.totalTenants}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">Total Usuarios</p>
                    <p className="text-2xl font-bold text-blue-900">{data.summary.totalUsers}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">Tenant contacto@delfincheckin.com</p>
                    <p className="text-2xl font-bold text-blue-900">{data.summary.hasSpecificTenant ? '✅' : '❌'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700">Usuario contacto@delfincheckin.com</p>
                    <p className="text-2xl font-bold text-blue-900">{data.summary.hasSpecificUser ? '✅' : '❌'}</p>
                  </div>
                </div>
              </div>

              {/* Tenant específico */}
              {data.specificTenant.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h2 className="text-lg font-semibold text-green-900 mb-2">🏢 Tenant contacto@delfincheckin.com</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(data.specificTenant[0]).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm text-green-700">{key}</p>
                        <p className="text-sm font-medium text-green-900">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Usuario específico */}
              {data.specificUser.length > 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h2 className="text-lg font-semibold text-green-900 mb-2">👤 Usuario contacto@delfincheckin.com</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(data.specificUser[0]).map(([key, value]) => (
                      <div key={key}>
                        <p className="text-sm text-green-700">{key}</p>
                        <p className="text-sm font-medium text-green-900">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h2 className="text-lg font-semibold text-yellow-900 mb-2">⚠️ Usuario no encontrado</h2>
                  <p className="text-yellow-800 mb-4">
                    No existe un usuario con email contacto@delfincheckin.com
                  </p>
                  <button
                    onClick={() => setShowCreateUser(!showCreateUser)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                  >
                    {showCreateUser ? 'Cancelar' : 'Crear Usuario'}
                  </button>
                </div>
              )}

              {/* Formulario para crear usuario */}
              {showCreateUser && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">👤 Crear Usuario</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email del Tenant</label>
                      <input
                        type="email"
                        value={createUserForm.tenantEmail}
                        onChange={(e) => setCreateUserForm(prev => ({ ...prev, tenantEmail: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="contacto@delfincheckin.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email del Usuario</label>
                      <input
                        type="email"
                        value={createUserForm.userEmail}
                        onChange={(e) => setCreateUserForm(prev => ({ ...prev, userEmail: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="contacto@delfincheckin.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                      <input
                        type="text"
                        value={createUserForm.userFullName}
                        onChange={(e) => setCreateUserForm(prev => ({ ...prev, userFullName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Administrador"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                      <input
                        type="password"
                        value={createUserForm.password}
                        onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Mínimo 8 caracteres"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={createUser}
                      disabled={isLoading || !createUserForm.password}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Creando...' : 'Crear Usuario'}
                    </button>
                  </div>
                </div>
              )}

              {/* Todos los tenants */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">🏢 Todos los Tenants</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Habitaciones</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usuarios</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Creado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.tenants.map((tenant: any) => (
                        <tr key={tenant.id} className="border-t border-gray-200">
                          <td className="px-4 py-2 text-sm text-gray-900">{tenant.id.slice(0, 8)}...</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{tenant.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{tenant.email}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{tenant.plan_id}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                              tenant.status === 'trial' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {tenant.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{tenant.current_rooms}/{tenant.max_rooms}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{tenant.user_count}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(tenant.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Todos los usuarios */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">👤 Todos los Usuarios</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Último Login</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Creado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.users.map((user: any) => (
                        <tr key={user.user_id} className="border-t border-gray-200">
                          <td className="px-4 py-2 text-sm text-gray-900">{user.user_email}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{user.full_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.role === 'owner' ? 'bg-purple-100 text-purple-800' :
                              user.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {user.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{user.tenant_name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Nunca'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(user.user_created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
