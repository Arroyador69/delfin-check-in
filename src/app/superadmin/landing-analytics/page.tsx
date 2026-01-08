'use client';

import { useEffect, useState } from 'react';

interface LandingAnalytics {
  metrics: {
    totalVisits: number;
    conversions: number;
    conversionRate: number;
    avgTimeOnPage: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
  advanced: {
    avgScrollDepth: number;
    totalClicks: number;
    popupViews: number;
    popupCloses: number;
    popupClicks: number;
    popupConversionRate: string;
    formStarts: number;
    formSubmits: number;
    formAbandonmentRate: number;
  };
  trends: Array<{
    date: string;
    visits: number;
    conversions: number;
    avgTime: number;
  }>;
  topEvents: Array<{
    eventType: string;
    count: number;
  }>;
  referrers: Array<{
    referrer: string;
    visits: number;
  }>;
  devices: Array<{
    deviceType: string;
    visits: number;
  }>;
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
}

export default function LandingAnalyticsPage() {
  const [analytics, setAnalytics] = useState<LandingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/superadmin/landing-analytics?days=${days}`);
      
      if (!response.ok) {
        throw new Error('Error al obtener analytics');
      }
      
      const data = await response.json();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Error al cargar analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES').format(num);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-900 mb-2">❌ Error</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 Monitoreo Landing Page</h1>
            <p className="text-gray-700 mt-2">Analytics completo de la landing page</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Últimos 7 días</option>
              <option value={30}>Últimos 30 días</option>
              <option value={90}>Últimos 90 días</option>
            </select>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          Periodo: {analytics.period.startDate} - {analytics.period.endDate}
        </div>
      </div>

      {/* Métricas Básicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Visitas Totales</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(analytics.metrics.totalVisits)}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Conversiones</p>
              <p className="text-3xl font-bold text-gray-900">{formatNumber(analytics.metrics.conversions)}</p>
              <p className="text-sm text-green-600 mt-1">
                {analytics.metrics.conversionRate.toFixed(2)}% tasa
              </p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tiempo Promedio</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatTime(analytics.metrics.avgTimeOnPage)}
              </p>
            </div>
            <div className="text-4xl">⏱️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tasa de Abandono</p>
              <p className="text-3xl font-bold text-gray-900">
                {analytics.metrics.bounceRate.toFixed(2)}%
              </p>
            </div>
            <div className="text-4xl">📉</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Scroll Promedio</p>
              <p className="text-3xl font-bold text-gray-900">
                {analytics.advanced.avgScrollDepth.toFixed(0)}%
              </p>
            </div>
            <div className="text-4xl">📜</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-pink-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Clics Totales</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatNumber(analytics.advanced.totalClicks)}
              </p>
            </div>
            <div className="text-4xl">🖱️</div>
          </div>
        </div>
      </div>

      {/* Métricas del Popup */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">🐬 Métricas del Popup</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Vistas</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.advanced.popupViews)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Cierres</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.advanced.popupCloses)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Clics en CTA</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.advanced.popupClicks)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tasa Conversión</p>
            <p className="text-2xl font-bold text-green-600">
              {parseFloat(analytics.advanced.popupConversionRate).toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Métricas del Formulario */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📝 Métricas del Formulario</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Inicios</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.advanced.formStarts)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Completados</p>
            <p className="text-2xl font-bold text-gray-900">{formatNumber(analytics.advanced.formSubmits)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tasa Abandono</p>
            <p className="text-2xl font-bold text-red-600">
              {analytics.advanced.formAbandonmentRate.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Tendencias */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📈 Tendencias (Últimos 7 días)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-4 font-semibold text-gray-700">Fecha</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Visitas</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Conversiones</th>
                <th className="text-right py-2 px-4 font-semibold text-gray-700">Tiempo Promedio</th>
              </tr>
            </thead>
            <tbody>
              {analytics.trends.map((trend, index) => (
                <tr key={index} className="border-b">
                  <td className="py-2 px-4 text-gray-900">{trend.date}</td>
                  <td className="py-2 px-4 text-right text-gray-900">{formatNumber(trend.visits)}</td>
                  <td className="py-2 px-4 text-right text-green-600 font-semibold">
                    {formatNumber(trend.conversions)}
                  </td>
                  <td className="py-2 px-4 text-right text-gray-600">{formatTime(trend.avgTime)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Eventos y Referrers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🎯 Top Eventos</h2>
          <div className="space-y-2">
            {analytics.topEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-700">{event.eventType}</span>
                <span className="font-bold text-gray-900">{formatNumber(event.count)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">🔗 Referrers</h2>
          <div className="space-y-2">
            {analytics.referrers.map((ref, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-700 truncate">{ref.referrer}</span>
                <span className="font-bold text-gray-900">{formatNumber(ref.visits)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dispositivos */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">📱 Dispositivos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analytics.devices.map((device, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-700 capitalize">{device.deviceType}</span>
              <span className="text-2xl font-bold text-gray-900">{formatNumber(device.visits)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
