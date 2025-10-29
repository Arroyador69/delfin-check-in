'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * 🎨 LAYOUT ADMINISTRATIVO
 * 
 * Layout principal para páginas administrativas
 * - Verifica autenticación JWT
 * - Maneja refresh de tokens
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
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
