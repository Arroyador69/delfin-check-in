'use client'

import { useState } from 'react'

/**
 * 🧪 PÁGINA DE TEST PARA LOGIN
 * 
 * Esta página permite probar el login con información detallada de debug
 */

export default function AdminTestLoginPage() {
  const [email, setEmail] = useState('contacto@delfincheckin.com')
  const [password, setPassword] = useState('Cuaderno2314')
  const [result, setResult] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  const testLogin = async () => {
    setIsLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/admin/debug-login', {
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">🧪 Test de Login Debug</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                onClick={testLogin}
                disabled={isLoading || !email || !password}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Probando...' : 'Probar Login'}
              </button>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultado del Test</h3>
              {result && (
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="mb-4">
                    <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                      result.status >= 200 && result.status < 300 ? 'bg-green-100 text-green-800' :
                      result.status >= 400 && result.status < 500 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      Status: {result.status} {result.statusText}
                    </span>
                  </div>
                  
                  <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-96">
                    {JSON.stringify(result.data || result, null, 2)}
                  </pre>
                </div>
              )}
              
              {!result && (
                <div className="text-gray-500 text-center py-8">
                  Haz clic en "Probar Login" para ver el resultado
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">📋 Información del Test</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">¿Qué hace este test?</h3>
              <ul className="text-gray-600 space-y-1">
                <li>• Busca el usuario en la base de datos</li>
                <li>• Verifica el estado del usuario</li>
                <li>• Verifica el estado del tenant</li>
                <li>• Compara la contraseña</li>
                <li>• Muestra información detallada de cada paso</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Códigos de estado:</h3>
              <ul className="text-gray-600 space-y-1">
                <li>• <span className="font-mono bg-green-100 px-1 rounded">200</span> - Login exitoso</li>
                <li>• <span className="font-mono bg-yellow-100 px-1 rounded">400</span> - Datos faltantes</li>
                <li>• <span className="font-mono bg-yellow-100 px-1 rounded">401</span> - Contraseña incorrecta</li>
                <li>• <span className="font-mono bg-yellow-100 px-1 rounded">403</span> - Usuario/tenant inactivo</li>
                <li>• <span className="font-mono bg-yellow-100 px-1 rounded">404</span> - Usuario no encontrado</li>
                <li>• <span className="font-mono bg-red-100 px-1 rounded">500</span> - Error del servidor</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
