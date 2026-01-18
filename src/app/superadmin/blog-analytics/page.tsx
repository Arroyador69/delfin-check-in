'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Article {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  published_at: string;
}

interface ArticleStats {
  article: {
    slug: string;
    title: string;
    published_at: string;
  };
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  metrics: {
    totalVisits: number;
    conversions: number;
    conversionRate: number;
    avgTimeOnPage: number;
    bounceRate: number;
    avgScrollDepth: number;
    totalClicks: number;
  };
  popup: {
    views: number;
    closes: number;
    clicks: number;
    conversionRate: number;
  };
  topEvents: Array<{ event_type: string; count: number }>;
  referrers: Array<{ referrer: string; count: number }>;
  devices: Array<{ device_type: string; count: number }>;
  dailyTrends: Array<{
    date: string;
    visits: number;
    conversions: number;
    avg_time: number;
  }>;
}

export default function BlogAnalyticsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [stats, setStats] = useState<ArticleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [days, setDays] = useState(30);
  const [error, setError] = useState<string | null>(null);

  // Cargar lista de artículos
  useEffect(() => {
    fetchArticles();
  }, []);

  // Cargar stats cuando cambia el artículo seleccionado o el período
  useEffect(() => {
    if (selectedSlug) {
      fetchStats();
    }
  }, [selectedSlug, days]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/blog/articles?published_only=true');
      const data = await response.json();
      
      if (data.success) {
        setArticles(data.articles);
        // Seleccionar el primer artículo por defecto
        if (data.articles.length > 0 && !selectedSlug) {
          setSelectedSlug(data.articles[0].slug);
        }
      }
    } catch (err: any) {
      setError('Error al cargar artículos');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!selectedSlug) return;
    
    try {
      setStatsLoading(true);
      setError(null);
      const response = await fetch(
        `/api/blog/analytics/stats?article_slug=${selectedSlug}&days=${days}`
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener estadísticas');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setStatsLoading(false);
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
          <p className="mt-4 text-gray-600">Cargando artículos...</p>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-yellow-900 mb-2">⚠️ No hay artículos publicados</h2>
          <p className="text-yellow-700">Aún no hay artículos publicados para mostrar estadísticas.</p>
          <Link
            href="/superadmin/blog-manager"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Crear Artículo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 Monitoreo de Artículos</h1>
            <p className="text-gray-700 mt-2">Analytics completo de cada artículo del blog</p>
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
              onClick={fetchStats}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={statsLoading}
            >
              {statsLoading ? '⏳ Cargando...' : '🔄 Actualizar'}
            </button>
          </div>
        </div>

        {/* Selector de Artículo */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Selecciona un artículo:
          </label>
          <select
            value={selectedSlug || ''}
            onChange={(e) => setSelectedSlug(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
          >
            {articles.map((article) => (
              <option key={article.id} value={article.slug}>
                {article.title}
              </option>
            ))}
          </select>
        </div>

        {stats && (
          <div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3 border border-blue-200">
            <strong className="text-blue-900">Período:</strong> {stats.period.startDate} - {stats.period.endDate}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-red-900 mb-2">❌ Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Stats */}
      {statsLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
        </div>
      )}

      {!statsLoading && stats && (
        <>
          {/* Métricas Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Visitas Totales */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                  👥
                </div>
                <div>
                  <div className="text-sm text-gray-600 font-semibold">Visitas Totales</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatNumber(stats.metrics.totalVisits)}
                  </div>
                </div>
              </div>
            </div>

            {/* Conversiones */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">
                  ✅
                </div>
                <div>
                  <div className="text-sm text-gray-600 font-semibold">Conversiones</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatNumber(stats.metrics.conversions)}
                  </div>
                  <div className="text-sm text-green-600 font-semibold mt-1">
                    {stats.metrics.conversionRate.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Tiempo Promedio */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-2xl">
                  ⏱️
                </div>
                <div>
                  <div className="text-sm text-gray-600 font-semibold">Tiempo Promedio</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatTime(stats.metrics.avgTimeOnPage)}
                  </div>
                </div>
              </div>
            </div>

            {/* Tasa de Abandono */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                  📉
                </div>
                <div>
                  <div className="text-sm text-gray-600 font-semibold">Tasa de Abandono</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.metrics.bounceRate.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Scroll Promedio */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">
                  📜
                </div>
                <div>
                  <div className="text-sm text-gray-600 font-semibold">Scroll Promedio</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.metrics.avgScrollDepth}%
                  </div>
                </div>
              </div>
            </div>

            {/* Clics Totales */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
                  🖱️
                </div>
                <div>
                  <div className="text-sm text-gray-600 font-semibold">Clics Totales</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatNumber(stats.metrics.totalClicks)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Métricas del Popup */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📬 Métricas del Popup</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Vistas</div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(stats.popup.views)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Cierres</div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(stats.popup.closes)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Clics en CTA</div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(stats.popup.clicks)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Tasa Conversión</div>
                <div className="text-2xl font-bold text-green-600">{stats.popup.conversionRate.toFixed(2)}%</div>
              </div>
            </div>
          </div>

          {/* Tendencias Diarias */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📈 Tendencias (Últimos 7 días)</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Fecha</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Visitas</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Conversiones</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Tiempo Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.dailyTrends.map((trend, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{new Date(trend.date).toLocaleDateString('es-ES')}</td>
                      <td className="py-3 px-4 font-semibold">{formatNumber(trend.visits)}</td>
                      <td className="py-3 px-4 font-semibold text-green-600">{formatNumber(trend.conversions)}</td>
                      <td className="py-3 px-4">{formatTime(trend.avg_time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Top Eventos */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🎯 Top Eventos</h3>
              <div className="space-y-2">
                {stats.topEvents.map((event, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-700">{event.event_type}</span>
                    <span className="font-bold text-gray-900">{formatNumber(event.count)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Referrers */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🌐 Referrers</h3>
              <div className="space-y-2">
                {stats.referrers.slice(0, 6).map((ref, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-700 text-sm truncate max-w-[150px]">
                      {ref.referrer || 'Directo'}
                    </span>
                    <span className="font-bold text-gray-900">{formatNumber(ref.count)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Dispositivos */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📱 Dispositivos</h3>
              <div className="space-y-2">
                {stats.devices.map((device, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-700 capitalize">{device.device_type}</span>
                    <span className="font-bold text-gray-900">{formatNumber(device.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Link para volver */}
      <div className="mt-8">
        <Link
          href="/superadmin"
          className="inline-block px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
        >
          ← Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}
