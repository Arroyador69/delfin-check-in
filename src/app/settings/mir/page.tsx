'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  EyeOff,
  Save,
  TestTube,
  ExternalLink,
  Info
} from 'lucide-react';

interface MirConfig {
  usuario: string;
  contraseña: string;
  codigoArrendador: string;
  codigoEstablecimiento: string;
  baseUrl: string;
  aplicacion: string;
  simulacion: boolean;
  activo: boolean;
}

export default function MirSettingsPage() {
  const [config, setConfig] = useState<MirConfig>({
    usuario: '',
    contraseña: '',
    codigoArrendador: '',
    codigoEstablecimiento: '',
    baseUrl: 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
    aplicacion: 'Delfin_Check_in',
    simulacion: false,
    activo: true
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Cargar configuración actual
  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const response = await fetch('/api/ministerio/verificar-config');
      const data = await response.json();
      
      if (data.success) {
        setConfig({
          usuario: data.config.usuario || '',
          contraseña: data.config.contraseña || '',
          codigoArrendador: data.config.codigoArrendador || '',
          codigoEstablecimiento: data.config.codigoEstablecimiento || '',
          baseUrl: data.config.baseUrl || 'https://hospedajes.ses.mir.es/hospedajes-web/ws/v1/comunicacion',
          aplicacion: data.config.aplicacion || 'Delfin_Check_in',
          simulacion: data.config.simulacion || false,
          activo: data.config.activo !== false
        });
      }
    } catch (err) {
      console.error('Error cargando configuración:', err);
    }
  };

  const guardarConfiguracion = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/ministerio/config-produccion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('✅ Configuración MIR guardada correctamente');
      } else {
        setError(`❌ ${data.message || 'Error guardando configuración'}`);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error guardando configuración:', err);
    } finally {
      setLoading(false);
    }
  };

  const probarConexion = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/ministerio/test-produccion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      const data = await response.json();
      setTestResult(data);
      
      if (data.success) {
        setSuccess('✅ Conexión con MIR exitosa');
      } else {
        setError(`❌ Error en la conexión: ${data.message}`);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error probando conexión:', err);
    } finally {
      setLoading(false);
    }
  };

  const getConfigStatus = () => {
    const hasRequired = config.usuario && config.contraseña && config.codigoArrendador;
    return {
      hasRequired,
      status: hasRequired ? 'Completa' : 'Incompleta',
      variant: hasRequired ? 'default' : 'destructive' as const
    };
  };

  const status = getConfigStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <h2 className="text-3xl font-bold mb-4 text-center">
            <span className="text-4xl mr-3" style={{fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif'}}>🏛️</span>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Configuración MIR</span>
          </h2>
          <p className="text-gray-700 font-medium text-lg">Configura las credenciales para el envío de comunicaciones al Ministerio del Interior</p>
        </div>

        {/* Estado de configuración */}
        <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900 font-bold">
              📊 Estado de Configuración
              <Badge variant={status.variant}>{status.status}</Badge>
            </CardTitle>
            <CardDescription className="text-gray-700 font-medium">
              Verifica que todas las credenciales estén configuradas correctamente
            </CardDescription>
          </CardHeader>
          <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-2">
              {config.usuario ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-semibold text-gray-800">Usuario MIR</span>
            </div>
            <div className="flex items-center space-x-2">
              {config.contraseña ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-semibold text-gray-800">Contraseña MIR</span>
            </div>
            <div className="flex items-center space-x-2">
              {config.codigoArrendador ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-semibold text-gray-800">Código Arrendador</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-red-800 font-semibold">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="text-green-800 font-semibold">{success}</AlertDescription>
        </Alert>
      )}

        {/* Formulario de configuración */}
        <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <CardHeader>
            <CardTitle className="text-gray-900 font-bold flex items-center">
              🔐 Credenciales MIR
            </CardTitle>
            <CardDescription className="text-gray-700 font-medium">
              Introduce las credenciales proporcionadas por el Ministerio del Interior
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usuario" className="text-gray-800 font-semibold">Usuario MIR *</Label>
              <Input
                id="usuario"
                placeholder="27380387ZWS"
                value={config.usuario}
                onChange={(e) => setConfig({...config, usuario: e.target.value})}
                className="text-gray-900"
              />
              <p className="text-xs text-gray-600 font-medium">
                Formato: DNI/CIF + letra + WS (ejemplo: 27380387ZWS, 12345678TWS)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contraseña" className="text-gray-800 font-semibold">Contraseña MIR *</Label>
              <div className="relative">
                <Input
                  id="contraseña"
                  type={showPassword ? "text" : "password"}
                  placeholder="Tu contraseña del MIR"
                  value={config.contraseña}
                  onChange={(e) => setConfig({...config, contraseña: e.target.value})}
                  className="text-gray-900"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="codigoArrendador" className="text-gray-800 font-semibold">Código de Arrendador *</Label>
            <Input
              id="codigoArrendador"
              placeholder="0000256653"
              value={config.codigoArrendador}
              onChange={(e) => setConfig({...config, codigoArrendador: e.target.value})}
              className="text-gray-900"
            />
            <p className="text-xs text-gray-600 font-medium">
              Código único asignado por el MIR para autenticación
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="codigoEstablecimiento" className="text-gray-800 font-semibold">Código de Establecimiento *</Label>
            <Input
              id="codigoEstablecimiento"
              placeholder="0000256653"
              value={config.codigoEstablecimiento}
              onChange={(e) => setConfig({...config, codigoEstablecimiento: e.target.value})}
              className="text-gray-900"
            />
            <p className="text-xs text-gray-600 font-medium">
              Código específico del establecimiento para las comunicaciones MIR
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl" className="text-gray-800 font-semibold">URL del Servicio MIR</Label>
            <Input
              id="baseUrl"
              value={config.baseUrl}
              readOnly
              className="text-gray-900 bg-gray-50"
            />
            <p className="text-xs text-gray-600 font-medium">
              URL oficial del servicio de comunicaciones MIR (no editable)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aplicacion" className="text-gray-800 font-semibold">Nombre de la Aplicación</Label>
            <Input
              id="aplicacion"
              value={config.aplicacion}
              readOnly
              className="text-gray-900 bg-gray-50"
            />
            <p className="text-xs text-gray-600 font-medium">
              Nombre fijo de la aplicación (no editable)
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="simulacion"
              checked={config.simulacion}
              onChange={(e) => setConfig({...config, simulacion: e.target.checked})}
              className="rounded"
            />
            <Label htmlFor="simulacion" className="text-gray-800 font-semibold">Modo simulación (solo para pruebas)</Label>
          </div>
        </CardContent>
      </Card>

        {/* Información importante */}
        <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 font-bold">
              <Info className="h-5 w-5 mr-2" />
              ℹ️ Información Importante
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
          <div className="text-sm text-gray-600">
            <p><strong>¿Cómo obtener las credenciales?</strong></p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Regístrate en el portal MIR: <a href="https://hospedajes.ses.mir.es" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">hospedajes.ses.mir.es</a></li>
              <li>Marca la casilla "Envío de comunicaciones por servicio web"</li>
              <li>Obtén tu usuario (formato: CIF---WS), contraseña y código de arrendador</li>
              <li>Configura estas credenciales en este formulario</li>
            </ol>
          </div>
          
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
            <p className="text-sm text-orange-600">
              <strong>Importante:</strong> Las credenciales son sensibles. Asegúrate de que estén configuradas correctamente antes de usar el sistema en producción.
            </p>
          </div>
        </CardContent>
      </Card>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            onClick={guardarConfiguracion} 
            disabled={loading || !status.hasRequired}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <Save className="h-5 w-5 mr-2" />
            {loading ? '⏳ Guardando...' : '💾 Guardar Configuración'}
          </Button>
          
          <Button 
            onClick={probarConexion} 
            disabled={loading || !status.hasRequired}
            variant="outline"
            className="flex-1 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <TestTube className="h-5 w-5 mr-2" />
            {loading ? '⏳ Probando...' : '🧪 Probar Conexión'}
          </Button>
          
          <Button 
            onClick={() => window.open('/admin/mir-comunicaciones', '_blank')}
            variant="outline"
            className="flex-1 border-2 border-green-600 text-green-600 hover:bg-green-50 font-semibold px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            🌐 Ir al Panel MIR
          </Button>
        </div>

        {/* Resultado de la prueba */}
        {testResult && (
          <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
            <CardHeader>
              <CardTitle className="text-gray-900 font-bold flex items-center">
                📋 Resultado de la Prueba
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto text-gray-900 font-mono">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
            {/* Delfín Check-in */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delfín Check-in</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Software de gestión hotelera y auto check-in para hostales y apartamentos.
              </p>
            </div>

            {/* Contacto */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Contacto</h3>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  contacto@delfincheckin.com
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <svg className="h-4 w-4 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Lun-Dom: 9:00-22:00
                </div>
              </div>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Legal</h3>
              <div className="space-y-1">
                <a href="/legal/privacy" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Política de Privacidad
                </a>
                <a href="/legal/cookies" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Política de Cookies
                </a>
                <a href="/legal/terms" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Términos de Servicio
                </a>
                <a href="/legal/notice" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Aviso Legal
                </a>
                <a href="/legal/cookies" className="block text-sm text-blue-600 hover:text-blue-800 underline">
                  Gestionar Cookies
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-gray-200 pt-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">
                © 2025 Delfín Check-in ·{' '}
                <a href="https://delfincheckin.com" className="text-blue-600 hover:text-blue-800 underline">
                  Ver precios
                </a>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}