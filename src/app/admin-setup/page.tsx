'use client'

import { useState } from 'react'

/**
 * 🔧 PÁGINA DE CONFIGURACIÓN INICIAL
 * 
 * Esta página permite crear el tenant inicial y usuario administrador
 * Solo debe usarse una vez para la configuración inicial del sistema
 */

export default function AdminSetupPage() {
  const [formData, setFormData] = useState({
    tenantName: 'Delfín Check-in',
    tenantEmail: 'contacto@delfincheckin.com',
    userEmail: 'contacto@delfincheckin.com',
    userFullName: 'Administrador',
    password: '',
    confirmPassword: ''
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess(false)

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/admin/setup-tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantName: formData.tenantName,
          tenantEmail: formData.tenantEmail,
          userEmail: formData.userEmail,
          password: formData.password,
          userFullName: formData.userFullName
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }))
      } else {
        setError(data.error || 'Error al crear el tenant')
      }
    } catch (error) {
      console.error('Error en setup:', error)
      setError('Error de conexión. Verifica tu conexión a internet.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-6">
              <div className="flex items-center justify-center mb-2">
                <div className="text-5xl">🎉</div>
              </div>
              <h1 className="text-2xl font-bold text-white text-center">
                ¡Configuración Completada!
              </h1>
              <p className="text-green-100 text-center mt-1 text-sm">
                Sistema listo para usar
              </p>
            </div>

            <div className="px-8 py-8">
              <div className="text-center">
                <div className="mb-4">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Tenant Creado Exitosamente
                </h2>
                <p className="text-gray-600 mb-6">
                  Tu sistema multi-tenant está configurado y listo para usar.
                </p>
                <a
                  href="/admin-login"
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl inline-block text-center"
                >
                  Ir al Login
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center justify-center mb-2">
              <div className="text-5xl">🐬</div>
            </div>
            <h1 className="text-2xl font-bold text-white text-center">
              Configuración Inicial
            </h1>
            <p className="text-blue-100 text-center mt-1 text-sm">
              Crear tenant y usuario administrador
            </p>
          </div>

          <div className="px-8 py-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información del Tenant */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Información del Tenant
                </h3>
                
                <div>
                  <label htmlFor="tenantName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Establecimiento
                  </label>
                  <input
                    id="tenantName"
                    type="text"
                    value={formData.tenantName}
                    onChange={(e) => handleInputChange('tenantName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="Mi Hotel"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="tenantEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Email del Tenant
                  </label>
                  <input
                    id="tenantEmail"
                    type="email"
                    value={formData.tenantEmail}
                    onChange={(e) => handleInputChange('tenantEmail', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="contacto@mihotel.com"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              {/* Información del Usuario */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                  Usuario Administrador
                </h3>
                
                <div>
                  <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Email del Usuario
                  </label>
                  <input
                    id="userEmail"
                    type="email"
                    value={formData.userEmail}
                    onChange={(e) => handleInputChange('userEmail', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="admin@mihotel.com"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="userFullName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre Completo
                  </label>
                  <input
                    id="userFullName"
                    type="text"
                    value={formData.userFullName}
                    onChange={(e) => handleInputChange('userFullName', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="Juan Pérez"
                    disabled={isLoading}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="Mínimo 8 caracteres"
                    disabled={isLoading}
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Contraseña
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="Repite la contraseña"
                    disabled={isLoading}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {/* Mensajes de error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium text-red-800">
                      {error}
                    </p>
                  </div>
                </div>
              )}

              {/* Botón de submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creando...
                  </span>
                ) : (
                  'Crear Tenant y Usuario'
                )}
              </button>
            </form>
          </div>

          <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
            <p className="text-xs text-center text-gray-500">
              🔧 Configuración inicial del sistema multi-tenant
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Sistema de gestión para establecimientos turísticos
          </p>
        </div>
      </div>
    </div>
  )
}
