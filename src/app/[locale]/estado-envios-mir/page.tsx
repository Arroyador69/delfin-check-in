'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle,
  Clock,
  Database,
  Eye,
  RefreshCw,
  Send,
  XCircle
} from 'lucide-react';
import { useTenant, isFreePlanMirPreview } from '@/hooks/useTenant';
import { PlanFreePreviewOverlay } from '@/components/PlanFreePreviewOverlay';

type EstadoComunicacion = 'pendiente' | 'enviado' | 'confirmado' | 'error';

type ComunicacionMIR = {
  id: string;
  timestamp: string;
  datos: any;
  resultado: any;
  estado: EstadoComunicacion;
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
};

type Estadisticas = {
  total: number;
  pendientes: number;
  enviados: number;
  confirmados: number;
  errores: number;
};

type EstadoEnvio = {
  estadisticas: Estadisticas;
  comunicaciones: Record<'pendientes' | 'enviados' | 'confirmados' | 'errores', ComunicacionMIR[]>;
  timestamp: string;
};

const ESTADO_BADGE_KEYS: Record<string, 'statusConfirmed' | 'statusPending' | 'statusError' | 'statusAnulado'> = {
  '1': 'statusConfirmed',
  '4': 'statusPending',
  '5': 'statusError',
  '6': 'statusAnulado'
};

const ESTADO_BADGE: Record<string, { color: string; icon: typeof CheckCircle }> = {
  '1': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  '4': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  '5': { color: 'bg-red-100 text-red-800', icon: XCircle },
  '6': { color: 'bg-gray-100 text-gray-800', icon: XCircle }
};

export default function EstadoEnviosMIRPage() {
  const t = useTranslations('estadoEnviosMir');
  const locale = useLocale();
  const { tenant } = useTenant();

  function formatearFecha(valor: string) {
    return new Date(valor).toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  const [estadoEnvio, setEstadoEnvio] = useState<EstadoEnvio | null>(null);
  const [loading, setLoading] = useState(false);
  const [consultandoLotes, setConsultandoLotes] = useState(false);
  const [reintentandoPendientes, setReintentandoPendientes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

  useEffect(() => {
    cargarEstadoEnvios();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const handler = setInterval(() => cargarEstadoEnvios(true), 30000);
    return () => clearInterval(handler);
  }, [autoRefresh]);

  const cargarEstadoEnvios = async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ministerio/estado-envios');
      const data = await res.json();

      if (data.success) {
        setEstadoEnvio(data);
        setUltimaActualizacion(new Date());
        if (!silencioso) {
          setSuccess(t('successUpdated', { count: data.estadisticas.total }));
        }
      } else {
        setError(data.message || t('errorLoad'));
      }
    } catch (err) {
      console.error('Error cargando estado MIR:', err);
      setError(t('errorConexion'));
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  const consultarEstadoReal = async () => {
    setConsultandoLotes(true);
    setError(null);

    try {
      const res = await fetch('/api/ministerio/consultar-estado-real-mir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        await cargarEstadoEnvios();
        setSuccess(t('successConsulta', { count: data.lotesConsultados || 0 }));
      } else {
        const msg =
          data?.message ||
          data?.error ||
          (typeof data === 'string' ? data : '') ||
          t('errorConsulta');
        const hint =
          data?.error === 'Not found' || msg.toLowerCase().includes('not found')
            ? '\n\n(Esto suele indicar que el endpoint está bloqueado por middleware o que el despliegue aún no está actualizado.)'
            : '';
        setError(`Error consultando MIR (HTTP ${res.status}): ${msg}${hint}`);
      }
    } catch (err) {
      console.error('Error consultando MIR:', err);
      setError(t('errorConexionConsulta'));
    } finally {
      setConsultandoLotes(false);
    }
  };

  const reintentarPendientes = async () => {
    setReintentandoPendientes(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/ministerio/reintentar-pendientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 50 })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await cargarEstadoEnvios(true);
        setSuccess(`✅ Reintento lanzado: ${data.sent || 0} enviados, ${data.failed || 0} fallidos`);
      } else {
        setError(data.message || 'No se pudieron reintentar los pendientes');
      }
    } catch (err) {
      console.error('Error reintentando pendientes:', err);
      setError(t('errorConexionConsulta'));
    } finally {
      setReintentandoPendientes(false);
    }
  };

  const renderEstadoBadge = (estado: EstadoComunicacion, codigo?: string) => {
    const fallbackKey =
      estado === 'confirmado' ? '1' : estado === 'enviado' ? '4' : estado === 'error' ? '5' : '4';
    const badgeKey = (codigo && ESTADO_BADGE[codigo]) ? codigo : fallbackKey;
    const badge = ESTADO_BADGE[badgeKey] || ESTADO_BADGE['4'];
    const labelKey = ESTADO_BADGE_KEYS[badgeKey] || 'statusPending';
    const Icon = badge.icon;

    return (
      <Badge className={`${badge.color} border-0 font-semibold px-3 py-1 rounded-lg`}>
        <Icon className="w-3 h-3 mr-1" />
        {t(labelKey)}
      </Badge>
    );
  };

  const renderTarjetas = (lista: ComunicacionMIR[], titulo: string) => {
    if (!lista.length) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 py-16 text-center">
          <span className="text-5xl">🔍</span>
          <p className="text-lg font-semibold text-gray-700">{t('noComms', { tab: titulo.toLowerCase() })}</p>
          <p className="text-sm text-gray-500">{t('noCommsDescription')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {lista.map((com) => (
          <Card
            key={com.id}
            className="rounded-2xl border border-blue-100/70 bg-white/95 shadow hover:border-blue-300 hover:shadow-xl transition-all"
          >
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 font-mono text-xs font-semibold text-blue-700">
                    🆔 #{com.id.slice(-8)}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-gray-600">
                    🕒 {formatearFecha(com.timestamp)}
                  </span>
                  {com.referencia && (
                    <span className="rounded-full border border-purple-200 bg-gradient-to-r from-purple-100 to-pink-100 px-3 py-1 text-xs font-semibold text-purple-800">
                      🏷️ {com.referencia}
                    </span>
                  )}
                  {com.nombreCompleto && (
                    <span className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-gray-800">
                      👤 {com.nombreCompleto}
                    </span>
                  )}
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      com.tipo === 'RH'
                        ? 'border-green-300 bg-green-50 text-green-700'
                        : 'border-blue-300 bg-blue-50 text-blue-700'
                    }`}
                  >
                    📄 {com.tipo || 'PV'}
                  </span>
                  {com.tenant_id && (
                    <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                      🏢 {com.tenant_id.slice(0, 8)}…
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {renderEstadoBadge(com.estado, com.codigoEstado)}
                  <Button size="sm" variant="outline" className="rounded-lg border hover:border-blue-300 hover:bg-blue-50">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-blue-50 p-4 text-sm md:grid-cols-3">
                <div>
                  <span className="mb-1 flex items-center gap-1 font-semibold text-gray-700">📦 {t('loteMir')}</span>
                  <span className="block rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono font-semibold text-blue-700">
                    {com.lote || t('sinLote')}
                  </span>
                </div>

                {com.fechaEnvio && (
                  <div>
                    <span className="mb-1 flex items-center gap-1 font-semibold text-gray-700">📅 {t('fechaEnvio')}</span>
                    <span className="block rounded-lg border border-gray-200 bg-white px-3 py-2 font-medium text-gray-700">
                      {formatearFecha(com.fechaEnvio)}
                    </span>
                  </div>
                )}

                <div>
                  <span className="mb-1 flex items-center gap-1 font-semibold text-gray-700">🏛️ {t('estadoMir')}</span>
                  <span className="block rounded-lg border border-gray-200 bg-white px-3 py-2 font-medium text-gray-700">
                    {com.codigoEstado ? t('codigoLabel', { code: com.codigoEstado }) : t('noConsultado')}
                    {com.descEstado && <span className="mt-1 block text-xs text-gray-600">{com.descEstado}</span>}
                  </span>
                </div>
              </div>

              {com.error && (
                <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-4">
                  <p className="mb-1 flex items-center gap-2 font-semibold text-rose-700">
                    <AlertTriangle className="h-5 w-5" /> {t('errorDetectado')}
                  </p>
                  <p className="text-sm font-medium text-rose-800">{com.error}</p>
                </div>
              )}

              {com.ultimaConsulta && (
                <span className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-600">
                  🔄 {t('ultimaConsulta')} {formatearFecha(com.ultimaConsulta)}
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const showMirFreeOverlay = Boolean(tenant && isFreePlanMirPreview(tenant));

  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {showMirFreeOverlay && (
        <PlanFreePreviewOverlay
          title={t('paywallTitle')}
          body={t('paywallBody')}
          ctaLabel={t('paywallCta')}
        />
      )}
      <header className="border-b border-blue-100/70 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <span className="text-4xl sm:text-5xl">🏛️</span>
            <div>
              <h1 className="text-3xl font-bold text-transparent sm:text-4xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text">
                {t('title')}
              </h1>
              <p className="text-xs text-gray-600 sm:text-sm">{t('subtitle')}</p>
              {ultimaActualizacion && (
                <p className="mt-1 text-xs text-gray-500">{t('lastUpdate', { date: formatearFecha(ultimaActualizacion.toISOString()) })}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh((prev) => !prev)}
              className="rounded-xl border-2 border-blue-100 text-sm font-semibold text-gray-700 shadow-sm hover:border-blue-200 hover:bg-blue-50"
            >
              <Bell className={`mr-2 h-4 w-4 ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`} />
              {autoRefresh ? t('autoUpdating') : t('paused')}
            </Button>

            <Button
              onClick={consultarEstadoReal}
              disabled={consultandoLotes}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 font-semibold text-white shadow-lg shadow-emerald-200/60 transition-all hover:from-emerald-600 hover:to-emerald-700 sm:w-auto"
            >
              <Activity className={`mr-2 h-4 w-4 ${consultandoLotes ? 'animate-spin' : ''}`} />
              {consultandoLotes ? t('consulting') : t('consultReal')}
            </Button>

            <Button
              onClick={reintentarPendientes}
              disabled={reintentandoPendientes}
              variant="outline"
              className="w-full rounded-xl border-2 border-amber-200 bg-white font-semibold text-amber-700 shadow-sm hover:border-amber-300 hover:bg-amber-50 sm:w-auto"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${reintentandoPendientes ? 'animate-spin' : ''}`} />
              {reintentandoPendientes ? 'Reintentando…' : 'Reintentar pendientes'}
            </Button>

            <Button
              onClick={() => cargarEstadoEnvios()}
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 font-semibold text-white shadow-lg shadow-blue-200/60 transition-all hover:from-blue-700 hover:to-purple-700 sm:w-auto"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('updateSummary')}
            </Button>
          </div>
        </div>
      </header>

      <main className="w-full flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {estadoEnvio ? (
            <div className="grid gap-6 xl:grid-cols-[360px,1fr] xl:items-start">
              <aside className="order-2 flex flex-col gap-6 xl:order-1">
                <Card className="rounded-2xl border-2 border-blue-200/80 bg-white/85 backdrop-blur shadow-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg font-bold text-blue-800">📊 {t('summaryTitle')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t('total')}</p>
                            <p className="text-3xl font-bold text-blue-700">{estadoEnvio.estadisticas.total}</p>
                          </div>
                          <Database className="h-10 w-10 text-blue-600 opacity-80" />
                        </div>
                      </div>
                      <div className="rounded-xl border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t('pendientes')}</p>
                            <p className="text-3xl font-bold text-amber-600">{estadoEnvio.estadisticas.pendientes}</p>
                          </div>
                          <Clock className="h-10 w-10 text-amber-500 opacity-80" />
                        </div>
                      </div>
                      <div className="rounded-xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t('enviados')}</p>
                            <p className="text-3xl font-bold text-orange-600">{estadoEnvio.estadisticas.enviados}</p>
                          </div>
                          <Send className="h-10 w-10 text-orange-500 opacity-80" />
                        </div>
                      </div>
                      <div className="rounded-xl border-2 border-green-200 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t('confirmados')}</p>
                            <p className="text-3xl font-bold text-emerald-600">{estadoEnvio.estadisticas.confirmados}</p>
                          </div>
                          <CheckCircle className="h-10 w-10 text-emerald-500 opacity-80" />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border-2 border-red-200 bg-gradient-to-br from-red-50 via-rose-50 to-red-100 p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{t('errores')}</p>
                          <p className="text-3xl font-bold text-rose-600">{estadoEnvio.estadisticas.errores}</p>
                        </div>
                        <XCircle className="h-10 w-10 text-rose-500 opacity-80" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {error && (
                  <Alert className="rounded-2xl border-2 border-red-300 bg-gradient-to-br from-red-50 to-rose-50 shadow-lg shadow-rose-100/60">
                    <AlertTriangle className="h-5 w-5 text-rose-600" />
                    <AlertDescription className="text-rose-700 font-semibold">{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert className="rounded-2xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg shadow-emerald-100/60">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                    <AlertDescription className="text-emerald-700 font-semibold">{success}</AlertDescription>
                  </Alert>
                )}
              </aside>

              <section className="order-1 xl:order-2">
                <div className="flex h-[68vh] flex-col rounded-2xl border-2 border-blue-200 bg-white/90 backdrop-blur shadow-2xl sm:h-[72vh]">
                  <div className="border-b-2 border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 px-6 py-5">
                    <h2 className="flex items-center gap-2 text-xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text">
                      📬 {t('historialTitle')}
                    </h2>
                    <p className="text-sm text-gray-600">{t('historialSubtitle')}</p>
                  </div>

                  <Tabs defaultValue="pendientes" className="flex h-full flex-col">
                    <div className="border-b border-blue-100 bg-gradient-to-r from-gray-50 via-blue-50 to-gray-100 px-4 py-3">
                      <TabsList className="grid w-full grid-cols-2 gap-2 rounded-xl border border-blue-100 bg-white p-1 text-xs sm:grid-cols-4 sm:text-sm">
                        <TabsTrigger value="pendientes" className="flex items-center justify-center gap-2 rounded-lg font-semibold transition-all hover:bg-yellow-50 data-[state=active]:border data-[state=active]:border-yellow-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-50 data-[state=active]:to-amber-50">
                          <Clock className="h-4 w-4" />
                          <span>⏳ {t('tabPendientes')} ({estadoEnvio.estadisticas.pendientes})</span>
                        </TabsTrigger>
                        <TabsTrigger value="enviados" className="flex items-center justify-center gap-2 rounded-lg font-semibold transition-all hover:bg-orange-50 data-[state=active]:border data-[state=active]:border-orange-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-50 data-[state=active]:to-amber-50">
                          <Send className="h-4 w-4" />
                          <span>✉️ {t('tabEnviados')} ({estadoEnvio.estadisticas.enviados})</span>
                        </TabsTrigger>
                        <TabsTrigger value="confirmados" className="flex items-center justify-center gap-2 rounded-lg font-semibold transition-all hover:bg-green-50 data-[state=active]:border data-[state=active]:border-green-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-50 data-[state=active]:to-emerald-50">
                          <CheckCircle className="h-4 w-4" />
                          <span>✅ {t('tabConfirmados')} ({estadoEnvio.estadisticas.confirmados})</span>
                        </TabsTrigger>
                        <TabsTrigger value="errores" className="flex items-center justify-center gap-2 rounded-lg font-semibold transition-all hover:bg-red-50 data-[state=active]:border data-[state=active]:border-rose-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-50 data-[state=active]:to-rose-50">
                          <XCircle className="h-4 w-4" />
                          <span>❌ {t('tabErrores')} ({estadoEnvio.estadisticas.errores})</span>
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <TabsContent value="pendientes" className="m-0 h-full overflow-y-auto px-4 py-6">
                        <div className="mb-6 flex items-center gap-2 text-amber-600">
                          <Clock className="h-6 w-6" />
                          <h3 className="text-lg font-bold">{t('sectionPendientes')}</h3>
                        </div>
                        {renderTarjetas(estadoEnvio.comunicaciones.pendientes, t('tabPendientes'))}
                      </TabsContent>

                      <TabsContent value="enviados" className="m-0 h-full overflow-y-auto px-4 py-6">
                        <div className="mb-6 flex items-center gap-2 text-orange-600">
                          <Send className="h-6 w-6" />
                          <h3 className="text-lg font-bold">{t('sectionEnviados')}</h3>
                        </div>
                        {renderTarjetas(estadoEnvio.comunicaciones.enviados, t('tabEnviados'))}
                      </TabsContent>

                      <TabsContent value="confirmados" className="m-0 h-full overflow-y-auto px-4 py-6">
                        <div className="mb-6 flex items-center gap-2 text-emerald-600">
                          <CheckCircle className="h-6 w-6" />
                          <h3 className="text-lg font-bold">{t('sectionConfirmados')}</h3>
                        </div>
                        {renderTarjetas(estadoEnvio.comunicaciones.confirmados, t('tabConfirmados'))}
                      </TabsContent>

                      <TabsContent value="errores" className="m-0 h-full overflow-y-auto px-4 py-6">
                        <div className="mb-6 flex items-center gap-2 text-rose-600">
                          <XCircle className="h-6 w-6" />
                          <h3 className="text-lg font-bold">{t('sectionErrores')}</h3>
                        </div>
                        {renderTarjetas(estadoEnvio.comunicaciones.errores, t('tabErrores'))}
                      </TabsContent>
                    </div>
                  </Tabs>
                </div>
              </section>
            </div>
          ) : (
            <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
              <span className="mb-3 text-5xl animate-pulse">🔄</span>
              <p className="text-lg font-semibold text-gray-700">{t('loading')}</p>
              <p className="text-sm text-gray-500">{t('loadingSubtitle')}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
