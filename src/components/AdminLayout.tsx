'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * 🎨 LAYOUT ADMINISTRATIVO
 * 
 * Layout principal para páginas administrativas
 * - Verifica autenticación JWT
 * - Maneja refresh de tokens
 * - Proporciona botón de logout
 * - Sin uso de localStorage
 */

interface AdminLayoutProps {
  children: React.ReactNode
  showHeader?: boolean
}

export default function AdminLayout({ children, showHeader = true }: AdminLayoutProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    
    // Configurar intervalo para verificar autenticación periódicamente
    const interval = setInterval(() => {
      checkAuth()
    }, 5 * 60 * 1000) // Cada 5 minutos

    return () => clearInterval(interval)
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        setIsAuthenticated(true)
      } else if (response.status === 401) {
        const data = await response.json()
        
        // Si el token expiró, intentar renovarlo
        if (data.expired) {
          const refreshed = await tryRefreshToken()
          
          if (refreshed) {
            setIsAuthenticated(true)
          } else {
            router.push('/admin-login')
            return
          }
        } else {
          router.push('/admin-login')
          return
        }
      } else {
        router.push('/admin-login')
        return
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/admin-login')
      return
    } finally {
      setIsLoading(false)
    }
  }

  const tryRefreshToken = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      })

      return response.ok
    } catch (error) {
      console.error('Error refreshing token:', error)
      return false
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      })
      
      router.push('/admin-login')
    } catch (error) {
      console.error('Error logging out:', error)
      router.push('/admin-login')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showHeader && (
        <header className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">🐬</div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Delfín Check-in</h1>
                  <p className="text-sm text-gray-500">Panel de Administración</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="4" />
                    </svg>
                    Conectado
                  </span>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </header>
      )}
      
      <main>
        {children}
      </main>
    </div>
  )
}
