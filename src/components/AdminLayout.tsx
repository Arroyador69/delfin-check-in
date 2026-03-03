'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

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
  const pathname = usePathname()

  useEffect(() => {
    // En dashboard (/ o /dashboard), dar un breve margen para que la cookie esté disponible
    const isDashboard = pathname === '/' || pathname === '' || pathname === '/dashboard'
    const delay = isDashboard ? 400 : 0
    const t = setTimeout(() => {
      checkAuth()
    }, delay)
    const interval = setInterval(() => checkAuth(), 5 * 60 * 1000)
    return () => {
      clearTimeout(t)
      clearInterval(interval)
    }
  }, [pathname])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        setIsAuthenticated(true)
        return
      }

      if (response.status === 401) {
        const data = await response.json().catch(() => ({}))
        if (data.expired) {
          const refreshed = await tryRefreshToken()
          if (refreshed) {
            setIsAuthenticated(true)
            return
          }
        }
        // Fallback: si verify falla, comprobar con /api/tenant (misma cookie)
        const tenantRes = await fetch('/api/tenant', { method: 'GET', credentials: 'include' })
        if (tenantRes.ok) {
          setIsAuthenticated(true)
          return
        }
        // Solo en dashboard (/ o /dashboard): varios reintentos para que se muestre el contenido
        if (pathname === '/' || pathname === '' || pathname === '/dashboard') {
          for (const delayMs of [500, 1000]) {
            await new Promise((r) => setTimeout(r, delayMs))
            const retryVerify = await fetch('/api/auth/verify', { method: 'GET', credentials: 'include' })
            if (retryVerify.ok) {
              setIsAuthenticated(true)
              return
            }
            const retryTenant = await fetch('/api/tenant', { method: 'GET', credentials: 'include' })
            if (retryTenant?.ok) {
              setIsAuthenticated(true)
              return
            }
          }
        }
      }

      const redirect = (pathname && pathname !== '/admin-login') ? encodeURIComponent(pathname) : ''
      router.push(redirect ? `/admin-login?redirect=${redirect}` : '/admin-login')
    } catch (error) {
      console.error('Error checking auth:', error)
      const tenantRes = await fetch('/api/tenant', { method: 'GET', credentials: 'include' }).catch(() => null)
      if (tenantRes?.ok) {
        setIsAuthenticated(true)
        return
      }
      const redirect = (pathname && pathname !== '/admin-login') ? encodeURIComponent(pathname) : ''
      router.push(redirect ? `/admin-login?redirect=${redirect}` : '/admin-login')
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
      // Llamar a la API de logout
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' // Importante: incluir cookies para que se eliminen
      })
      
      if (!response.ok) {
        console.error('Error en respuesta de logout:', response.status)
      }
      
      // ⚠️ CRÍTICO: Forzar recarga completa para limpiar cualquier caché
      // Esto asegura que todas las cookies se eliminen correctamente
      window.location.href = '/admin-login'
      
      // NOTA: Usamos window.location.href en lugar de router.push
      // porque router.push puede no limpiar completamente el estado
      // y las cookies pueden persistir en algunos casos
      
    } catch (error) {
      console.error('Error logging out:', error)
      // Redirigir de todas formas, incluso si hay error
      window.location.href = '/admin-login'
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
