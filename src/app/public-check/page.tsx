'use client'

import { useState } from 'react'

/**
 * 🔍 PÁGINA PÚBLICA PARA VERIFICAR CONTRASEÑA
 * 
 * Esta página usa una API pública para evitar problemas de autenticación
 */

export default function PublicCheckPage() {
  const [email, setEmail] = useState('contacto@delfincheckin.com')
  const [password, setPassword] = useState('Cuaderno2314')
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const checkPassword = async () => {
    setIsLoading(true)
    setResult(null)
    
    try {
      console.log('Enviando petición a API pública...')
      const response = await fetch('/api/public/check-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      console.log('Respuesta recibida:', response.status, response.statusText)
      const data = await response.json()
      console.log('Datos recibidos:', data)
      
      setResult({
        status: response.status,
        success: data.success,
        data: data
      })
    } catch (error) {
      console.error('Error completo:', error)
      setResult({
        success: false,
        error: 'Error de conexión',
        details: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const testApiConnection = async () => {
    try {
      console.log('Probando conexión con API...')
      const response = await fetch('/api/public/check-password', {
        method: 'GET',
      })
      
      const data = await response.json()
      console.log('Test API respuesta:', data)
      
      setResult({
        success: true,
        test: true,
        data: data
      })
    } catch (error) {
      console.error('Error en test API:', error)
      setResult({
        success: false,
        error: 'Error conectando con API',
        details: error instanceof Error ? error.message : 'Error desconocido'
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">🔍 Verificación Pública de Contraseña</h1>
          
          <div className="mb-4">
            <button
              onClick={testApiConnection}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              🧪 Probar Conexión API
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="contacto@delfincheckin.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tu contraseña"
                />
              </div>
              
              <button
                onClick={checkPassword}
                disabled={isLoading || !email || !password}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verificando...' : 'Verificar Contraseña'}
              </button>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultado</h3>
              
              {result && result.test && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-green-900 mb-2">🧪 Test de Conexión</h4>
                  <p className="text-green-800">✅ API funcionando correctamente</p>
                  <p className="text-sm text-green-600">Timestamp: {result.data?.timestamp}</p>
                </div>
              )}
              
              {result && result.success && result.data && !result.test && (
                <div className="space-y-4">
                  {/* Información del usuario */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">👤 Usuario</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>Email:</strong> {result.data.user?.email || 'N/A'}</p>
                      <p><strong>Nombre:</strong> {result.data.user?.fullName || 'N/A'}</p>
                      <p><strong>Rol:</strong> {result.data.user?.role || 'N/A'}</p>
                      <p><strong>Activo:</strong> {result.data.user?.isActive ? '✅' : '❌'}</p>
                      <p><strong>Tenant:</strong> {result.data.user?.tenant?.name || 'N/A'} ({result.data.user?.tenant?.status || 'N/A'})</p>
                    </div>
                  </div>

                  {/* Análisis del hash */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">🔐 Análisis del Hash</h4>
                    <div className="text-sm text-gray-800 space-y-1">
                      <p><strong>Hash existe:</strong> {result.data.passwordAnalysis?.hashAnalysis?.exists ? '✅' : '❌'}</p>
                      <p><strong>Longitud:</strong> {result.data.passwordAnalysis?.hashAnalysis?.length || 'N/A'}</p>
                      <p><strong>Prefijo:</strong> {result.data.passwordAnalysis?.hashAnalysis?.prefix || 'N/A'}</p>
                      <p><strong>Formato bcrypt:</strong> {result.data.passwordAnalysis?.hashAnalysis?.isBcryptFormat ? '✅' : '❌'}</p>
                    </div>
                  </div>

                  {/* Resultado de verificación */}
                  <div className={`border rounded-lg p-4 ${
                    result.data.passwordAnalysis?.passwordValid 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <h4 className={`font-medium mb-2 ${
                      result.data.passwordAnalysis?.passwordValid 
                        ? 'text-green-900' 
                        : 'text-red-900'
                    }`}>
                      🔍 Verificación de Contraseña
                    </h4>
                    <p className={`text-lg font-bold ${
                      result.data.passwordAnalysis?.passwordValid 
                        ? 'text-green-800' 
                        : 'text-red-800'
                    }`}>
                      {result.data.passwordAnalysis?.passwordValid ? '✅ CONTRASEÑA VÁLIDA' : '❌ CONTRASEÑA INVÁLIDA'}
                    </p>
                    {result.data.message && (
                      <p className="text-sm mt-2 text-gray-600">{result.data.message}</p>
                    )}
                  </div>

                  {/* Información adicional */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">📊 Información Adicional</h4>
                    <div className="text-sm text-yellow-800 space-y-1">
                      <p><strong>Nuevo hash generado:</strong> {result.data.passwordAnalysis?.newHashGenerated ? '✅' : '❌'}</p>
                      <p><strong>Nuevo hash válido:</strong> {result.data.passwordAnalysis?.newHashValid ? '✅' : '❌'}</p>
                    </div>
                    {result.data.passwordAnalysis?.verificationError && (
                      <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-red-800 text-xs">
                        <strong>Error:</strong> {result.data.passwordAnalysis.verificationError}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {result && !result.success && !result.test && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">❌ Error</h4>
                  <p className="text-red-800">{result.error || result.data?.error}</p>
                  {result.details && (
                    <p className="text-red-600 text-sm mt-2">{result.details}</p>
                  )}
                  {result.data?.debug && (
                    <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                      <strong>Debug:</strong> {JSON.stringify(result.data.debug, null, 2)}
                    </div>
                  )}
                </div>
              )}
              
              {!result && (
                <div className="text-gray-500 text-center py-8">
                  Haz clic en "Probar Conexión API" primero, luego "Verificar Contraseña"
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 Información</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>Esta herramienta:</strong> Usa una API pública para evitar problemas de autenticación.</p>
            <p><strong>Primero:</strong> Prueba la conexión con "Probar Conexión API".</p>
            <p><strong>Luego:</strong> Verifica tu contraseña con "Verificar Contraseña".</p>
            <p><strong>Si funciona:</strong> Podremos identificar exactamente dónde está el problema.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
