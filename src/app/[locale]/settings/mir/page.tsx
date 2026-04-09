'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/hooks/useTenant';
import { useTranslations } from 'next-intl';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  EyeOff,
  Save,
  TestTube,
  ExternalLink,
  Info,
  Globe
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

const COUNTRY_CODES = ['ES', 'IT', 'PT', 'FR', 'DE'] as const;

export default function MirSettingsPage() {
  const t = useTranslations('settings.mir');
  const { tenant } = useTenant();
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
  const [countryCode, setCountryCode] = useState<string>('');
  const [savingCountry, setSavingCountry] = useState(false);
  const [hasConfig, setHasConfig] = useState(false); // Para saber si hay datos configurados
  const [editingUsuario, setEditingUsuario] = useState(false);
  const [editingContraseña, setEditingContraseña] = useState(false);

  // Cargar configuración actual
  useEffect(() => {
    cargarConfiguracion();
    cargarCountryCode();
  }, []);

  const cargarCountryCode = async () => {
    try {
      const response = await fetch('/api/tenant/country-code');
      const data = await response.json();
      if (data.success) {
        setCountryCode(data.country_code || '');
      }
    } catch (err) {
      console.error('Error cargando country_code:', err);
    }
  };

  const guardarCountryCode = async () => {
    if (!countryCode) {
      setError(t('selectCountry'));
      return;
    }

    setSavingCountry(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/tenant/country-code', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country_code: countryCode })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`✅ ${t('countrySaved')}`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(`❌ ${data.error || t('errorSavingCountry')}`);
      }
    } catch (err) {
      setError(t('connectionError'));
      console.error('Error guardando país:', err);
    } finally {
      setSavingCountry(false);
    }
  };

  const cargarConfiguracion = async () => {
    try {
      const response = await fetch('/api/ministerio/verificar-config');
      const data = await response.json();
      
      if (data.success) {
        const hasUsuario = !!data.config.usuario;
        const hasContraseña = !!data.config.contraseña;
        const hasAnySensitive =
          hasUsuario ||
          hasContraseña ||
          !!data.config.codigoArrendador ||
          !!data.config.codigoEstablecimiento;
        setHasConfig(hasAnySensitive);
        setConfig({
          // No pre-rellenar datos sensibles (evita exposición accidental en UI)
          usuario: '',
          contraseña: '',
          codigoArrendador: '',
          codigoEstablecimiento: '',
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
        setSuccess(`✅ ${t('configSaved')}`);
      } else {
        setError(`❌ ${data.message || t('errorSavingConfig')}`);
      }
    } catch (err) {
      setError(t('connectionError'));
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
        setSuccess(`✅ ${t('connectionSuccess')}`);
      } else {
        setError(`❌ ${t('connectionTestError', { message: data.message || '' })}`);
      }
    } catch (err) {
      setError(t('connectionError'));
      console.error('Error probando conexión:', err);
    } finally {
      setLoading(false);
    }
  };

  const getConfigStatus = () => {
    const hasRequired = config.usuario && config.contraseña && config.codigoArrendador;
    return {
      hasRequired,
      status: hasRequired ? t('statusComplete') : t('statusIncomplete'),
      variant: hasRequired ? ('default' as const) : ('destructive' as const),
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
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{t('title')}</span>
          </h2>
          <p className="text-gray-700 font-medium text-lg">{t('subtitle')}</p>
        </div>

        {/* Banner Recordatorio MIR - Solo si no tiene módulo activado */}
        {tenant && (!tenant.legal_module || tenant.plan_type === 'free') && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-blue-900 mb-2">
                  💰 {t('moduleBannerTitle')}
                </h3>
                <p className="text-base text-blue-800 mb-2">
                  {t('moduleBannerReminder')}
                </p>
                <p className="text-sm text-blue-700 mb-2">
                  {t('moduleBannerPrice')}
                </p>
                <ul className="list-disc list-inside text-blue-800 text-sm space-y-1">
                  <li>{t('moduleBannerItem1')}</li>
                  <li>{t('moduleBannerItem2')}</li>
                  <li>{t('moduleBannerItem3')}</li>
                  <li>{t('moduleBannerItem4')}</li>
                </ul>
              </div>
              <Link
                href="/upgrade-plan"
                className="whitespace-nowrap bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow-md hover:shadow-lg"
              >
                {t('activateModule')}
              </Link>
            </div>
          </div>
        )}

        {/* Estado de configuración */}
        <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-gray-900 font-bold">
              📊 {t('configStatusTitle')}
              <Badge variant={status.variant}>{status.status}</Badge>
            </CardTitle>
            <CardDescription className="text-gray-700 font-medium">
              {t('configStatusDescription')}
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
              <span className="text-sm font-semibold text-gray-800">{t('userMir')}</span>
            </div>
            <div className="flex items-center space-x-2">
              {config.contraseña ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-semibold text-gray-800">{t('passwordMir')}</span>
            </div>
            <div className="flex items-center space-x-2">
              {config.codigoArrendador ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-semibold text-gray-800">{t('codigoArrendador')}</span>
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
              🔐 {t('credentialsTitle')}
            </CardTitle>
            <CardDescription className="text-gray-700 font-medium">
              {t('credentialsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="usuario" className="text-gray-800 font-semibold">{t('userLabel')}</Label>
              <Input
                id="usuario"
                placeholder={t('userPlaceholder')}
                value={hasConfig && !editingUsuario && config.usuario ? "•••••••••••" : config.usuario}
                onChange={(e) => {
                  if (e.target.value !== "•••••••••••") {
                    setConfig({...config, usuario: e.target.value});
                    setEditingUsuario(true);
                  }
                }}
                onFocus={() => {
                  if (hasConfig && config.usuario && !editingUsuario) {
                    setEditingUsuario(true);
                    setConfig({...config, usuario: ""});
                  }
                }}
                onBlur={() => {
                  if (config.usuario) {
                    setEditingUsuario(false);
                  }
                }}
                className="text-gray-900"
              />
              <p className="text-xs text-gray-600 font-medium">
                {t('userHint')}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contraseña" className="text-gray-800 font-semibold">{t('passwordLabel')}</Label>
              <div className="relative">
                <Input
                  id="contraseña"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('passwordPlaceholder')}
                  value={
                    hasConfig && !editingContraseña && config.contraseña && !showPassword
                      ? "••••••••"
                      : config.contraseña
                  }
                  onChange={(e) => {
                    if (e.target.value !== "••••••••") {
                      setConfig({...config, contraseña: e.target.value});
                      setEditingContraseña(true);
                    }
                  }}
                  onFocus={() => {
                    if (hasConfig && config.contraseña && !editingContraseña) {
                      setEditingContraseña(true);
                      setConfig({...config, contraseña: ""});
                    }
                  }}
                  onBlur={() => {
                    if (config.contraseña) {
                      setEditingContraseña(false);
                    }
                  }}
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
            <Label htmlFor="codigoArrendador" className="text-gray-800 font-semibold">{t('codigoArrendadorLabel')}</Label>
            <Input
              id="codigoArrendador"
              placeholder={t('codigoArrendadorPlaceholder')}
              value={config.codigoArrendador}
              onChange={(e) => setConfig({...config, codigoArrendador: e.target.value})}
              className="text-gray-900"
            />
            <p className="text-xs text-gray-600 font-medium">
              {t('codigoArrendadorHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="codigoEstablecimiento" className="text-gray-800 font-semibold">{t('codigoEstablecimientoLabel')}</Label>
            <Input
              id="codigoEstablecimiento"
              placeholder={t('codigoEstablecimientoPlaceholder')}
              value={config.codigoEstablecimiento}
              onChange={(e) => setConfig({...config, codigoEstablecimiento: e.target.value})}
              className="text-gray-900"
            />
            <p className="text-xs text-gray-600 font-medium">
              {t('codigoEstablecimientoHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl" className="text-gray-800 font-semibold">{t('baseUrlLabel')}</Label>
            <Input
              id="baseUrl"
              value={config.baseUrl}
              readOnly
              className="text-gray-900 bg-gray-50"
            />
            <p className="text-xs text-gray-600 font-medium">
              {t('baseUrlHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aplicacion" className="text-gray-800 font-semibold">{t('appNameLabel')}</Label>
            <Input
              id="aplicacion"
              value={config.aplicacion}
              readOnly
              className="text-gray-900 bg-gray-50"
            />
            <p className="text-xs text-gray-600 font-medium">
              {t('appNameHint')}
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
            <Label htmlFor="simulacion" className="text-gray-800 font-semibold">{t('simulacionLabel')}</Label>
          </div>
        </CardContent>
      </Card>

      {/* Selector de País para Módulo Legal */}
      {tenant?.legal_module && (
        <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <CardHeader>
            <CardTitle className="text-gray-900 font-bold flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              {t('countryCardTitle')}
            </CardTitle>
            <CardDescription className="text-gray-700 font-medium">
              {tenant?.plan_type === 'pro' 
                ? t('countryCardDescriptionPro')
                : t('countryCardDescriptionFree')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenant?.plan_type === 'free_legal' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="country_code" className="text-gray-800 font-semibold">{t('countryLabel')}</Label>
                  <select
                    id="country_code"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-900 bg-white"
                  >
                    <option value="">{t('selectCountry')}</option>
                    {COUNTRY_CODES.map(code => (
                      <option key={code} value={code}>
                        {t(`countries.${code}`)} ({code})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 font-medium">
                    {t('countryHint')}
                  </p>
                </div>
                <Button
                  onClick={guardarCountryCode}
                  disabled={savingCountry || !countryCode}
                  className="w-full sm:w-auto"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {savingCountry ? t('saving') : t('saveCountry')}
                </Button>
              </>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>{t('planProInfo')}</strong>
                </p>
                {countryCode && (
                  <p className="text-xs text-blue-700 mt-2">
                    {t('countryConfigured', { name: t(`countries.${countryCode}`) || countryCode })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

        {/* Información importante */}
        <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 font-bold">
              <Info className="h-5 w-5 mr-2" />
              ℹ️ {t('infoTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
          <div className="text-sm text-gray-600">
            <p><strong>{t('infoHowToTitle')}</strong></p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>{t('infoStep1')} <a href="https://hospedajes.ses.mir.es" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">hospedajes.ses.mir.es</a></li>
              <li>{t('infoStep2')}</li>
              <li>{t('infoStep3')}</li>
              <li>{t('infoStep4')}</li>
            </ol>
          </div>
          
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
            <p className="text-sm text-orange-600">
              <strong>{t('infoWarning')}</strong>
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
            {loading ? `⏳ ${t('saving')}` : `💾 ${t('saveConfig')}`}
          </Button>
          
          <Button 
            onClick={probarConexion} 
            disabled={loading || !status.hasRequired}
            variant="outline"
            className="flex-1 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <TestTube className="h-5 w-5 mr-2" />
            {loading ? `⏳ ${t('testing')}` : `🧪 ${t('testConnection')}`}
          </Button>
          
          <Button 
            onClick={() => window.open('/admin/mir-comunicaciones', '_blank')}
            variant="outline"
            className="flex-1 border-2 border-green-600 text-green-600 hover:bg-green-50 font-semibold px-8 py-4 rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            🌐 {t('goToPanel')}
          </Button>
        </div>

        {/* Resultado de la prueba */}
        {testResult && (
          <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-xl transition-all duration-500 hover:shadow-2xl hover:scale-[1.02]">
            <CardHeader>
                <CardTitle className="text-gray-900 font-bold flex items-center">
                📋 {t('testResultTitle')}
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

    </div>
  );
}