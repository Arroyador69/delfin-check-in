'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * 🔒 GUARDIA DE AUTENTICACIÓN
 * 
 * Verifica que el usuario esté autenticado mediante JWT
 * - No usa localStorage (más seguro)
 * - Verifica tokens en el servidor
 * - Redirige a login si no está autenticado
 * - Intenta renovar token expirado automáticamente
 */

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Verificar autenticación mediante API
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include', // Importante para enviar cookies
      })

      if (response.ok) {
        // Usuario autenticado
        setIsAuthenticated(true)
      } else if (response.status === 401) {
        // No autenticado o token expirado
        const data = await response.json()
        
        if (data.expired) {
          // Intentar renovar el token
          const refreshed = await tryRefreshToken()
          
          if (refreshed) {
            setIsAuthenticated(true)
          } else {
            // No se pudo renovar, redirigir a login
            router.push('/admin-login')
          }
        } else {
          // No hay sesión, redirigir a login
          router.push('/admin-login')
        }
      } else {
        // Error del servidor
        console.error('Error al verificar autenticación')
        router.push('/admin-login')
      }
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/admin-login')
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

      if (response.ok) {
        console.log('Token renovado exitosamente')
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error al renovar token:', error)
      return false
    }
  }

  const handleLogout = async () => {
    try {
      // Llamar a la API de logout
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' // Importante: incluir cookies para que se eliminen
      })
      
      if (!response.ok) {
        console.error('Error en respuesta de logout:', response.status)
      }
      
      // ⚠️ CRÍTICO: Limpiar cualquier estado del cliente
      setIsAuthenticated(false)
      
      // ⚠️ CRÍTICO: Forzar recarga completa para limpiar cualquier caché
      // Esto asegura que todas las cookies se eliminen correctamente
      window.location.href = '/admin-login'
      
      // NOTA: Usamos window.location.href en lugar de router.push
      // porque router.push puede no limpiar completamente el estado
      // y las cookies pueden persistir en algunos casos
      
    } catch (error) {
      console.error('Error logging out:', error)
      // Redirigir de todas formas, incluso si hay error
      setIsAuthenticated(false)
      window.location.href = '/admin-login'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // No mostrar nada mientras redirige
  }

  return (
    <div>
      {/* Header con botón de logout */}
      <div className="bg-white shadow-sm border-b px-4 py-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="text-2xl mr-2">🐬</div>
            <span className="text-sm text-gray-600">Panel Administrativo</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
      
      {/* Contenido del dashboard */}
      {children}
    </div>
  )
}
