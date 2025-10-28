'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
}

export default function MirComunicacionesPage() {
  const [comunicaciones, setComunicaciones] = useState<Comunicacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para consulta
  const [codigosConsulta, setCodigosConsulta] = useState('');
  const [resultadosConsulta, setResultadosConsulta] = useState<ConsultaResult[]>([]);
  
  // Estados para anulación
  const [loteAnulacion, setLoteAnulacion] = useState('');
  const [referenciaAnulacion, setReferenciaAnulacion] = useState('');
  
  // Estados para catálogo
  const [catalogoConsulta, setCatalogoConsulta] = useState('');
  const [resultadosCatalogo, setResultadosCatalogo] = useState<Array<{codigo: string; descripcion: string}>>([]);
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
        setSuccess(`Consulta realizada correctamente. Encontrados ${data.estadisticas.total} registros (${data.estadisticas.pendientes} pendientes, ${data.estadisticas.enviados} enviados, ${data.estadisticas.confirmados} confirmados, ${data.estadisticas.errores} errores)`);
      } else {
        setError(data.message || 'Error cargando registros');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error cargando registros:', err);
    } finally {
      setLoading(false);
    }
  };


  const consultarComunicaciones = async () => {
    if (!codigosConsulta.trim()) {
      setError('Debe proporcionar al menos un código de comunicación');
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
        setSuccess(`✅ Consulta completada. Encontrados ${data.resultados.length} resultados`);
      } else {
        // Si no se encuentran resultados, crear resultados de error para cada código
        const resultadosError = codigos.map(codigo => ({
          codigo: codigo,
          tipo: 'N/A',
          estado: 'no_encontrado',
          referencia: codigo,
          fechaAlta: 'N/A',
          nombreReserva: 'No encontrado',
          interpretacion: {
            tipoDescripcion: 'Comunicación no encontrada',
            estadoDescripcion: 'No existe en el sistema'
          },
          detalles: {
            establecimiento: 'N/A',
            fechaEntrada: 'N/A',
            fechaSalida: 'N/A',
            numPersonas: 0
          }
        }));
        setResultadosConsulta(resultadosError);
        setSuccess(`⚠️ Consulta completada. ${codigos.length} códigos procesados (no encontrados)`);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error consultando:', err);
    } finally {
      setLoading(false);
    }
  };

  const anularLote = async () => {
    if (!loteAnulacion.trim()) {
      setError('Debe proporcionar el código de lote');
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
        setError(`❌ ${data.message || 'Error en la anulación'}`);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error anulando:', err);
    } finally {
      setLoading(false);
    }
  };

  const consultarCatalogo = async () => {
    if (!catalogoConsulta.trim()) {
      setError('Debe proporcionar el nombre del catálogo');
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
        setSuccess(`✅ Catálogo '${data.catalogo.nombre}' consultado correctamente. Encontrados ${data.catalogo.totalElementos} elementos`);
      } else {
        setError(`❌ ${data.error || 'Error en la consulta de catálogo'}`);
        setResultadoCatalogoCompleto(null);
      }
    } catch (err) {
      setError('Error de conexión');
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
        {estado.toUpperCase()}
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
                  <h1 className="text-2xl font-bold text-gray-900">Estado Envíos MIR</h1>
                  <p className="text-sm text-gray-600">Gestión de comunicaciones con el Ministerio del Interior</p>
                  <p className="text-xs text-gray-500">Envío, consulta y anulación de comunicaciones oficiales</p>
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
                        setSuccess(`✅ Consulta en tiempo real completada - ${result.lotesConsultados} lotes consultados, ${result.actualizados} actualizados según MIR oficial`);
                        
                        // Recargar datos después de la actualización
                        setTimeout(() => {
                          cargarComunicaciones();
                        }, 1000);
                      } else {
                        setError(`❌ Error: ${result.message || result.error || 'Error desconocido'}`);
                      }
                    } catch (error) {
                      console.error('❌ Error en consulta tiempo real:', error);
                      setError(`❌ Error consultando MIR: ${error instanceof Error ? error.message : 'Error de conexión'}`);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading} 
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 shadow-lg"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Consulta Tiempo Real MIR
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
          <TabsTrigger value="comunicaciones" className="text-gray-800 font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">Comunicaciones</TabsTrigger>
          <TabsTrigger value="consulta" className="text-gray-800 font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">Consulta</TabsTrigger>
          <TabsTrigger value="catalogo" className="text-gray-800 font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">Catálogos</TabsTrigger>
          <TabsTrigger value="anulacion" className="text-gray-800 font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">Anulación</TabsTrigger>
        </TabsList>

        <TabsContent value="comunicaciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900 font-bold text-xl">Comunicaciones Enviadas</CardTitle>
              <CardDescription className="text-gray-700 font-medium">
                Lista de todas las comunicaciones enviadas al MIR
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Cargando comunicaciones...
                </div>
              ) : comunicaciones.length === 0 ? (
                <div className="text-center p-8 text-gray-600 font-semibold">
                  No hay comunicaciones registradas
                </div>
              ) : (
                <div className="space-y-4">
                  {comunicaciones.map((registro) => {
                    // Los datos vienen del nuevo endpoint estado-envios
                    const nombreCompleto = registro.nombreCompleto || 'Datos no disponibles';
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
                                <span>🏨 Habitación: <strong>{habitacion}</strong></span>
                                <span>📋 Tipo: <strong>{registro.tipo || 'PV'}</strong></span>
                                <span>🆔 Ref: <strong>{registro.referencia}</strong></span>
                              </div>
                              <div className="mt-1 text-sm text-blue-600">
                                📦 Lote: <strong>{registro.lote || 'Sin lote asignado'}</strong>
                              </div>
                              <div className="mt-1">
                                📅 Registrado: <strong>{new Date(registro.timestamp).toLocaleString('es-ES')}</strong>
                                {registro.fechaEnvio && <span className="ml-4">📤 Enviado: <strong>{new Date(registro.fechaEnvio).toLocaleString('es-ES')}</strong></span>}
                              </div>
                              {registro.error && (
                                <div className="text-red-600 font-semibold mt-2">❌ Error: {registro.error}</div>
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
                                    alert(`Estado: ${estado}\nLote: ${registro.lote || 'N/A'}\nReferencia: ${registro.referencia}`);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Ver Estado
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
                                        alert(`✅ Consulta en tiempo real completada\n\nLotes consultados: ${result.lotesConsultados}\nActualizados: ${result.actualizados}\n\nEstado actualizado según MIR oficial`);
                                        cargarComunicaciones();
                                      } else {
                                        alert(`❌ Error: ${result.message || result.error}`);
                                      }
                                    } catch (error) {
                                      alert('❌ Error consultando MIR en tiempo real');
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                >
                                  <RefreshCw className="h-4 w-4 mr-1" />
                                  Consulta Tiempo Real MIR
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
                                          personas: registro.datos?.comunicaciones?.[0]?.personas || []
                                        })
                                      });
                                      
                                      const result = await response.json();
                                      if (result.success) {
                                        alert('✅ Registro enviado al MIR correctamente');
                                        cargarComunicaciones(); // Recargar lista
                                      } else {
                                        alert(`❌ Error: ${result.message}`);
                                      }
                                    } catch (error) {
                                      alert('❌ Error enviando al MIR');
                                    }
                                  }}
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  Enviar al MIR
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                                  onClick={() => {
                                    alert(`Registro: ${registro.referencia}\nEstado: ${estado}\nID: ${registro.id}`);
                                  }}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Info
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
                                          alert('No hay XML disponible para descargar');
                                        }
                                      } else {
                                        alert('Error obteniendo el XML');
                                      }
                                    } catch (error) {
                                      alert('Error descargando XML');
                                    }
                                  }}
                                >
                                  <Download className="h-4 w-4 mr-1" />
                                  XML
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
              <CardTitle className="text-gray-900 font-bold text-xl">Consultar Comunicaciones</CardTitle>
              <CardDescription className="text-gray-700 font-medium">
                Consulta el estado de comunicaciones específicas en el MIR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigos" className="text-gray-800 font-semibold">Códigos de Comunicación</Label>
                <Input
                  id="codigos"
                  placeholder="REF-e95a19f7-b576-4378-953a-95784fd33ce3-1761250365, REF-11bb82f6-8c65-4bc1..."
                  value={codigosConsulta}
                  onChange={(e) => setCodigosConsulta(e.target.value)}
                  className="font-semibold text-gray-800"
                />
                <p className="text-sm text-gray-600 font-medium">
                  Separa múltiples códigos con comas
                </p>
              </div>
              
              <Button onClick={consultarComunicaciones} disabled={loading || !codigosConsulta.trim()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Consultando...' : 'Consultar'}
              </Button>

              {resultadosConsulta.length > 0 && (
                <div className="space-y-4 mt-4">
                  <h4 className="font-bold text-xl text-gray-900">Resultados de la Consulta</h4>
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
                        {resultado.nombreReserva && resultado.nombreReserva !== 'No encontrado' && (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">👤 Huésped:</span>
                            <span className="text-gray-700 font-semibold">{resultado.nombreReserva}</span>
                          </div>
                        )}
                        <div className="text-sm text-gray-800 space-y-2 bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">Tipo:</span>
                            <span className="text-gray-700">{resultado.interpretacion.tipoDescripcion}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">Estado:</span>
                            <span className="text-gray-700">{resultado.interpretacion.estadoDescripcion}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">Referencia:</span>
                            <span className="text-gray-700 font-mono text-xs">{resultado.referencia}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">Fecha Alta:</span>
                            <span className="text-gray-700">{new Date(resultado.fechaAlta).toLocaleString('es-ES')}</span>
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
              <CardTitle className="text-gray-900 font-bold text-xl">Consultar Catálogos MIR</CardTitle>
              <CardDescription className="text-gray-700 font-medium">
                Consulta las tablas maestras del MIR (tipos de documento, tipos de pago, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="catalogo" className="text-gray-800 font-semibold">Nombre del Catálogo</Label>
                <Input
                  id="catalogo"
                  placeholder="TIPOS_DOCUMENTO, TIPOS_PAGO, PAISES, etc."
                  value={catalogoConsulta}
                  onChange={(e) => setCatalogoConsulta(e.target.value)}
                  className="font-semibold text-gray-800"
                />
                <p className="text-sm text-gray-600 font-medium">
                  Catálogos disponibles: TIPOS_DOCUMENTO, TIPOS_PAGO, PAISES, MUNICIPIOS, TIPOS_ESTABLECIMIENTO, ROLES_PERSONA
                </p>
              </div>
              
              <Button onClick={consultarCatalogo} disabled={loading || !catalogoConsulta.trim()} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Consultando...' : 'Consultar Catálogo'}
              </Button>

              {/* Resultado completo del catálogo */}
              {resultadoCatalogoCompleto && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-gray-900 font-bold text-lg">Resultado de la Consulta</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Información del catálogo */}
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-blue-800">
                            ✅ Conexión Exitosa
                          </p>
                          <p className="text-sm text-blue-700">
                            Catálogo '{resultadoCatalogoCompleto.catalogo?.nombre}' consultado correctamente. 
                            Encontrados {resultadoCatalogoCompleto.catalogo?.totalElementos} elementos
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
                        <h4 className="font-medium text-gray-900">Elementos del Catálogo ({resultadosCatalogo.length})</h4>
                        <div className="grid gap-2 max-h-96 overflow-y-auto">
                          {resultadosCatalogo.map((elemento, index) => (
                            <Card key={index} className="p-3 border border-gray-200">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900">{elemento.codigo}</span>
                                    {elemento.activo !== false && (
                                      <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                        Activo
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{elemento.descripcion}</p>
                                  {elemento.provincia && (
                                    <p className="text-xs text-gray-500 mt-1">Provincia: {elemento.provincia}</p>
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
                        📋 Ver detalles técnicos (JSON)
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
              <CardTitle className="text-gray-900 font-bold text-xl">Anular Lote</CardTitle>
              <CardDescription className="text-gray-700 font-medium">
                Anula un lote completo de comunicaciones en el MIR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-800 font-semibold">
                  ⚠️ Esta acción anulará permanentemente el lote en el MIR. Esta operación no se puede deshacer.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="lote" className="text-gray-800 font-semibold">Código de Lote</Label>
                <Input
                  id="lote"
                  placeholder="Código del lote a anular"
                  value={loteAnulacion}
                  onChange={(e) => setLoteAnulacion(e.target.value)}
                  className="font-semibold text-gray-800"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="referencia" className="text-gray-800 font-semibold">Referencia (Opcional)</Label>
                <Input
                  id="referencia"
                  placeholder="Referencia para actualizar en BD"
                  value={referenciaAnulacion}
                  onChange={(e) => setReferenciaAnulacion(e.target.value)}
                  className="font-semibold text-gray-800"
                />
                <p className="text-sm text-gray-600 font-medium">
                  Si se proporciona, se actualizará el estado en la base de datos local
                </p>
              </div>
              
              <Button 
                onClick={anularLote} 
                disabled={loading || !loteAnulacion.trim()} 
                variant="destructive"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                <X className="h-4 w-4 mr-2" />
                {loading ? 'Anulando...' : 'Anular Lote'}
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
