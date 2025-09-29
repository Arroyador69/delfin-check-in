'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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
    
    // Listener para detectar cambios en localStorage (cambio de contraseña)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'admin_password') {
        // Si cambió la contraseña, verificar autenticación de nuevo
        checkAuth()
      }
    }
    
    // Listener para detectar cambios en cookies (login/logout)
    const handleCookieChange = () => {
      checkAuth()
    }
    
    // Listener para eventos personalizados de autenticación
    const handleAuthChange = () => {
      checkAuth()
    }
    
    // Añadir listeners
    window.addEventListener('storage', handleStorageChange)
    document.addEventListener('visibilitychange', handleCookieChange)
    window.addEventListener('authChanged', handleAuthChange)
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      document.removeEventListener('visibilitychange', handleCookieChange)
      window.removeEventListener('authChanged', handleAuthChange)
    }
  }, [])

  const checkAuth = async () => {
    try {
      // Verificar si existe la cookie de autenticación
      const cookies = document.cookie.split(';')
      const authCookie = cookies.find(cookie => 
        cookie.trim().startsWith('auth_token=')
      )

      if (authCookie) {
        // Obtener la contraseña actual del localStorage
        const currentPassword = localStorage.getItem('admin_password') || 'Cuaderno2314'
        const token = authCookie.split('=')[1]
        
        if (token === currentPassword) {
          setIsAuthenticated(true)
        } else {
          // Token no coincide con la contraseña actual
          router.push('/admin-login')
          return
        }
      } else {
        // Si no está autenticado, redirigir al login
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

  const handleLogout = async () => {
    try {
      // Llamar a la API de logout
      await fetch('/api/auth/logout', { method: 'POST' })
      
      // Eliminar cookie manualmente
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      
      // Redirigir al login
      router.push('/admin-login')
    } catch (error) {
      console.error('Error logging out:', error)
      // Redirigir de todas formas
      router.push('/admin-login')
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
      {/* Contenido de la página */}
      {children}
    </div>
  )
}
