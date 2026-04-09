'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import LocalizedDateInput from '@/components/LocalizedDateInput';
import { toIntlDateLocale, type Locale as AppLocale } from '@/i18n/config';
import { CalendarDays, TrendingUp, Target, Zap, AlertCircle, CheckCircle, Settings, MapPin, RefreshCw, Wrench } from 'lucide-react';

interface PriceRecommendation {
  date: string;
  roomId: string;
  currentPrice: number;
  recommendedPrice: number;
  basePrice: number;
  marketP40: number;
  factors: {
    market: number;
    leadTime: number;
    occupancy: number;
    event: number;
    weekend: number;
    total: number;
  };
  confidence: number;
  applied: boolean;
}

interface PricingStats {
  totalDays: number;
  avgRecommendedPrice: number;
  avgConfidence: number;
  appliedCount: number;
  highConfidenceCount: number;
}

const ROOMS = [
  { id: 'room_1', name: 'Habitación 1', basePrice: 45 },
  { id: 'room_2', name: 'Habitación 2', basePrice: 47 },
  { id: 'room_3', name: 'Habitación 3', basePrice: 50 },
  { id: 'room_4', name: 'Habitación 4', basePrice: 52 },
  { id: 'room_5', name: 'Habitación 5', basePrice: 55 },
  { id: 'room_6', name: 'Habitación 6', basePrice: 57 }
];

export default function PricingDashboard() {
  const t = useTranslations('pricing');
  const locale = useLocale();
  const router = useRouter();
  useEffect(() => {
    router.replace('/');
  }, [router]);
  const [selectedRoom, setSelectedRoom] = useState('room_1');
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [recommendations, setRecommendations] = useState<PriceRecommendation[]>([]);
  const [stats, setStats] = useState<PricingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null);
  const [scraperStats, setScraperStats] = useState<any>(null);

  useEffect(() => {
    loadRecommendations();
    loadScraperStats();
  }, [selectedRoom, dateRange]);

  const loadScraperStats = async () => {
    try {
      const response = await fetch('/api/pricing/scraper');
      const result = await response.json();
      if (result.success) {
        setScraperStats(result.data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas del scraper:', error);
    }
  };

  const loadRecommendations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        roomId: selectedRoom,
        from: dateRange.from,
        to: dateRange.to
      });

      const response = await fetch(`/api/pricing/recommendations?${params}`);
      const result = await response.json();

      if (result.success) {
        setRecommendations(result.data);
        setStats(result.stats);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error cargando recomendaciones:', error);
      alert('Error cargando recomendaciones');
    } finally {
      setLoading(false);
    }
  };

  const applyRecommendation = async (date: string, price: number, roomId: string) => {
    setApplying(`${roomId}-${date}`);
    try {
      const response = await fetch('/api/pricing/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, date, price })
      });

      const result = await response.json();

      if (result.success) {
        // Actualizar el estado local
        setRecommendations(prev => 
          prev.map(rec => 
            rec.date === date && rec.roomId === roomId 
              ? { ...rec, applied: true, currentPrice: price }
              : rec
          )
        );
        alert(`✅ Precio aplicado: €${price}`);
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error aplicando precio:', error);
      alert('Error aplicando precio');
    } finally {
      setApplying(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(toIntlDateLocale(locale as AppLocale), { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getFactorIcon = (factor: string, value: number) => {
    if (value > 1.05) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (value < 0.95) return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
    return <Target className="h-3 w-3 text-gray-500" />;
  };

  const selectedRoomData = ROOMS.find(r => r.id === selectedRoom);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                <p className="text-sm text-gray-600">{t('subtitle')}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/pricing/fix-schema', { method: 'POST' });
                    const result = await response.json();
                    if (result.success) {
                      alert('✅ Esquema reparado correctamente\n\n' + result.steps.join('\n') + '\n\nVerificación: Columna price existe = ' + result.verification.priceColumnExists);
                      // Recargar la página para aplicar los cambios
                      window.location.reload();
                    } else {
                      alert(`❌ Error reparando esquema: ${result.error}`);
                    }
                  } catch (error) {
                    alert('❌ Error al reparar esquema: ' + error);
                  }
                }}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm font-medium shadow-sm transition-colors duration-200"
              >
                <Wrench className="h-4 w-4 mr-2" />
                {t('fixDb')}
              </button>
              
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/pricing/verify-schema');
                    const result = await response.json();
                    if (result.success) {
                      const data = result.data;
                      let message = `🔍 Estado del Esquema:\n\n`;
                      message += `✅ Tablas existentes: ${data.existingTables.length}\n`;
                      message += `❌ Tablas faltantes: ${data.missingTables.length}\n\n`;
                      if (data.missingTables.length > 0) {
                        message += `Tablas faltantes:\n${data.missingTables.join('\n')}\n\n`;
                      }
                      if (data.competitorPricesColumns && data.competitorPricesColumns.length > 0) {
                        message += `Columnas en competitor_daily_prices:\n${data.competitorPricesColumns.map((col: any) => `${col.column_name} (${col.data_type})`).join('\n')}\n\n`;
                      }
                      message += '✅ Todas las tablas están presentes';
                      alert(message);
                    } else {
                      alert(`❌ Error verificando esquema: ${result.error}`);
                    }
                  } catch (error) {
                    alert('❌ Error al verificar esquema: ' + error);
                  }
                }}
                className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium shadow-sm transition-colors duration-200"
              >
                <Wrench className="h-4 w-4 mr-2" />
                Verificar BD
              </button>
              
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/pricing/setup-db', { method: 'POST' });
                    const result = await response.json();
                    if (result.success) {
                      alert('✅ Base de datos de precios dinámicos inicializada correctamente\n\nDetalles:\n' + result.steps.join('\n'));
                    } else {
                      alert(`❌ Error: ${result.error}\n\nDetalles:\n${result.steps ? result.steps.join('\n') : result.details}`);
                    }
                  } catch (error) {
                    alert('❌ Error al inicializar la base de datos: ' + error);
                  }
                }}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium shadow-sm transition-colors duration-200"
              >
                <Settings className="h-4 w-4 mr-2" />
                {t('initDb')}
              </button>
              
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/pricing/scraper', { 
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ action: 'initialize' })
                    });
                    const result = await response.json();
                    if (result.success) {
                      alert(`✅ Competidores locales de Fuengirola inicializados\n\nCompetidores: ${result.data.competitors}\nUbicación: ${result.data.location}`);
                      loadScraperStats();
                    } else {
                      alert(`❌ Error: ${result.error}`);
                    }
                  } catch (error) {
                    alert('❌ Error al inicializar competidores: ' + error);
                  }
                }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm transition-colors duration-200"
              >
                <MapPin className="h-4 w-4 mr-2" />
                Competidores
              </button>
              
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/pricing/scraper', { 
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        action: 'scrape',
                        startDate: dateRange.from,
                        endDate: dateRange.to
                      })
                    });
                    const result = await response.json();
                    if (result.success) {
                      alert(`✅ Scraping completado\n\nRango: ${result.data.dateRange.from} - ${result.data.dateRange.to}\nCompetidores: ${result.data.totalCompetitors}\nPrecio promedio: €${result.data.avgPrice.toFixed(2)}`);
                      loadScraperStats();
                      loadRecommendations(); // Recargar recomendaciones con nuevos datos
                    } else {
                      alert(`❌ Error: ${result.error}`);
                    }
                  } catch (error) {
                    alert('❌ Error al ejecutar scraping: ' + error);
                  }
                }}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium shadow-sm transition-colors duration-200"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('scrape')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controles */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('room')}
              </label>
              <select
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ROOMS.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.name} (€{room.basePrice})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('from')}
              </label>
              <LocalizedDateInput
                value={dateRange.from}
                onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('to')}
              </label>
              <LocalizedDateInput
                value={dateRange.to}
                onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Estadísticas del Scraper Local */}
        {scraperStats && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-center mb-4">
              <MapPin className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-blue-900">{t('localDataTitle')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-700">{scraperStats.totalCompetitors}</p>
                <p className="text-sm text-blue-600">{t('competitorsCount')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-700">€{scraperStats.avgPrice?.toFixed(2) || '45.00'}</p>
                <p className="text-sm text-blue-600">{t('avgPrice')}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-700">€{scraperStats.priceRange?.min || '35'}-{scraperStats.priceRange?.max || '65'}</p>
                <p className="text-sm text-blue-600">{t('priceRange')}</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-blue-700">{scraperStats.lastScrapedFormatted || t('never')}</p>
                <p className="text-sm text-blue-600">{t('lastScraped')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CalendarDays className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t('daysAnalyzed')}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalDays}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t('avgRecommendedPrice')}</p>
                  <p className="text-2xl font-bold text-gray-900">€{stats.avgRecommendedPrice}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t('avgConfidence')}</p>
                  <p className="text-2xl font-bold text-gray-900">{Math.round(stats.avgConfidence * 100)}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{t('applied')}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.appliedCount}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de recomendaciones */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {t('recommendationsFor')} {selectedRoomData?.name}
              </h3>
              <button
                onClick={loadRecommendations}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? t('loading') : t('update')}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('currentPrice')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('recommended')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('marketP40')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('factors')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('confidence')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('action')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recommendations.map((rec) => (
                  <tr key={rec.date} className={rec.applied ? 'bg-green-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDate(rec.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      €{rec.currentPrice}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      €{rec.recommendedPrice}
                      {rec.recommendedPrice !== rec.currentPrice && (
                        <span className={`ml-2 text-xs ${rec.recommendedPrice > rec.currentPrice ? 'text-green-600' : 'text-red-600'}`}>
                          ({rec.recommendedPrice > rec.currentPrice ? '+' : ''}{Math.round((rec.recommendedPrice - rec.currentPrice) / rec.currentPrice * 100)}%)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      €{rec.marketP40}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-1">
                        <div className="flex items-center" title={`Mercado: ${rec.factors.market}x`}>
                          {getFactorIcon('market', rec.factors.market)}
                        </div>
                        <div className="flex items-center" title={`Fin de semana: ${rec.factors.weekend}x`}>
                          {getFactorIcon('weekend', rec.factors.weekend)}
                        </div>
                        <div className="flex items-center" title={`Evento: ${rec.factors.event}x`}>
                          {getFactorIcon('event', rec.factors.event)}
                        </div>
                        <div className="flex items-center" title={`Ocupación: ${rec.factors.occupancy}x`}>
                          {getFactorIcon('occupancy', rec.factors.occupancy)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceColor(rec.confidence)}`}>
                        {Math.round(rec.confidence * 100)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {rec.applied ? (
                        <span className="text-green-600 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {t('appliedLabel')}
                        </span>
                      ) : (
                        <button
                          onClick={() => applyRecommendation(rec.date, rec.recommendedPrice, rec.roomId)}
                          disabled={applying === `${rec.roomId}-${rec.date}`}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          {applying === `${rec.roomId}-${rec.date}` ? t('applying') : t('apply')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">{t('howItWorks')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-700">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">{t('factorsConsidered')}</h4>
              <ul className="space-y-1">
                <li>• {t('factorMarket')}</li>
                <li>• {t('factorEvents')}</li>
                <li>• {t('factorOccupancy')}</li>
                <li>• {t('factorWeekend')}</li>
                <li>• {t('factorLeadTime')}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">{t('factorIcons')}</h4>
              <ul className="space-y-1">
                <li>• <TrendingUp className="h-3 w-3 text-green-500 inline mr-1" /> {t('factorUp')}</li>
                <li>• <TrendingUp className="h-3 w-3 text-red-500 inline mr-1 rotate-180" /> {t('factorDown')}</li>
                <li>• <Target className="h-3 w-3 text-gray-500 inline mr-1" /> {t('factorNeutral')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
