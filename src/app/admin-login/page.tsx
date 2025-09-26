'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Cargar credenciales personalizadas
  const [adminCredentials, setAdminCredentials] = useState({
    username: 'admin',
    password: 'Cuaderno2314'
  })

  // Cargar credenciales personalizadas al montar el componente
  useEffect(() => {
    const loadCredentials = () => {
      try {
        const savedUsername = localStorage.getItem('admin_username') || 'admin'
        const savedPassword = localStorage.getItem('admin_password') || 'Cuaderno2314'
        
        setAdminCredentials({
          username: savedUsername,
          password: savedPassword
        })
      } catch (error) {
        console.error('Error cargando credenciales:', error)
      }
    }
    
    loadCredentials()
  }, [])

  // Verificar si ya está autenticado
  useEffect(() => {
    const cookies = document.cookie.split(';')
    const authCookie = cookies.find(cookie => 
      cookie.trim().startsWith('auth_token=')
    )
    
    if (authCookie) {
      // Verificar si el token coincide con la contraseña actual
      const token = authCookie.split('=')[1]
      const currentPassword = localStorage.getItem('admin_password') || 'Cuaderno2314'
      
      if (token === currentPassword) {
        // Si ya está autenticado, redirigir al dashboard
        router.push('/')
      }
    }
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Verificar credenciales con las credenciales personalizadas
      if (username === adminCredentials.username && password === adminCredentials.password) {
        // Credenciales correctas
        setSuccess(true)
        
        // Establecer cookie de autenticación con la contraseña actual
        const expires = new Date()
        expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)) // 24 horas
        document.cookie = `auth_token=${adminCredentials.password}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`
        
        // Redirigir después de 1.5 segundos
        setTimeout(() => {
          router.push('/')
        }, 1500)
        
      } else {
        setError('Usuario o contraseña incorrectos')
        setPassword('')
      }
    } catch (error) {
      setError('Error al procesar el login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo y Título */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🐬</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Delfín Check-in</h1>
          <p className="text-gray-600">Panel de Administración</p>
        </div>

        {/* Formulario de Login */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Iniciar Sesión</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin"
                autoComplete="username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verificando...' : 'Acceder al Dashboard'}
            </button>
          </form>

          {/* Mensajes de Estado */}
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              ¡Acceso correcto! Redirigiendo al dashboard...
            </div>
          )}
        </div>

        {/* Información de Seguridad */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            🔒 Acceso restringido solo para administradores autorizados
          </p>
        </div>
      </div>
    </div>
  )
}
