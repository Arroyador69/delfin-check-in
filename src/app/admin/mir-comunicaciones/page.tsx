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
      const response = await fetch('/api/ministerio/comunicaciones');
      const data = await response.json();
      
      if (data.success) {
        setComunicaciones(data.comunicaciones || []);
      } else {
        setError(data.message || 'Error cargando comunicaciones');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error cargando comunicaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  const enviarPrueba = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/api/ministerio/envio-oficial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Juan',
          apellido1: 'Pérez',
          apellido2: 'García',
          tipoDocumento: 'NIF',
          numeroDocumento: '12345678Z',
          fechaNacimiento: '1985-01-01',
          nacionalidad: 'ESP',
          sexo: 'M',
          direccion: 'Calle Ejemplo 123',
          codigoPostal: '28001',
          pais: 'ESP',
          codigoMunicipio: '28079',
          nombreMunicipio: 'Madrid',
          telefono: '600000000',
          correo: 'juan.perez@example.com',
          fechaEntrada: new Date().toISOString().replace(/\.\d{3}Z$/, ''),
          fechaSalida: new Date(Date.now() + 24*60*60*1000).toISOString().replace(/\.\d{3}Z$/, ''),
          tipoPago: 'EFECT'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess(`✅ ${data.interpretacion.mensaje}`);
        cargarComunicaciones(); // Recargar lista
      } else {
        setError(`❌ ${data.message || 'Error en el envío'}`);
      }
    } catch (err) {
      setError('Error de conexión');
      console.error('Error enviando prueba:', err);
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
      
      const response = await fetch('/api/ministerio/consulta-oficial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigos })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResultadosConsulta(data.comunicaciones || []);
        setSuccess(`✅ ${data.interpretacion.mensaje}`);
      } else {
        setError(`❌ ${data.message || 'Error en la consulta'}`);
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
      const response = await fetch('/api/ministerio/catalogo-oficial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalogo: catalogoConsulta.trim() })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResultadosCatalogo(data.catalogo.elementos || []);
        setResultadoCatalogoCompleto(data);
        setSuccess(`✅ ${data.interpretacion.mensaje}`);
      } else {
        setError(`❌ ${data.message || 'Error en la consulta de catálogo'}`);
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
      case 'enviado': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'anulado': return <X className="h-4 w-4 text-gray-500" />;
      case 'pendiente': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'enviado': 'default',
      'error': 'destructive',
      'anulado': 'secondary',
      'pendiente': 'outline'
    };
    
    return (
      <Badge variant={variants[estado] || 'outline'}>
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
                  onClick={cargarComunicaciones} 
                  disabled={loading} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 shadow-lg"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
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
          <TabsTrigger value="envio" className="text-gray-800 font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white">Envío de Prueba</TabsTrigger>
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
                  {comunicaciones.map((com) => {
                    // Extraer datos del huésped desde el XML enviado
                    const xmlData = com.xml_enviado ? JSON.parse(com.xml_enviado) : null;
                    const nombreCompleto = xmlData?.personas?.[0] ? 
                      `${xmlData.personas[0].nombre} ${xmlData.personas[0].apellido1} ${xmlData.personas[0].apellido2 || ''}`.trim() : 
                      'Datos no disponibles';
                    const habitacion = xmlData?.habitacion || 'N/A';
                    
                    return (
                      <Card key={com.id} className="p-4 bg-blue-50 border-blue-200">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {getEstadoIcon(com.estado)}
                              <span className="font-bold text-gray-900 text-lg">{nombreCompleto}</span>
                              {getEstadoBadge(com.estado)}
                            </div>
                            <div className="text-sm text-gray-700 font-medium">
                              <div className="flex items-center gap-4">
                                <span>🏨 Habitación: <strong>{habitacion}</strong></span>
                                <span>📋 Tipo: <strong>{com.tipo}</strong></span>
                                <span>🆔 Ref: <strong>{com.referencia}</strong></span>
                              </div>
                              <div className="mt-1">
                                📅 Creado: <strong>{new Date(com.created_at).toLocaleString('es-ES')}</strong>
                                {com.lote && <span className="ml-4">📦 Lote: <strong>{com.lote}</strong></span>}
                              </div>
                              {com.error && (
                                <div className="text-red-600 font-semibold mt-2">❌ Error: {com.error}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {com.xml_enviado && (
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                                <Download className="h-4 w-4 mr-1" />
                                XML
                              </Button>
                            )}
                            {com.xml_respuesta && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-semibold">
                                <Eye className="h-4 w-4 mr-1" />
                                Respuesta
                              </Button>
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

        <TabsContent value="envio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900 font-bold text-xl">Enviar Comunicación de Prueba</CardTitle>
              <CardDescription className="text-gray-700 font-medium">
                Envía una comunicación de prueba al MIR usando las credenciales oficiales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-gray-800 font-semibold">
                  Esta función enviará una comunicación real al MIR. Asegúrate de que las credenciales estén configuradas correctamente.
                </AlertDescription>
              </Alert>
              
              <Button onClick={enviarPrueba} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Enviando...' : 'Enviar Comunicación de Prueba'}
              </Button>
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
                  placeholder="Código1, Código2, Código3..."
                  value={codigosConsulta}
                  onChange={(e) => setCodigosConsulta(e.target.value)}
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
                <div className="space-y-2">
                  <h4 className="font-medium">Resultados de la Consulta</h4>
                  {resultadosConsulta.map((resultado, index) => (
                    <Card key={index} className="p-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{resultado.codigo}</span>
                          <Badge variant="outline">{resultado.tipo}</Badge>
                          <Badge variant={resultado.estado === 'ACTIVA' ? 'default' : 'secondary'}>
                            {resultado.estado}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div>{resultado.interpretacion.tipoDescripcion}</div>
                          <div>{resultado.interpretacion.estadoDescripcion}</div>
                          <div>Referencia: {resultado.referencia}</div>
                          <div>Fecha Alta: {new Date(resultado.fechaAlta).toLocaleString()}</div>
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
                />
                <p className="text-sm text-gray-600 font-medium">
                  Catálogos disponibles: TIPOS_DOCUMENTO, TIPOS_PAGO, PAISES, MUNICIPIOS, TIPOS_VEHICULO, COLORES_VEHICULO, CATEGORIAS_VEHICULO, ROLES_PERSONA
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
                    {/* Mensaje claro de éxito/error */}
                    <div className={`p-4 rounded-lg border ${
                      resultadoCatalogoCompleto.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <div className="flex items-center space-x-2">
                        {resultadoCatalogoCompleto.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <div>
                          <p className={`font-semibold ${
                            resultadoCatalogoCompleto.success ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {resultadoCatalogoCompleto.success ? '✅ Conexión Exitosa' : '❌ Error en la Conexión'}
                          </p>
                          <p className={`text-sm ${
                            resultadoCatalogoCompleto.success ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {resultadoCatalogoCompleto.interpretacion?.mensaje || resultadoCatalogoCompleto.message}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Elementos del catálogo si los hay */}
                    {resultadosCatalogo.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-900">Elementos del Catálogo ({resultadosCatalogo.length})</h4>
                        <div className="grid gap-2 max-h-96 overflow-y-auto">
                          {resultadosCatalogo.map((elemento, index) => (
                            <Card key={index} className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-medium text-gray-900">{elemento.codigo}</span>
                                  <p className="text-sm text-gray-600">{elemento.descripcion}</p>
                                </div>
                                <Badge variant="outline">{elemento.codigo}</Badge>
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
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="referencia" className="text-gray-800 font-semibold">Referencia (Opcional)</Label>
                <Input
                  id="referencia"
                  placeholder="Referencia para actualizar en BD"
                  value={referenciaAnulacion}
                  onChange={(e) => setReferenciaAnulacion(e.target.value)}
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
