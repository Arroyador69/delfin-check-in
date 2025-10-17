'use client';

import { useState, useEffect } from 'react';
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
        setSuccess(`✅ ${data.interpretacion.mensaje}`);
      } else {
        setError(`❌ ${data.message || 'Error en la consulta de catálogo'}`);
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión MIR - Comunicaciones</h1>
          <p className="text-muted-foreground">
            Panel de administración para gestionar comunicaciones con el Ministerio del Interior
          </p>
        </div>
        <Button onClick={cargarComunicaciones} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="comunicaciones" className="space-y-4">
        <TabsList>
          <TabsTrigger value="comunicaciones">Comunicaciones</TabsTrigger>
          <TabsTrigger value="envio">Envío de Prueba</TabsTrigger>
          <TabsTrigger value="consulta">Consulta</TabsTrigger>
          <TabsTrigger value="catalogo">Catálogos</TabsTrigger>
          <TabsTrigger value="anulacion">Anulación</TabsTrigger>
        </TabsList>

        <TabsContent value="comunicaciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comunicaciones Enviadas</CardTitle>
              <CardDescription>
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
                <div className="text-center p-8 text-muted-foreground">
                  No hay comunicaciones registradas
                </div>
              ) : (
                <div className="space-y-4">
                  {comunicaciones.map((com) => (
                    <Card key={com.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {getEstadoIcon(com.estado)}
                            <span className="font-medium">{com.referencia}</span>
                            {getEstadoBadge(com.estado)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <div>Tipo: {com.tipo} | Lote: {com.lote || 'N/A'}</div>
                            <div>Creado: {new Date(com.created_at).toLocaleString()}</div>
                            {com.error && (
                              <div className="text-red-600">Error: {com.error}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {com.xml_enviado && (
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4 mr-1" />
                              XML
                            </Button>
                          )}
                          {com.xml_respuesta && (
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              Respuesta
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="envio" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Comunicación de Prueba</CardTitle>
              <CardDescription>
                Envía una comunicación de prueba al MIR usando las credenciales oficiales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Esta función enviará una comunicación real al MIR. Asegúrate de que las credenciales estén configuradas correctamente.
                </AlertDescription>
              </Alert>
              
              <Button onClick={enviarPrueba} disabled={loading} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                {loading ? 'Enviando...' : 'Enviar Comunicación de Prueba'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consulta" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consultar Comunicaciones</CardTitle>
              <CardDescription>
                Consulta el estado de comunicaciones específicas en el MIR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codigos">Códigos de Comunicación</Label>
                <Input
                  id="codigos"
                  placeholder="Código1, Código2, Código3..."
                  value={codigosConsulta}
                  onChange={(e) => setCodigosConsulta(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Separa múltiples códigos con comas
                </p>
              </div>
              
              <Button onClick={consultarComunicaciones} disabled={loading || !codigosConsulta.trim()}>
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
              <CardTitle>Consultar Catálogos MIR</CardTitle>
              <CardDescription>
                Consulta las tablas maestras del MIR (tipos de documento, tipos de pago, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="catalogo">Nombre del Catálogo</Label>
                <Input
                  id="catalogo"
                  placeholder="TIPOS_DOCUMENTO, TIPOS_PAGO, PAISES, etc."
                  value={catalogoConsulta}
                  onChange={(e) => setCatalogoConsulta(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Catálogos disponibles: TIPOS_DOCUMENTO, TIPOS_PAGO, PAISES, MUNICIPIOS, TIPOS_VEHICULO, COLORES_VEHICULO, CATEGORIAS_VEHICULO, ROLES_PERSONA
                </p>
              </div>
              
              <Button onClick={consultarCatalogo} disabled={loading || !catalogoConsulta.trim()}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Consultando...' : 'Consultar Catálogo'}
              </Button>

              {resultadosCatalogo.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Resultados del Catálogo</h4>
                  <div className="grid gap-2 max-h-96 overflow-y-auto">
                    {resultadosCatalogo.map((elemento, index) => (
                      <Card key={index} className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{elemento.codigo}</span>
                            <p className="text-sm text-muted-foreground">{elemento.descripcion}</p>
                          </div>
                          <Badge variant="outline">{elemento.codigo}</Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anulacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Anular Lote</CardTitle>
              <CardDescription>
                Anula un lote completo de comunicaciones en el MIR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  ⚠️ Esta acción anulará permanentemente el lote en el MIR. Esta operación no se puede deshacer.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Label htmlFor="lote">Código de Lote</Label>
                <Input
                  id="lote"
                  placeholder="Código del lote a anular"
                  value={loteAnulacion}
                  onChange={(e) => setLoteAnulacion(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="referencia">Referencia (Opcional)</Label>
                <Input
                  id="referencia"
                  placeholder="Referencia para actualizar en BD"
                  value={referenciaAnulacion}
                  onChange={(e) => setReferenciaAnulacion(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Si se proporciona, se actualizará el estado en la base de datos local
                </p>
              </div>
              
              <Button 
                onClick={anularLote} 
                disabled={loading || !loteAnulacion.trim()} 
                variant="destructive"
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                {loading ? 'Anulando...' : 'Anular Lote'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
