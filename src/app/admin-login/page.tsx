'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

/** Redirigir solo a rutas internas (evita open redirect). */
function getSafeRedirect(redirect: string | null): string {
  if (!redirect || typeof redirect !== 'string') return '/'
  const decoded = decodeURIComponent(redirect.trim())
  if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.includes(':')) return decoded
  return '/'
}

/** Dashboard con locale para que el idioma se mantenga tras el login. */
function getDashboardPath(): string {
  if (typeof window === 'undefined') return '/es/dashboard'
  const loc = localStorage.getItem('preferred-locale')
  if (loc && ['es', 'en', 'it', 'pt', 'fr'].includes(loc)) return `/${loc}/dashboard`
  return '/es/dashboard'
}

/**
 * 🔐 PÁGINA DE LOGIN MULTI-TENANT
 * 
 * Características:
 * - Autenticación por email y contraseña por tenant
 * - Sin almacenamiento de contraseñas en localStorage
 * - Autenticación basada en JWT con tenant_id
 * - Validación de entrada (email + contraseña)
 * - Manejo de errores de rate limiting
 * - Interfaz de usuario mejorada
 * 
 * NOTA: Esta página NO está traducida porque es el punto de entrada
 * al sistema. Una vez autenticado, el usuario verá el PMS en su idioma.
 */

function AdminLoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    remaining?: number;
    retryAfter?: number;
  } | null>(null)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')

  // Si ya hay sesión, ir al panel. Por defecto /{locale}/dashboard; si hay ?redirect= válido, allí.
  useEffect(() => {
    fetch('/api/tenant', { credentials: 'include' })
      .then((r) => {
        if (r.ok) {
          const raw = getSafeRedirect(redirectParam)
          const target = raw === '/' ? getDashboardPath() : raw
          router.replace(target)
        }
      })
      .catch(() => {})
  }, [router, redirectParam])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setRateLimitInfo(null)

    // Validación básica
    if (!email || email.trim().length === 0) {
      setError('Por favor introduce tu email')
      setIsLoading(false)
      return
    }
    
    if (!password || password.trim().length === 0) {
      setError('Por favor introduce tu contraseña')
      setIsLoading(false)
      return
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Por favor introduce un email válido')
      setIsLoading(false)
      return
    }

    try {
      // Llamar a la API de login (credentials: 'include' para que el navegador guarde las cookies Set-Cookie)
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (response.ok) {
        // Login exitoso: ir a /{locale}/dashboard o a ?redirect= si viene
        setSuccess(true)
        setEmail('')
        setPassword('')
        const raw = getSafeRedirect(redirectParam)
        const target = raw === '/' ? getDashboardPath() : raw
        setTimeout(() => {
          router.replace(target)
        }, 300)
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.location.pathname === '/admin-login') {
            window.location.replace(target)
          }
        }, 1200)
        
      } else {
        // Manejar errores específicos
        if (response.status === 429) {
          // Rate limit excedido
          setError(data.message || 'Demasiados intentos. Por favor espera antes de intentar nuevamente.')
          setRateLimitInfo({
            retryAfter: data.retryAfter
          })
        } else if (response.status === 401) {
          // Credenciales inválidas
          setError(data.message || 'Email o contraseña incorrectos')
          if (data.remaining !== undefined) {
            setRateLimitInfo({
              remaining: data.remaining
            })
          }
        } else {
          // Otros errores
          setError(data.message || 'Error al iniciar sesión. Por favor intenta nuevamente.')
        }
        
        setEmail('')
        setPassword('')
      }
    } catch (error) {
      console.error('Error en login:', error)
      setError('Error de conexión. Por favor verifica tu conexión a internet.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center justify-center mb-2">
              <div className="text-5xl">🐬</div>
            </div>
            <h1 className="text-2xl font-bold text-white text-center">
              Delfín Check-in
            </h1>
            <p className="text-blue-100 text-center mt-1 text-sm">
              Gestión inteligente de alojamientos
            </p>
          </div>

          {/* Body */}
          <div className="px-8 py-8">
            {success ? (
              <div className="text-center">
                <div className="mb-4">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  ¡Bienvenido de nuevo!
                </h2>
                <p className="text-gray-600">
                  Redirigiendo al panel de control...
                </p>
                <div className="mt-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Campo de email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Correo electrónico
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                    placeholder="tu@email.com"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                {/* Campo de contraseña */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-14 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                      placeholder="••••••••"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-600 hover:text-gray-900"
                      disabled={isLoading}
                    >
                      {showPassword ? 'Ocultar' : 'Ver'}
                    </button>
                  </div>
                </div>

                {/* Mensajes de error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">
                          {error}
                        </p>
                        {rateLimitInfo && rateLimitInfo.remaining !== undefined && (
                          <p className="text-xs text-red-600 mt-1">
                            {rateLimitInfo.remaining === 0 
                              ? 'Has agotado tus intentos. Espera antes de intentar nuevamente.'
                              : `${rateLimitInfo.remaining} intento${rateLimitInfo.remaining !== 1 ? 's' : ''} restante${rateLimitInfo.remaining !== 1 ? 's' : ''}`
                            }
                          </p>
                        )}
                        {rateLimitInfo && rateLimitInfo.retryAfter && (
                          <p className="text-xs text-red-600 mt-1">
                            Podrás intentar nuevamente en {Math.ceil(rateLimitInfo.retryAfter / 60)} minuto{Math.ceil(rateLimitInfo.retryAfter / 60) !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
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
                      Verificando...
                    </span>
                  ) : (
                    'Iniciar sesión'
                  )}
                </button>

                {/* Enlace de recuperación de contraseña */}
                <div className="text-center mt-4">
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
            <p className="text-xs text-center text-gray-500 mb-2">
              🔒 Conexión segura mediante encriptación SSL
            </p>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Sistema de gestión para propiedades vacacionales
          </p>
        </div>

      </div>
    </div>
  )
}

function AdminLoginFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" aria-hidden />
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginFallback />}>
      <AdminLoginContent />
    </Suspense>
  )
}
