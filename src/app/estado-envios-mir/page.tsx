'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  XCircle,
  Eye,
  Send,
  Database,
  Activity,
  Bell
} from 'lucide-react';

interface ComunicacionMIR {
  id: string;
  timestamp: string;
  datos: any;
  resultado: any;
  estado: 'pendiente' | 'enviado' | 'confirmado' | 'error';
  lote: string | null;
  error: string | null;
  referencia: string;
  nombreCompleto?: string;
  codigoEstado?: string;
  descEstado?: string;
  codigoComunicacion?: string;
  ultimaConsulta?: string;
  fechaEnvio?: string;
}

interface Estadisticas {
  total: number;
  pendientes: number;
  enviados: number;
  confirmados: number;
  errores: number;
}

interface EstadoEnvio {
  estadisticas: Estadisticas;
  comunicaciones: {
    pendientes: ComunicacionMIR[];
    enviados: ComunicacionMIR[];
    confirmados: ComunicacionMIR[];
    errores: ComunicacionMIR[];
  };
  timestamp: string;
}

export default function EstadoEnviosMIRPage() {
  const [estadoEnvio, setEstadoEnvio] = useState<EstadoEnvio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [consultandoLotes, setConsultandoLotes] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Cargar estado inicial
  useEffect(() => {
    cargarEstadoEnvios();
  }, []);

  // Auto-refresh cada 30 segundos
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      cargarEstadoEnvios(true); // true = actualización silenciosa
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const cargarEstadoEnvios = async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ministerio/estado-envios');
      const data = await response.json();

      if (data.success) {
        setEstadoEnvio(data);
        setUltimaActualizacion(new Date());
        
        if (!silencioso) {
          setSuccess(`Estado actualizado correctamente - ${data.estadisticas.total} comunicaciones encontradas`);
        }
      } else {
        setError(data.message || 'Error cargando estado de envíos');
      }
    } catch (err) {
      setError('Error de conexión al cargar estado de envíos');
      console.error('Error cargando estado:', err);
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  const consultarLotesMIR = async () => {
    setConsultandoLotes(true);
    setError(null);

    try {
      console.log('🔍 Consultando estado real con el MIR...');

      const response = await fetch('/api/ministerio/consultar-estado-real-mir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        // Actualizar el estado local con los nuevos datos
        await cargarEstadoEnvios();
        
        // Log de cambios realizados
        if (data.detalles && data.detalles.length > 0) {
          console.log('📝 Cambios realizados:', data.detalles);
        }

        setSuccess(`Consulta realizada correctamente - ${data.lotesConsultados || 0} lotes consultados, ${data.actualizados || 0} actualizados`);
      } else {
        setError(data.message || 'Error consultando estado MIR');
      }
    } catch (err) {
      setError('Error de conexión al consultar estado MIR');
      console.error('Error consultando estado MIR:', err);
    } finally {
      setConsultandoLotes(false);
    }
  };


  const getEstadoBadge = (estado: string, codigoEstado?: string) => {
    const estadosMIR = {
      '1': { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Confirmado' },
      '4': { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pendiente' },
      '5': { color: 'bg-red-100 text-red-800', icon: XCircle, label: 'Error' },
      '6': { color: 'bg-gray-100 text-gray-800', icon: XCircle, label: 'Anulado' }
    };

    const estadoInfo = estadosMIR[codigoEstado as keyof typeof estadosMIR] || 
                      (estado === 'confirmado' ? estadosMIR['1'] :
                       estado === 'enviado' ? estadosMIR['4'] :
                       estado === 'error' ? estadosMIR['5'] : estadosMIR['4']);

    const Icon = estadoInfo.icon;

    return (
      <Badge className={`${estadoInfo.color} border-0 font-semibold`}>
        <Icon className="w-3 h-3 mr-1" />
        {estadoInfo.label}
      </Badge>
    );
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const renderComunicaciones = (comunicaciones: ComunicacionMIR[], titulo: string) => {
    if (comunicaciones.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">No hay comunicaciones {titulo.toLowerCase()}</p>
          <p className="text-sm">Las nuevas comunicaciones aparecerán aquí automáticamente</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {comunicaciones.map((com) => (
          <Card key={com.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="text-sm font-mono text-gray-600">
                  #{com.id.slice(-8)}
                </div>
                <div className="text-sm text-gray-500">
                  {formatearFecha(com.timestamp)}
                </div>
                {com.referencia && (
                  <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                    Ref: {com.referencia}
                  </div>
                )}
                {com.nombreCompleto && (
                  <div className="text-sm font-medium text-gray-800">
                    👤 {com.nombreCompleto}
                  </div>
                )}
              </div>
                <div className="flex items-center space-x-2">
                  {getEstadoBadge(com.estado, com.codigoEstado)}
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Lote MIR:</span>
                  <div className="font-mono text-blue-600">
                    {com.lote || 'Sin lote asignado'}
                  </div>
                </div>
                
                {com.fechaEnvio && (
                  <div>
                    <span className="font-medium text-gray-700">Fecha Envío:</span>
                    <div className="text-gray-600">
                      {formatearFecha(com.fechaEnvio)}
                    </div>
                  </div>
                )}

                <div>
                  <span className="font-medium text-gray-700">Estado MIR:</span>
                  <div className="text-gray-600">
                    {com.codigoEstado ? `Código ${com.codigoEstado}` : 'No consultado'}
                    {com.descEstado && (
                      <div className="text-xs text-gray-500">{com.descEstado}</div>
                    )}
                  </div>
                </div>
              </div>

              {com.error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                  <div className="flex items-center text-red-700">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <span className="font-medium">Error:</span>
                  </div>
                  <div className="text-sm text-red-600 mt-1">{com.error}</div>
                </div>
              )}

              {com.ultimaConsulta && (
                <div className="mt-2 text-xs text-gray-500">
                  Última consulta: {formatearFecha(com.ultimaConsulta)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-3xl mr-3">🏛️</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Estado Envíos MIR - Tiempo Real</h1>
                <p className="text-sm text-gray-600">Seguimiento en tiempo real de comunicaciones al Ministerio del Interior</p>
                {ultimaActualizacion && (
                  <p className="text-xs text-gray-500">
                    Última actualización: {formatearFecha(ultimaActualizacion.toISOString())}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <Bell className={`w-4 h-4 mr-2 ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`} />
                {autoRefresh ? 'Auto-actualizando' : 'Pausado'}
              </Button>

              <Button 
                onClick={() => consultarLotesMIR()} 
                disabled={consultandoLotes}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                <Activity className={`w-4 h-4 mr-2 ${consultandoLotes ? 'animate-spin' : ''}`} />
                {consultandoLotes ? 'Consultando MIR...' : 'Consultar Estado Real MIR'}
              </Button>
              
              <Button 
                onClick={() => cargarEstadoEnvios()} 
                disabled={loading} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </div>
      </header>


      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        {/* Estadísticas */}
        {estadoEnvio && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-blue-600">{estadoEnvio.estadisticas.total}</p>
                  </div>
                  <Database className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pendientes</p>
                    <p className="text-2xl font-bold text-yellow-600">{estadoEnvio.estadisticas.pendientes}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Enviados</p>
                    <p className="text-2xl font-bold text-orange-600">{estadoEnvio.estadisticas.enviados}</p>
                  </div>
                  <Send className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Confirmados</p>
                    <p className="text-2xl font-bold text-green-600">{estadoEnvio.estadisticas.confirmados}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Errores</p>
                    <p className="text-2xl font-bold text-red-600">{estadoEnvio.estadisticas.errores}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mensajes de estado */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Tabs de comunicaciones */}
        {estadoEnvio && (
          <Tabs defaultValue="pendientes" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pendientes" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Pendientes ({estadoEnvio.estadisticas.pendientes})</span>
              </TabsTrigger>
              <TabsTrigger value="enviados" className="flex items-center space-x-2">
                <Send className="w-4 h-4" />
                <span>Enviados ({estadoEnvio.estadisticas.enviados})</span>
              </TabsTrigger>
              <TabsTrigger value="confirmados" className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Confirmados ({estadoEnvio.estadisticas.confirmados})</span>
              </TabsTrigger>
              <TabsTrigger value="errores" className="flex items-center space-x-2">
                <XCircle className="w-4 h-4" />
                <span>Errores ({estadoEnvio.estadisticas.errores})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pendientes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span>Comunicaciones Pendientes de Envío</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderComunicaciones(estadoEnvio.comunicaciones.pendientes, 'pendientes')}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="enviados">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Send className="w-5 h-5 text-orange-600" />
                    <span>Comunicaciones Enviadas al MIR</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderComunicaciones(estadoEnvio.comunicaciones.enviados, 'enviadas')}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="confirmados">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span>Comunicaciones Confirmadas por el MIR</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderComunicaciones(estadoEnvio.comunicaciones.confirmados, 'confirmadas')}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="errores">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span>Comunicaciones con Errores</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderComunicaciones(estadoEnvio.comunicaciones.errores, 'con errores')}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12 shadow-lg w-full">
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
