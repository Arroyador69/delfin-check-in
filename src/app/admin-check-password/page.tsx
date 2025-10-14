'use client'

import { useState } from 'react'

/**
 * 🔍 PÁGINA PARA VERIFICAR PROBLEMAS DE CONTRASEÑA
 * 
 * Esta página nos ayuda a debuggear problemas con hashes de contraseña
 */

export default function AdminCheckPasswordPage() {
  const [email, setEmail] = useState('contacto@delfincheckin.com')
  const [password, setPassword] = useState('Cuaderno2314')
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const checkPassword = async () => {
    setIsLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/admin/check-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      setResult({
        status: response.status,
        statusText: response.statusText,
        data
      })
    } catch (error) {
      setResult({
        error: 'Error de conexión',
        details: error instanceof Error ? error.message : 'Error desconocido'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">🔍 Verificación de Contraseña</h1>
          
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultado del Análisis</h3>
              {result && result.data && (
                <div className="space-y-4">
                  {/* Información del usuario */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">👤 Usuario</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>Email:</strong> {result.data.user.email}</p>
                      <p><strong>Nombre:</strong> {result.data.user.fullName}</p>
                      <p><strong>Rol:</strong> {result.data.user.role}</p>
                      <p><strong>Activo:</strong> {result.data.user.isActive ? '✅' : '❌'}</p>
                      <p><strong>Tenant:</strong> {result.data.user.tenant.name} ({result.data.user.tenant.status})</p>
                    </div>
                  </div>

                  {/* Análisis del hash */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">🔐 Análisis del Hash</h4>
                    <div className="text-sm text-gray-800 space-y-1">
                      <p><strong>Hash existe:</strong> {result.data.passwordAnalysis.hashAnalysis.exists ? '✅' : '❌'}</p>
                      <p><strong>Longitud:</strong> {result.data.passwordAnalysis.hashAnalysis.length}</p>
                      <p><strong>Prefijo:</strong> {result.data.passwordAnalysis.hashAnalysis.prefix}</p>
                      <p><strong>Formato bcrypt:</strong> {result.data.passwordAnalysis.hashAnalysis.isBcryptFormat ? '✅' : '❌'}</p>
                      <p><strong>Tiene salt:</strong> {result.data.passwordAnalysis.hashAnalysis.hasSalt ? '✅' : '❌'}</p>
                    </div>
                  </div>

                  {/* Resultados de verificación */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">🔍 Resultados de Verificación</h4>
                    <div className="text-sm text-green-800 space-y-1">
                      <p><strong>verifyPassword:</strong> {result.data.passwordAnalysis.verificationResults.ourVerifyPassword ? '✅' : '❌'}</p>
                      <p><strong>bcrypt.compare:</strong> {result.data.passwordAnalysis.verificationResults.bcryptCompare ? '✅' : '❌'}</p>
                      <p><strong>bcrypt.compareSync:</strong> {result.data.passwordAnalysis.verificationResults.bcryptCompareSync ? '✅' : '❌'}</p>
                    </div>
                    {result.data.passwordAnalysis.verificationError && (
                      <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-red-800 text-xs">
                        <strong>Error:</strong> {result.data.passwordAnalysis.verificationError}
                      </div>
                    )}
                  </div>

                  {/* Resultado final */}
                  <div className={`border rounded-lg p-4 ${
                    result.data.passwordAnalysis.finalResult 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <h4 className={`font-medium mb-2 ${
                      result.data.passwordAnalysis.finalResult 
                        ? 'text-green-900' 
                        : 'text-red-900'
                    }`}>
                      🎯 Resultado Final
                    </h4>
                    <p className={`text-lg font-bold ${
                      result.data.passwordAnalysis.finalResult 
                        ? 'text-green-800' 
                        : 'text-red-800'
                    }`}>
                      {result.data.passwordAnalysis.finalResult ? '✅ CONTRASEÑA VÁLIDA' : '❌ CONTRASEÑA INVÁLIDA'}
                    </p>
                  </div>

                  {/* Información adicional */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-yellow-900 mb-2">📊 Información Adicional</h4>
                    <div className="text-sm text-yellow-800 space-y-1">
                      <p><strong>Nuevo hash generado:</strong> {result.data.passwordAnalysis.newHashGenerated ? '✅' : '❌'}</p>
                      <p><strong>Verificación con nuevo hash:</strong> {result.data.passwordAnalysis.newHashVerification ? '✅' : '❌'}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {result && result.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-2">❌ Error</h4>
                  <p className="text-red-800">{result.error}</p>
                  {result.details && (
                    <p className="text-red-600 text-sm mt-2">{result.details}</p>
                  )}
                </div>
              )}
              
              {!result && (
                <div className="text-gray-500 text-center py-8">
                  Haz clic en "Verificar Contraseña" para ver el análisis
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 Información del Análisis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">¿Qué analiza esta herramienta?</h3>
              <ul className="text-gray-600 space-y-1">
                <li>• Si el hash existe en la base de datos</li>
                <li>• Si el hash tiene el formato correcto de bcrypt</li>
                <li>• Si la contraseña coincide usando diferentes métodos</li>
                <li>• Si hay errores en el proceso de verificación</li>
                <li>• Si se puede generar un nuevo hash válido</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Posibles problemas:</h3>
              <ul className="text-gray-600 space-y-1">
                <li>• Hash corrupto o mal formateado</li>
                <li>• Incompatibilidad entre versiones de bcrypt</li>
                <li>• Hash generado con configuración diferente</li>
                <li>• Problema en la función de verificación</li>
                <li>• Contraseña incorrecta</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
