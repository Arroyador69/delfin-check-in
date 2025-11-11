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
  tipo?: string;
  tenant_id?: string;
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

  useEffect(() => {
    cargarEstadoEnvios();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      cargarEstadoEnvios(true);
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
        await cargarEstadoEnvios();

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

    const estadoInfo =
      (codigoEstado && estadosMIR[codigoEstado as keyof typeof estadosMIR]) ||
      (estado === 'confirmado'
        ? estadosMIR['1']
        : estado === 'enviado'
        ? estadosMIR['4']
        : estado === 'error'
        ? estadosMIR['5']
        : estadosMIR['4']);

    const Icon = estadoInfo.icon;

    return (
      <Badge className={`${estadoInfo.color} border-0 font-semibold px-3 py-1 rounded-lg`}>
        <Icon className="w-3 h-3 mr-1" />
        {estadoInfo.label}
      </Badge>
    );
  };

  const formatearFecha = (fecha: string) =>
    new Date(fecha).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

  const renderComunicaciones = (comunicaciones: ComunicacionMIR[], titulo: string) => {
    if (comunicaciones.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-blue-200 bg-blue-50/40">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-lg font-semibold text-gray-700">No hay comunicaciones {titulo.toLowerCase()}</p>
          <p className="text-sm text-gray-500 mt-1">Las nuevas comunicaciones aparecerán aquí automáticamente.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {comunicaciones.map((com) => (
          <Card
            key={com.id}
            className="border border-blue-100/60 hover:border-blue-300 bg-white/95 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl"
          >
            <CardContent className="p-5 space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-mono font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent border border-blue-200 rounded-lg px-3 py-1 bg-blue-50">
                    🆔 #{com.id.slice(-8)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 font-medium flex items-center gap-1">
                    🕒 {formatearFecha(com.timestamp)}
                  </div>
                  {com.referencia && (
                    <div className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-3 py-1 rounded-full font-semibold border border-purple-200">
                      🏷️ {com.referencia}
                    </div>
                  )}
                  {com.nombreCompleto && (
                    <div className="text-xs sm:text-sm font-semibold text-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1 rounded-lg border border-blue-200">
                      👤 {com.nombreCompleto}
                    </div>
                  )}
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      com.tipo === 'RH'
                        ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-300'
                        : 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border-blue-300'
                    }`}
                  >
                    📄 {com.tipo || 'PV'}
                  </div>
                  {com.tenant_id && (
                    <div className="text-xs text-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 px-3 py-1 rounded-full font-semibold border border-purple-200">
                      🏢 {com.tenant_id.substring(0, 8)}…
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {getEstadoBadge(com.estado, com.codigoEstado)}
                  <Button size="sm" variant="outline" className="border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-sm bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl border border-gray-200">
                <div>
                  <span className="font-bold text-gray-700 flex items-center gap-1 mb-1">
                    📦 Lote MIR:
                  </span>
                  <div className="font-mono font-semibold bg-white px-3 py-2 rounded-lg border border-blue-200 text-blue-700 shadow-inner">
                    {com.lote || 'Sin lote asignado'}
                  </div>
                </div>

                {com.fechaEnvio && (
                  <div>
                    <span className="font-bold text-gray-700 flex items-center gap-1 mb-1">
                      📅 Fecha envío:
                    </span>
                    <div className="text-gray-700 bg-white px-3 py-2 rounded-lg border border-gray-200 font-medium shadow-inner">
                      {formatearFecha(com.fechaEnvio)}
                    </div>
                  </div>
                )}

                <div>
                  <span className="font-bold text-gray-700 flex items-center gap-1 mb-1">
                    🏛️ Estado MIR:
                  </span>
                  <div className="text-gray-700 bg-white px-3 py-2 rounded-lg border border-gray-200 font-medium shadow-inner">
                    {com.codigoEstado ? `Código ${com.codigoEstado}` : 'No consultado'}
                    {com.descEstado && <div className="text-xs text-gray-600 font-normal mt-1">{com.descEstado}</div>}
                  </div>
                </div>
              </div>

              {com.error && (
                <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 rounded-xl">
                  <div className="flex items-center text-rose-700 font-bold mb-2">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <span>Error detectado</span>
                  </div>
                  <div className="text-sm text-rose-800 font-medium">{com.error}</div>
                </div>
              )}

              {com.ultimaConsulta && (
                <div className="text-xs text-gray-600 font-medium bg-gray-100 px-3 py-2 rounded-lg inline-flex items-center gap-2">
                  🔄 Última consulta: {formatearFecha(com.ultimaConsulta)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      <header className="bg-white shadow-sm border-b border-blue-100/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 py-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
              <div className="text-4xl sm:text-5xl">🏛️</div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Estado Envíos MIR
                </h1>
                <p className="text-xs sm:text-sm text-gray-600">Seguimiento visual del estado de las comunicaciones al Ministerio del Interior</p>
                {ultimaActualizacion && (
                  <p className="mt-1 text-xs text-gray-500">
                    Última actualización: {formatearFecha(ultimaActualizacion.toISOString())}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="rounded-xl border-2 border-blue-100 text-sm font-semibold text-gray-700 shadow-sm hover:border-blue-200 hover:bg-blue-50"
              >
                <Bell className={`w-4 h-4 mr-2 ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`} />
                {autoRefresh ? 'Auto-actualizando' : 'Pausado'}
              </Button>

              <Button
                onClick={() => consultarLotesMIR()}
                disabled={consultandoLotes}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-200/60 transition-all"
              >
                <Activity className={`w-4 h-4 mr-2 ${consultandoLotes ? 'animate-spin' : ''}`} />
                {consultandoLotes ? 'Consultando MIR...' : 'Consultar estado real'}
              </Button>

              <Button
                onClick={() => cargarEstadoEnvios()}
                disabled={loading}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200/60 transition-all"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar resumen
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
          {estadoEnvio ? (
            <div className="grid gap-6 xl:grid-cols-[380px,1fr] items-start">
              <div className="order-2 flex flex-col gap-6 xl:order-1">
                <Card className="border-2 border-blue-200/80 bg-white/85 backdrop-blur rounded-2xl shadow-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-bold text-blue-800 flex items-center gap-2">
                      📊 Resumen de comunicaciones
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Total</p>
                            <p className="text-3xl font-bold text-blue-700">{estadoEnvio.estadisticas.total}</p>
                          </div>
                          <Database className="w-10 h-10 text-blue-600 opacity-80" />
                        </div>
                      </div>
                      <div className="rounded-xl border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Pendientes</p>
                            <p className="text-3xl font-bold text-amber-600">{estadoEnvio.estadisticas.pendientes}</p>
                          </div>
                          <Clock className="w-10 h-10 text-amber-500 opacity-80" />
                        </div>
                      </div>
                      <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Enviados</p>
                            <p className="text-3xl font-bold text-orange-600">{estadoEnvio.estadisticas.enviados}</p>
                          </div>
                          <Send className="w-10 h-10 text-orange-500 opacity-80" />
                        </div>
                      </div>
                      <div className="rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Confirmados</p>
                            <p className="text-3xl font-bold text-emerald-600">{estadoEnvio.estadisticas.confirmados}</p>
                          </div>
                          <CheckCircle className="w-10 h-10 text-emerald-500 opacity-80" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 via-rose-50 to-red-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Errores</p>
                          <p className="text-3xl font-bold text-rose-600">{estadoEnvio.estadisticas.errores}</p>
                        </div>
                        <XCircle className="w-10 h-10 text-rose-500 opacity-80" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {error && (
                  <Alert className="border-2 border-red-300 bg-gradient-to-br from-red-50 to-rose-50 rounded-2xl shadow-lg shadow-rose-100/60">
                    <AlertTriangle className="h-5 w-5 text-rose-600" />
                    <AlertDescription className="text-rose-700 font-semibold">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl shadow-lg shadow-emerald-100/60">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <AlertDescription className="text-emerald-700 font-semibold">{success}</AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="order-1 xl:order-2">
                <div className="bg-white/90 backdrop-blur rounded-2xl border-2 border-blue-200 shadow-2xl flex h-[70vh] flex-col sm:h-[72vh]">
                  <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-6 py-5 border-b-2 border-blue-200">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                      📬 Historial de comunicaciones MIR
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">Explora por pestañas y revisa cada comunicación en detalle sin abandonar la vista.</p>
                  </div>

                  <Tabs defaultValue="pendientes" className="flex h-full flex-col">
                    <div className="px-4 py-3 border-b border-blue-100 bg-gradient-to-r from-gray-50 via-blue-50 to-gray-100">
                      <TabsList className="grid w-full grid-cols-2 gap-2 rounded-xl border border-blue-100 bg-white p-1 text-xs sm:grid-cols-4 sm:text-sm">
                        <TabsTrigger value="pendientes" className="flex items-center justify-center gap-2 rounded-lg font-semibold transition-all hover:bg-yellow-50 data-[state=active]:border data-[state=active]:border-yellow-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-50 data-[state=active]:to-amber-50">
                          <Clock className="w-4 h-4" />
                          <span>⏳ Pendientes ({estadoEnvio.estadisticas.pendientes})</span>
                        </TabsTrigger>
                        <TabsTrigger value="enviados" className="flex items-center justify-center gap-2 rounded-lg font-semibold transition-all hover:bg-orange-50 data-[state=active]:border data-[state=active]:border-orange-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-50 data-[state=active]:to-amber-50">
                          <Send className="w-4 h-4" />
                          <span>✉️ Enviados ({estadoEnvio.estadisticas.enviados})</span>
                        </TabsTrigger>
                        <TabsTrigger value="confirmados" className="flex items-center justify-center gap-2 rounded-lg font-semibold transition-all hover:bg-green-50 data-[state=active]:border data-[state=active]:border-green-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-50 data-[state=active]:to-emerald-50">
                          <CheckCircle className="w-4 h-4" />
                          <span>✅ Confirmados ({estadoEnvio.estadisticas.confirmados})</span>
                        </TabsTrigger>
                        <TabsTrigger value="errores" className="flex items-center justify-center gap-2 rounded-lg font-semibold transition-all hover:bg-red-50 data-[state=active]:border data-[state=active]:border-rose-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-50 data-[state=active]:to-rose-50">
                          <XCircle className="w-4 h-4" />
                          <span>❌ Errores ({estadoEnvio.estadisticas.errores})</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <TabsContent value="pendientes" className="m-0 h-full overflow-y-auto px-4 py-6">
                        <div className="flex items-center gap-2 mb-6">
                          <Clock className="w-6 h-6 text-amber-500" />
                          <h3 className="text-lg font-bold text-amber-600">Pendientes de envío</h3>
                        </div>
                        {renderComunicaciones(estadoEnvio.comunicaciones.pendientes, 'pendientes')}
                      </TabsContent>

                      <TabsContent value="enviados" className="m-0 h-full overflow-y-auto px-4 py-6">
                        <div className="flex items-center gap-2 mb-6">
                          <Send className="w-6 h-6 text-orange-500" />
                          <h3 className="text-lg font-bold text-orange-600">Comunicaciones enviadas</h3>
                        </div>
                        {renderComunicaciones(estadoEnvio.comunicaciones.enviados, 'enviadas')}
                      </TabsContent>

                      <TabsContent value="confirmados" className="m-0 h-full overflow-y-auto px-4 py-6">
                        <div className="flex items-center gap-2 mb-6">
                          <CheckCircle className="w-6 h-6 text-emerald-500" />
                          <h3 className="text-lg font-bold text-emerald-600">Comunicaciones confirmadas</h3>
                        </div>
                        {renderComunicaciones(estadoEnvio.comunicaciones.confirmados, 'confirmadas')}
                      </TabsContent>

                      <TabsContent value="errores" className="m-0 h-full overflow-y-auto px-4 py-6">
                        <div className="flex items-center gap-2 mb-6">
                          <XCircle className="w-6 h-6 text-rose-500" />
                          <h3 className="text-lg font-bold text-rose-600">Comunicaciones con errores</h3>
                        </div>
                        {renderComunicaciones(estadoEnvio.comunicaciones.errores, 'con errores')}
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
              <div className="text-5xl mb-4 animate-pulse">🔄</div>
              <p className="text-lg font-semibold text-gray-700">Cargando estado de envíos MIR...</p>
              <p className="text-sm text-gray-500 mt-1">Un momento, estamos trayendo los datos más recientes.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

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
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-xl font-semibold bg-gradient-to-r from-gray-600 to-gray-800 bg-clip-text text-transparent">No hay comunicaciones {titulo.toLowerCase()}</p>
          <p className="text-sm text-gray-500 mt-2">Las nuevas comunicaciones aparecerán aquí automáticamente</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {comunicaciones.map((com) => (
          <Card key={com.id} className="border-2 border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 bg-white rounded-xl overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3 flex-wrap gap-2">
                <div className="text-sm font-mono font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent border-2 border-blue-200 rounded-lg px-2 py-1 bg-blue-50">
                  🆔 #{com.id.slice(-8)}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  🕒 {formatearFecha(com.timestamp)}
                </div>
                {com.referencia && (
                  <div className="text-xs bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-3 py-1 rounded-full font-semibold border border-purple-200">
                    🏷️ {com.referencia}
                  </div>
                )}
                {com.nombreCompleto && (
                  <div className="text-sm font-semibold text-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1 rounded-lg border border-blue-200">
                    👤 {com.nombreCompleto}
                  </div>
                )}
                <div className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${
                  com.tipo === 'PV' ? 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-300' : 
                  com.tipo === 'RH' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-300' : 
                  'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800 border-gray-300'
                }`}>
                  📋 {com.tipo || 'PV'}
                </div>
                {com.tenant_id && (
                  <div className="text-xs text-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 px-3 py-1 rounded-full font-semibold border border-purple-200">
                    🏢 {com.tenant_id.substring(0, 8)}...
                  </div>
                )}
              </div>
                <div className="flex items-center space-x-2">
                  {getEstadoBadge(com.estado, com.codigoEstado)}
                  <Button size="sm" variant="outline" className="border-2 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200">
                <div>
                  <span className="font-bold text-gray-700 flex items-center mb-1">
                    📦 Lote MIR:
                  </span>
                  <div className="font-mono font-semibold bg-white px-3 py-2 rounded-lg border-2 border-blue-200 text-blue-700">
                    {com.lote || 'Sin lote asignado'}
                  </div>
                </div>
                
                {com.fechaEnvio && (
                  <div>
                    <span className="font-bold text-gray-700 flex items-center mb-1">
                      📅 Fecha Envío:
                    </span>
                    <div className="text-gray-700 bg-white px-3 py-2 rounded-lg border-2 border-gray-200 font-medium">
                      {formatearFecha(com.fechaEnvio)}
                    </div>
                  </div>
                )}

                <div>
                  <span className="font-bold text-gray-700 flex items-center mb-1">
                    🏛️ Estado MIR:
                  </span>
                  <div className="text-gray-700 bg-white px-3 py-2 rounded-lg border-2 border-gray-200 font-medium">
                    {com.codigoEstado ? `Código ${com.codigoEstado}` : 'No consultado'}
                    {com.descEstado && (
                      <div className="text-xs text-gray-600 font-normal mt-1">{com.descEstado}</div>
                    )}
                  </div>
                </div>
              </div>

              {com.error && (
                <div className="mt-4 p-4 bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-300 rounded-xl">
                  <div className="flex items-center text-red-700 font-bold mb-2">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <span>Error detectado:</span>
                  </div>
                  <div className="text-sm text-red-800 font-medium">{com.error}</div>
                </div>
              )}

              {com.ultimaConsulta && (
                <div className="mt-3 text-xs text-gray-600 font-medium bg-gray-100 px-3 py-2 rounded-lg inline-block">
                  🔄 Última consulta: {formatearFecha(com.ultimaConsulta)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="text-3xl mr-3">🏛️</div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Estado Envíos MIR - Tiempo Real</h1>
                <p className="text-xs sm:text-sm text-gray-600">Seguimiento en tiempo real de comunicaciones al Ministerio del Interior</p>
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
                className="rounded-xl"
              >
                <Bell className={`w-4 h-4 mr-2 ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`} />
                {autoRefresh ? 'Auto-actualizando' : 'Pausado'}
              </Button>

              <Button 
                onClick={() => consultarLotesMIR()} 
                disabled={consultandoLotes}
                className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold rounded-xl shadow"
              >
                <Activity className={`w-4 h-4 mr-2 ${consultandoLotes ? 'animate-spin' : ''}`} />
                {consultandoLotes ? 'Consultando MIR...' : 'Consultar Estado Real MIR'}
              </Button>
              
              <Button 
                onClick={() => cargarEstadoEnvios()} 
                disabled={loading} 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow"
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
            <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-100 hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">📊 Total</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{estadoEnvio.estadisticas.total}</p>
                  </div>
                  <Database className="w-10 h-10 text-blue-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-100 hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">⏳ Pendientes</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">{estadoEnvio.estadisticas.pendientes}</p>
                  </div>
                  <Clock className="w-10 h-10 text-yellow-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-100 hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">✉️ Enviados</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">{estadoEnvio.estadisticas.enviados}</p>
                  </div>
                  <Send className="w-10 h-10 text-orange-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-100 hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">✅ Confirmados</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{estadoEnvio.estadisticas.confirmados}</p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-green-600 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-pink-100 hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">❌ Errores</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">{estadoEnvio.estadisticas.errores}</p>
                  </div>
                  <XCircle className="w-10 h-10 text-red-600 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Mensajes de estado */}
        {error && (
          <Alert className="border-2 border-red-300 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl shadow-lg">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800 font-semibold">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800 font-semibold">{success}</AlertDescription>
          </Alert>
        )}

        {/* Tabs de comunicaciones */}
        {estadoEnvio && (
          <div className="bg-white rounded-xl shadow-xl border-2 border-blue-200 overflow-hidden">
            {/* Cabecera fija */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b-2 border-blue-200">
              <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center">
                📋 Estado Envíos MIR
              </h2>
              <p className="text-sm text-gray-600 mt-1 font-medium">✨ {estadoEnvio.estadisticas.total} comunicaciones encontradas</p>
            </div>

            <Tabs defaultValue="pendientes" className="w-full">
              {/* Tabs */}
              <div className="px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
                <TabsList className="grid w-full grid-cols-4 bg-white border-2 border-gray-200 rounded-xl p-1">
                  <TabsTrigger value="pendientes" className="flex items-center justify-center space-x-2 rounded-lg font-semibold transition-all hover:bg-yellow-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-50 data-[state=active]:to-amber-50 data-[state=active]:border-2 data-[state=active]:border-yellow-300">
                    <Clock className="w-4 h-4" />
                    <span>⏳ Pendientes ({estadoEnvio.estadisticas.pendientes})</span>
                  </TabsTrigger>
                  <TabsTrigger value="enviados" className="flex items-center justify-center space-x-2 rounded-lg font-semibold transition-all hover:bg-orange-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-50 data-[state=active]:to-amber-50 data-[state=active]:border-2 data-[state=active]:border-orange-300">
                    <Send className="w-4 h-4" />
                    <span>✉️ Enviados ({estadoEnvio.estadisticas.enviados})</span>
                  </TabsTrigger>
                  <TabsTrigger value="confirmados" className="flex items-center justify-center space-x-2 rounded-lg font-semibold transition-all hover:bg-green-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-50 data-[state=active]:to-emerald-50 data-[state=active]:border-2 data-[state=active]:border-green-300">
                    <CheckCircle className="w-4 h-4" />
                    <span>✅ Confirmados ({estadoEnvio.estadisticas.confirmados})</span>
                  </TabsTrigger>
                  <TabsTrigger value="errores" className="flex items-center justify-center space-x-2 rounded-lg font-semibold transition-all hover:bg-red-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-50 data-[state=active]:to-pink-50 data-[state=active]:border-2 data-[state=active]:border-red-300">
                    <XCircle className="w-4 h-4" />
                    <span>❌ Errores ({estadoEnvio.estadisticas.errores})</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Contenedor con scroll independiente */}
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                <TabsContent value="pendientes" className="m-0">
                  <div className="p-6">
                    <div className="flex items-center space-x-2 mb-6">
                      <Clock className="w-6 h-6 text-yellow-600" />
                      <h3 className="text-xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">⏳ Comunicaciones Pendientes de Envío</h3>
                    </div>
                    {renderComunicaciones(estadoEnvio.comunicaciones.pendientes, 'pendientes')}
                  </div>
                </TabsContent>

                <TabsContent value="enviados" className="m-0">
                  <div className="p-6">
                    <div className="flex items-center space-x-2 mb-6">
                      <Send className="w-6 h-6 text-orange-600" />
                      <h3 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">✉️ Comunicaciones Enviadas al MIR</h3>
                    </div>
                    {renderComunicaciones(estadoEnvio.comunicaciones.enviados, 'enviadas')}
                  </div>
                </TabsContent>

                <TabsContent value="confirmados" className="m-0">
                  <div className="p-6">
                    <div className="flex items-center space-x-2 mb-6">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">✅ Comunicaciones Confirmadas por el MIR</h3>
                    </div>
                    {renderComunicaciones(estadoEnvio.comunicaciones.confirmados, 'confirmadas')}
                  </div>
                </TabsContent>

                <TabsContent value="errores" className="m-0">
                  <div className="p-6">
                    <div className="flex items-center space-x-2 mb-6">
                      <XCircle className="w-6 h-6 text-red-600" />
                      <h3 className="text-xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">❌ Comunicaciones con Errores</h3>
                    </div>
                    {renderComunicaciones(estadoEnvio.comunicaciones.errores, 'con errores')}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
