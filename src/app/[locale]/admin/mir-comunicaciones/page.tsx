'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTenant, hasLegalModule } from '@/hooks/useTenant';
import { 
  Send, 
  Search, 
  X, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Eye,
  Download
} from 'lucide-react';

interface Comunicacion {
  id: number;
  referencia: string;
  tipo: string;
  estado: string;
  lote?: string;
  resultado?: string;
  error?: string;
  xml_enviado?: string;
  xml_respuesta?: string;
  created_at: string;
  updated_at?: string;
  /** Campos del listado agregado (estado-envíos / huéspedes) */
  nombreCompleto?: string;
  timestamp?: string | number | Date;
  fechaEnvio?: string | number | Date;
  fecha_entrada?: string;
  fecha_salida?: string;
  datos?: unknown;
}

interface ConsultaResult {
  codigo: string;
  tipo: string;
  estado: string;
  fechaAlta: string;
  referencia: string;
  interpretacion: {
    tipoDescripcion: string;
    estadoDescripcion: string;
  };
  nombreReserva?: string;
  detalles?: {
    establecimiento?: string;
    fechaEntrada?: string;
    fechaSalida?: string;
    numPersonas?: number;
  };
}

type CatalogoListItem = {
  codigo: string;
  descripcion: string;
  activo?: boolean;
  provincia?: string;
};

export default function MirComunicacionesPage() {
  const t = useTranslations('mirComunicaciones');
  const locale = useLocale();
  const { tenant, loading: tenantLoading } = useTenant();
  const router = useRouter();
  const [comunicaciones, setComunicaciones] = useState<Comunicacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Verificar acceso al módulo legal (excepto superadmins)
  useEffect(() => {
    if (!tenantLoading && tenant) {
      // Verificar si es superadmin - SI ES SUPERADMIN, PERMITIR ACCESO COMPLETO
      fetch('/api/auth/me')
        .then(res => res.json())
        .then(data => {
          const isSuperAdmin = data.success && data.data?.isPlatformAdmin;
          // Superadmins SIEMPRE tienen acceso, sin importar el plan
          if (isSuperAdmin) {
            console.log('👑 SuperAdmin: Acceso completo al módulo legal concedido');
            return; // No hacer nada, permitir acceso
          }
          // Solo para usuarios normales, verificar legal_module
          if (!hasLegalModule(tenant)) {
            router.push('/upgrade-plan?reason=legal_module');
          }
        })
        .catch(() => {
          // Si falla la verificación, verificar si es superadmin de otra forma
          // Por seguridad, si no podemos verificar, permitir acceso si tiene legal_module
          if (!hasLegalModule(tenant)) {
            // Solo bloquear si definitivamente no tiene legal_module
            router.push('/upgrade-plan?reason=legal_module');
          }
        });
    }
  }, [tenant, tenantLoading, router]);
  
  // Estados para consulta
  const [codigosConsulta, setCodigosConsulta] = useState('');
  const [resultadosConsulta, setResultadosConsulta] = useState<ConsultaResult[]>([]);
  
  // Estados para anulación
  const [loteAnulacion, setLoteAnulacion] = useState('');
  const [referenciaAnulacion, setReferenciaAnulacion] = useState('');
  
  // Estados para catálogo
  const [catalogoConsulta, setCatalogoConsulta] = useState('');
  const [resultadosCatalogo, setResultadosCatalogo] = useState<CatalogoListItem[]>([]);
  const [resultadoCatalogoCompleto, setResultadoCatalogoCompleto] = useState<any>(null);

  // Cargar comunicaciones al montar el componente
  useEffect(() => {
    cargarComunicaciones();
  }, []);

  const cargarComunicaciones = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ministerio/estado-envios');
      const data = await response.json();
      
      if (data.success) {
        // Convertir datos del nuevo formato al formato esperado
        const todosRegistros = [
          ...data.comunicaciones.pendientes,
          ...data.comunicaciones.enviados,
          ...data.comunicaciones.confirmados,
          ...data.comunicaciones.errores
        ];
        
        setComunicaciones(todosRegistros);
        setSuccess(t('successLoad', {
          total: data.estadisticas.total,
          pendientes: data.estadisticas.pendientes,
          enviados: data.estadisticas.enviados,
          confirmados: data.estadisticas.confirmados,
          errores: data.estadisticas.errores
        }));
      } else {
        setError(data.message || t('errorLoad'));
      }
    } catch (err) {
      setError(t('errorConexion'));
      console.error('Error cargando registros:', err);
    } finally {
      setLoading(false);
    }
  };


  const consultarComunicaciones = async () => {
    if (!codigosConsulta.trim()) {
      setError(t('errorCodigoRequerido'));
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const codigos = codigosConsulta.split(',').map(c => c.trim()).filter(c => c);
      
      // Consultar todos los códigos de una vez usando el endpoint correcto
      const response = await fetch('/api/ministerio/consulta-oficial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigos: codigos })
      });
      
      const data = await response.json();
      
      if (data.success && data.resultados && data.resultados.length > 0) {
        setResultadosConsulta(data.resultados);
        setSuccess(`✅ ${t('successConsultaCount', { count: data.resultados.length })}`);
      } else {
        // Si no se encuentran resultados, crear resultados de error para cada código
        const resultadosError = codigos.map(codigo => ({
          codigo: codigo,
          tipo: 'N/A',
          estado: 'no_encontrado',
          referencia: codigo,
          fechaAlta: 'N/A',
          nombreReserva: t('noEncontrado'),
          interpretacion: {
            tipoDescripcion: t('comunicacionNoEncontrada'),
            estadoDescripcion: t('noExisteEnSistema')
          },
          detalles: {
            establecimiento: 'N/A',
            fechaEntrada: 'N/A',
            fechaSalida: 'N/A',
            numPersonas: 0
          }
        }));
        setResultadosConsulta(resultadosError);
        setSuccess(`⚠️ ${t('successConsultaNotFound', { count: codigos.length })}`);
      }
    } catch (err) {
      setError(t('errorConexion'));
      console.error('Error consultando:', err);
    } finally {
      setLoading(false);
    }
  };

  const anularLote = async () => {
    if (!loteAnulacion.trim()) {
      setError(t('errorLoteRequerido'));
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/ministerio/anulacion-oficial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lote: loteAnulacion.trim(),
          referencia: referenciaAnulacion.trim() || undefined
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ ${data.interpretacion.mensaje}`);
        cargarComunicaciones(); // Recargar lista
        setLoteAnulacion('');
        setReferenciaAnulacion('');
      } else {
        setError(`❌ ${data.message || t('errorAnulacion')}`);
      }
    } catch (err) {
      setError(t('errorConexion'));
      console.error('Error anulando:', err);
    } finally {
      setLoading(false);
    }
  };

  const consultarCatalogo = async () => {
    if (!catalogoConsulta.trim()) {
      setError(t('errorCatalogoRequerido'));
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/ministerio/catalogo-completo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombreCatalogo: catalogoConsulta.trim() })
      });
      
      const data = await response.json();
      
      if (data.ok) {
        setResultadosCatalogo(data.catalogo.elementos || []);
        setResultadoCatalogoCompleto(data);
        setSuccess(`✅ ${t('successCatalogo', { name: data.catalogo.nombre, count: data.catalogo.totalElementos })}`);
      } else {
        setError(`❌ ${data.error || t('errorCatalogo')}`);
        setResultadoCatalogoCompleto(null);
      }
    } catch (err) {
      setError(t('errorConexion'));
      console.error('Error consultando catálogo:', err);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'confirmado': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'enviado': return <Send className="h-4 w-4 text-blue-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'anulado': return <X className="h-4 w-4 text-gray-500" />;
      case 'pendiente': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  };

  const getEstadoLabel = (estado: string) => {
    const key = estado === 'confirmado' ? 'statusConfirmado' : estado === 'enviado' ? 'statusEnviado' : estado === 'error' ? 'statusError' : estado === 'anulado' ? 'statusAnulado' : 'statusPendiente';
    return t(key);
  };

  const getEstadoBadge = (estado: string) => {
    const getEstadoConfig = (estado: string) => {
      switch (estado) {
        case 'confirmado':
          return { variant: 'default' as const, className: 'font-bold text-white bg-green-600 border-green-600' };
        case 'enviado':
          return { variant: 'default' as const, className: 'font-bold text-white bg-blue-600 border-blue-600' };
        case 'error':
          return { variant: 'destructive' as const, className: 'font-bold text-white bg-red-600 border-red-600' };
        case 'pendiente':
          return { variant: 'outline' as const, className: 'font-bold text-yellow-800 bg-yellow-100 border-yellow-300' };
        default:
          return { variant: 'outline' as const, className: 'font-bold text-gray-800 bg-gray-100 border-gray-300' };
      }
    };
    
    const config = getEstadoConfig(estado);
    
    return (
      <Badge 
        variant={config.variant}
        className={config.className}
      >
        {getEstadoLabel(estado)}
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <div className="text-3xl mr-3">🏛️</div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                    {tenant?.country_code && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full border border-blue-200">
                        🌍 {t('countries.' + tenant.country_code as any) || tenant.country_code}
                      </span>
                    )}
                    {tenant?.plan_type === 'pro' && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full border border-purple-200">
                        ⭐ PRO - {t('proBadge')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{t('subtitle')}</p>
                  <p className="text-xs text-gray-500">{t('subtitleDetail')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={async () => {
                    try {
                      setLoading(true);
                      setError(null);
                      setSuccess(null);
                      
                      console.log('🔄 Iniciando consulta en tiempo real con MIR...');
                      
                      // Primero probar la conectividad directa
                      const testResponse = await fetch('/api/ministerio/test-mir-direct', {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                      });
                      
                      const testResult = await testResponse.json();
                      console.log('📊 Test de conectividad MIR:', testResult);
                      
                      if (!testResult.success) {
                        throw new Error(`Error de conectividad: ${testResult.message || testResult.error}`);
                      }
                      
                      // Ahora hacer la consulta en tiempo real
                      const response = await fetch('/api/ministerio/consulta-tiempo-real-mir', {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json',
                          'Cache-Control': 'no-cache'
                        }
                      });
                      
                      if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                      }
                      
                      const result = await response.json();
                      
                      if (result.success) {
                        setSuccess(`✅ ${t('successTiempoReal', { lotes: result.lotesConsultados, actualizados: result.actualizados })}`);
                        
                        // Recargar datos después de la actualización
                        setTimeout(() => {
                          cargarComunicaciones();
                        }, 1000);
                      } else {
                        setError(`❌ Error: ${result.message || result.error || 'Error desconocido'}`);
                      }
                    } catch (error) {
                      console.error('❌ Error en consulta tiempo real:', error);
                      setError(`❌ ${t('errorConsultandoMir')}: ${error instanceof Error ? error.message : t('errorConexion')}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading} 
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 shadow-lg"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {t('consultaTiempoReal')}
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

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

      <Tabs defaultValue="comunicaciones" className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="comunicaciones" className="text-gray-800 font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">{t('tabComunicaciones')}</TabsTrigger>
          <TabsTrigger value="consulta" className="text-gray-800 font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">{t('tabConsulta')}</TabsTrigger>
          <TabsTrigger value="catalogo" className="text-gray-800 font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">{t('tabCatalogo')}</TabsTrigger>
          <TabsTrigger value="anulacion" className="text-gray-800 font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">{t('tabAnulacion')}</TabsTrigger>
        </TabsList>

        <TabsContent value="comunicaciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900 font-bold text-xl">{t('comunicacionesTitle')}</CardTitle>
              <CardDescription className="text-gray-700 font-medium">
                {t('comunicacionesDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  {t('loading')}
                </div>
              ) : comunicaciones.length === 0 ? (
                <div className="text-center p-8 text-gray-600 font-semibold">
                  {t('noComunicaciones')}
                </div>
              ) : (
                <div className="space-y-4">
                  {comunicaciones.map((registro) => {
                    // Los datos vienen del nuevo endpoint estado-envios
                    const nombreCompleto = registro.nombreCompleto || t('datosNoDisponibles');
                    const habitacion = 'N/A'; // Se puede extraer de registro.datos si es necesario
                    const yaEnviado = registro.estado !== 'pendiente';
                    const estado = registro.estado;
                    
                    return (
                      <Card key={registro.id} className="p-4 bg-blue-50 border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            {/* Nombre del huésped al lado del tick verde */}
                            <div className="flex items-center gap-2">
                              {getEstadoIcon(estado)}
                              <span className="font-bold text-gray-900 text-lg">{nombreCompleto}</span>
                              {getEstadoBadge(estado)}
                            </div>
                            
                            {/* Información del registro organizada */}
                            <div className="text-sm text-gray-700 font-medium">
                              <div className="flex items-center gap-4">
                                <span>🏨 {t('habitacion')} <strong>{habitacion}</strong></span>
                                <span>📋 {t('tipo')} <strong>{registro.tipo || 'PV'}</strong></span>
                                <span>🆔 {t('ref')} <strong>{registro.referencia}</strong></span>
                              </div>
                              <div className="mt-1 text-sm text-blue-600">
                                📦 {t('lote')} <strong>{registro.lote || t('sinLote')}</strong>
                              </div>
                              <div className="mt-1">
                                📅 {t('registrado')} <strong>{registro.timestamp != null ? new Date(registro.timestamp).toLocaleString(locale) : '—'}</strong>
                                {registro.fechaEnvio != null && <span className="ml-4">📤 {t('enviado')} <strong>{new Date(registro.fechaEnvio).toLocaleString(locale)}</strong></span>}
                              </div>
                              {registro.error && (
                                <div className="text-red-600 font-semibold mt-2">❌ {t('errorLabel')} {registro.error}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {yaEnviado ? (
                              <>
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                                  onClick={() => {
                                    alert(`${t('estadoLabel')} ${estado}\n${t('lote')} ${registro.lote || 'N/A'}\n${t('referencia')} ${registro.referencia}`);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  {t('verEstado')}
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                  onClick={async () => {
                                    try {
                                      setLoading(true);
                                      const response = await fetch('/api/ministerio/consulta-tiempo-real-mir', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' }
                                      });
                                      const result = await response.json();
                                      if (result.success) {
                                        alert(`✅ ${t('successTiempoRealAlert', { lotes: result.lotesConsultados, actualizados: result.actualizados })}`);
                                        cargarComunicaciones();
                                      } else {
                                        alert(`❌ Error: ${result.message || result.error}`);
                                      }
                                    } catch (error) {
                                      alert(`❌ ${t('errorConsultandoMir')}`);
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  {t('consultaTiempoReal')}
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch('/api/ministerio/auto-envio-dual', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          referencia: registro.referencia,
                                          fechaEntrada: registro.fecha_entrada,
                                          fechaSalida: registro.fecha_salida,
                                          personas:
                                            (registro.datos as { comunicaciones?: { personas?: unknown[] }[] } | undefined)
                                              ?.comunicaciones?.[0]?.personas || []
                                        })
                                      });
                                      
                                      const result = await response.json();
                                      if (result.success) {
                                        alert(`✅ ${t('successEnviado')}`);
                                        cargarComunicaciones(); // Recargar lista
                                      } else {
                                        alert(`❌ Error: ${result.message}`);
                                      }
                                    } catch (error) {
                                      alert(`❌ ${t('errorEnviandoMir')}`);
                                    }
                                  }}
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  {t('enviarAlMir')}
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                  onClick={() => {
                                    alert(`${t('referencia')}: ${registro.referencia}\n${t('estadoLabel')}: ${estado}\nID: ${registro.id}`);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  {t('info')}
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                  onClick={async () => {
                                    try {
                                      // Obtener el XML de la base de datos
                                      const response = await fetch(`/api/ministerio/get-xml/${registro.id}`, {
                                        method: 'GET',
                                        headers: { 'Content-Type': 'application/json' }
                                      });
                                      
                                      if (response.ok) {
                                        const result = await response.json();
                                        if (result.xml) {
                                          const blob = new Blob([result.xml], { type: 'application/xml' });
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = `comunicacion_${registro.referencia}.xml`;
                                          document.body.appendChild(a);
                                          a.click();
                                          document.body.removeChild(a);
                                          URL.revokeObjectURL(url);
                                        } else {
                                          alert(t('noXmlDisponible'));
                                        }
                                      } else {
                                        alert(t('errorObteniendoXml'));
                                      }
                                    } catch (error) {
                                      alert(t('errorDescargandoXml'));
                                    }
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  {t('xml')}
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="consulta" className="space-y-4">
          <Card>
<CardHeader>
            <CardTitle className="text-gray-900 font-bold text-xl">{t('consultaTitle')}</CardTitle>
            <CardDescription className="text-gray-700 font-medium">
              {t('consultaDescription')}
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigos" className="text-gray-800 font-semibold">{t('codigosLabel')}</Label>
                <Input
                  id="codigos"
                  placeholder={t('codigosPlaceholder')}
                  value={codigosConsulta}
                  onChange={(e) => setCodigosConsulta(e.target.value)}
                  className="font-semibold text-gray-800"
                />
                <p className="text-sm text-gray-600 font-medium">
                  {t('codigosHint')}
                </p>
              </div>
              
              <Button onClick={consultarComunicaciones} disabled={loading || !codigosConsulta.trim()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                <Search className="h-4 w-4 mr-2" />
                {loading ? t('consultando') : t('consultar')}
              </Button>

              {resultadosConsulta.length > 0 && (
                <div className="space-y-4 mt-4">
                  <h4 className="font-bold text-xl text-gray-900">{t('resultadosTitle')}</h4>
                  {resultadosConsulta.map((resultado, index) => (
                    <Card key={index} className="p-6 border-2 border-green-300 bg-white shadow-lg">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-xl text-gray-900">{resultado.codigo}</span>
                          <Badge variant="outline" className="font-semibold bg-gray-100 text-gray-800">{resultado.tipo}</Badge>
                          <Badge variant="default" className="font-semibold bg-green-600 text-white">
                            {resultado.estado.toUpperCase()}
                          </Badge>
                        </div>
                        {resultado.nombreReserva && resultado.nombreReserva !== t('noEncontrado') && (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">👤 {t('huesped')}</span>
                            <span className="text-gray-700 font-semibold">{resultado.nombreReserva}</span>
                          </div>
                        )}
                        <div className="text-sm text-gray-800 space-y-2 bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{t('tipoLabel')}</span>
                            <span className="text-gray-700">{resultado.interpretacion.tipoDescripcion}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{t('estadoLabel')}</span>
                            <span className="text-gray-700">{resultado.interpretacion.estadoDescripcion}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{t('referencia')}</span>
                            <span className="text-gray-700 font-mono text-xs">{resultado.referencia}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{t('fechaAlta')}</span>
                            <span className="text-gray-700">{new Date(resultado.fechaAlta).toLocaleString(locale)}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalogo" className="space-y-4">
          <Card>
<CardHeader>
            <CardTitle className="text-gray-900 font-bold text-xl">{t('catalogoTitle')}</CardTitle>
            <CardDescription className="text-gray-700 font-medium">
              {t('catalogoDescription')}
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="catalogo" className="text-gray-800 font-semibold">{t('nombreCatalogo')}</Label>
                <Input
                  id="catalogo"
                  placeholder={t('catalogoPlaceholder')}
                  value={catalogoConsulta}
                  onChange={(e) => setCatalogoConsulta(e.target.value)}
                  className="font-semibold text-gray-800"
                />
                <p className="text-sm text-gray-600 font-medium">
                  {t('catalogoHint')}
                </p>
              </div>
              
              <Button onClick={consultarCatalogo} disabled={loading || !catalogoConsulta.trim()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                <Search className="h-4 w-4 mr-2" />
                {loading ? t('consultando') : t('consultarCatalogo')}
              </Button>

              {/* Resultado completo del catálogo */}
              {resultadoCatalogoCompleto && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-gray-900 font-bold text-lg">{t('resultadoConsulta')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Información del catálogo */}
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-blue-800">
                            ✅ {t('conexionExitosa')}
                          </p>
                          <p className="text-sm text-blue-700">
                            {t('catalogoConsultado', { name: resultadoCatalogoCompleto.catalogo?.nombre || '', count: resultadoCatalogoCompleto.catalogo?.totalElementos || 0 })}
                          </p>
                          {resultadoCatalogoCompleto.catalogo?.descripcion && (
                            <p className="text-xs text-blue-600 mt-1">
                              {resultadoCatalogoCompleto.catalogo.descripcion}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Elementos del catálogo si los hay */}
                    {resultadosCatalogo.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">{t('elementosCatalogo', { count: resultadosCatalogo.length })}</h4>
                        <div className="grid gap-2 max-h-96 overflow-y-auto">
                          {resultadosCatalogo.map((elemento, index) => (
                            <Card key={index} className="p-3 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900">{elemento.codigo}</span>
                                    {elemento.activo !== false && (
                                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                        {t('activo')}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{elemento.descripcion}</p>
                                  {elemento.provincia && (
                                    <p className="text-xs text-gray-500 mt-1">{t('provincia')} {elemento.provincia}</p>
                                  )}
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* JSON técnico expandible */}
                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                        📋 {t('verDetallesTecnicos')}
                      </summary>
                      <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                        <pre className="text-xs text-gray-900 font-mono overflow-auto max-h-96">
                          {JSON.stringify(resultadoCatalogoCompleto, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anulacion" className="space-y-4">
          <Card>
<CardHeader>
            <CardTitle className="text-gray-900 font-bold text-xl">{t('anulacionTitle')}</CardTitle>
            <CardDescription className="text-gray-700 font-medium">
              {t('anulacionDescription')}
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-800 font-semibold">
                  ⚠️ {t('anulacionWarning')}
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="lote" className="text-gray-800 font-semibold">{t('codigoLote')}</Label>
                <Input
                  id="lote"
                  placeholder={t('lotePlaceholder')}
                  value={loteAnulacion}
                  onChange={(e) => setLoteAnulacion(e.target.value)}
                  className="font-semibold text-gray-800"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="referencia" className="text-gray-800 font-semibold">{t('referenciaOpcional')}</Label>
                <Input
                  id="referencia"
                  placeholder={t('referenciaPlaceholder')}
                  value={referenciaAnulacion}
                  onChange={(e) => setReferenciaAnulacion(e.target.value)}
                  className="font-semibold text-gray-800"
                />
                <p className="text-sm text-gray-600 font-medium">
                  {t('referenciaHint')}
                </p>
              </div>
              
              <Button 
                onClick={anularLote} 
                disabled={loading || !loteAnulacion.trim()} 
                variant="destructive"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                <X className="h-4 w-4 mr-2" />
                {loading ? t('anulando') : t('anularLote')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </div>
    </AdminLayout>
  );
}
