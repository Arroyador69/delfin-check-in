'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  CalendarDays, TrendingUp, BarChart3, MapPin, Plus, Trash2, Edit2,
  ChevronLeft, ChevronRight, Star, PartyPopper, Sun, X, Save, Eye,
  DollarSign, Users, Percent, BedDouble, Calendar
} from 'lucide-react';

interface Holiday {
  date: string;
  name: string;
  localName: string;
  global: boolean;
  counties: string[] | null;
  types: string[];
}

interface LocalEvent {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  venue: string;
  city: string;
  category: string;
  impact_level: number;
  url: string;
}

interface AnalysisSummary {
  totalReservations: number;
  totalRevenue: number;
  avgPricePerNight: number;
  avgNights: number;
  occupancyRate: number;
  cancelledCount: number;
  roomCount: number;
}

interface MonthlyData {
  month: string;
  reservations: number;
  revenue: number;
}

interface ChannelData {
  channel: string;
  count: number;
  revenue: number;
}

interface DayOfWeekData {
  day: string;
  dayIndex: number;
  count: number;
}

interface RoomPerformance {
  roomName: string;
  reservations: number;
  revenue: number;
  avgPrice: number;
}

interface Analysis {
  summary: AnalysisSummary;
  monthly: MonthlyData[];
  channels: ChannelData[];
  dayOfWeek: DayOfWeekData[];
  roomPerformance: RoomPerformance[];
}

interface GeocodeResult {
  display_name: string;
  lat: number;
  lon: number;
  city: string;
  province: string;
  postcode: string;
  country: string;
  community: string;
}

interface SavedZone {
  address: string;
  lat: number | null;
  lon: number | null;
  city: string;
  province: string;
  community: string;
}

const COMMUNITIES: Record<string, string> = {
  'ES-AN': 'Andalucía',
  'ES-AR': 'Aragón',
  'ES-AS': 'Asturias',
  'ES-CB': 'Cantabria',
  'ES-CL': 'Castilla y León',
  'ES-CM': 'Castilla-La Mancha',
  'ES-CN': 'Canarias',
  'ES-CT': 'Cataluña',
  'ES-EX': 'Extremadura',
  'ES-GA': 'Galicia',
  'ES-IB': 'Islas Baleares',
  'ES-MC': 'Murcia',
  'ES-MD': 'Madrid',
  'ES-NC': 'Navarra',
  'ES-PV': 'País Vasco',
  'ES-RI': 'La Rioja',
  'ES-VC': 'Comunidad Valenciana',
};

const EVENT_CATEGORIES = [
  { value: 'festival', label: 'Festival / Feria', color: 'bg-purple-500' },
  { value: 'concert', label: 'Concierto', color: 'bg-pink-500' },
  { value: 'sport', label: 'Deporte', color: 'bg-green-500' },
  { value: 'cultural', label: 'Cultural', color: 'bg-blue-500' },
  { value: 'gastronomy', label: 'Gastronomía', color: 'bg-orange-500' },
  { value: 'religious', label: 'Religioso', color: 'bg-yellow-600' },
  { value: 'market', label: 'Mercado', color: 'bg-teal-500' },
  { value: 'other', label: 'Otro', color: 'bg-gray-500' },
];

const IMPACT_LEVELS = [
  { value: 1, label: 'Bajo', description: 'Poco impacto en demanda' },
  { value: 2, label: 'Medio-bajo', description: 'Algo más de demanda' },
  { value: 3, label: 'Medio', description: 'Demanda notable' },
  { value: 4, label: 'Alto', description: 'Gran impacto en demanda' },
  { value: 5, label: 'Muy alto', description: 'Máxima demanda esperada' },
];

function getCategoryColor(cat: string): string {
  return EVENT_CATEGORIES.find(c => c.value === cat)?.color || 'bg-gray-500';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

const MONTH_NAMES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function MarketIntelligencePage() {
  const t = useTranslations('marketIntelligence');
  const locale = useLocale();

  const [activeTab, setActiveTab] = useState<'calendar' | 'analytics' | 'events' | 'prices'>('calendar');
  const [community, setCommunity] = useState('ES-AN');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LocalEvent | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '', description: '', startsAt: '', endsAt: '',
    venue: '', city: '', category: 'festival', impactLevel: 3, url: '',
  });
  const [addressInput, setAddressInput] = useState('');
  const [savedZone, setSavedZone] = useState<SavedZone | null>(null);
  const [geocodeResults, setGeocodeResults] = useState<GeocodeResult[]>([]);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const [zoneSaving, setZoneSaving] = useState(false);
  const [selectedResult, setSelectedResult] = useState<GeocodeResult | null>(null);
  // Precios competencia por zona
  const [zones, setZones] = useState<string[]>([]);
  const [zoneForPrices, setZoneForPrices] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');
  const [competitorPrices, setCompetitorPrices] = useState<{
    data: { date: string; p25: number; p40: number; p50: number; p75: number; sampleSize: number }[];
    meta: { zone: string; avgP40: number | null; avgP50: number | null; totalDays: number; avgSampleSize: number };
  } | null>(null);
  const [competitorPricesLoading, setCompetitorPricesLoading] = useState(false);

  const loadHolidays = useCallback(async () => {
    try {
      const res = await fetch(`/api/market/holidays?year=${calendarYear}&community=${community}&months=24`);
      const data = await res.json();
      if (data.success) setHolidays(data.holidays);
    } catch (e) {
      console.error('Error loading holidays:', e);
    }
  }, [calendarYear, community]);

  const loadEvents = useCallback(async () => {
    try {
      const from = new Date(calendarYear, 0, 1).toISOString();
      const to = new Date(calendarYear + 1, 11, 31).toISOString();
      const res = await fetch(`/api/market/events?from=${from}&to=${to}`);
      const data = await res.json();
      if (data.success) setEvents(data.events);
    } catch (e) {
      console.error('Error loading events:', e);
    }
  }, [calendarYear]);

  const loadAnalysis = useCallback(async () => {
    try {
      const res = await fetch('/api/market/analysis?months=12');
      const data = await res.json();
      if (data.success) setAnalysis(data.analysis);
    } catch (e) {
      console.error('Error loading analysis:', e);
    }
  }, []);

  const loadZone = useCallback(async () => {
    try {
      const res = await fetch('/api/market/zone');
      const data = await res.json();
      if (data.success && data.zone) {
        setSavedZone(data.zone);
        if (data.zone.community) setCommunity(data.zone.community);
      }
    } catch (e) {
      console.error('Error loading zone:', e);
    }
  }, []);

  const loadZones = useCallback(async () => {
    try {
      const res = await fetch('/api/market/zones');
      const data = await res.json();
      if (data.success && Array.isArray(data.zones)) setZones(data.zones);
    } catch (e) {
      console.error('Error loading zones:', e);
    }
  }, []);

  const loadCompetitorPrices = useCallback(async () => {
    if (!zoneForPrices.trim() || !priceFrom || !priceTo) return;
    setCompetitorPricesLoading(true);
    setCompetitorPrices(null);
    try {
      const res = await fetch(
        `/api/market/competitor-prices?zone=${encodeURIComponent(zoneForPrices)}&from=${priceFrom}&to=${priceTo}`
      );
      const data = await res.json();
      if (data.success) setCompetitorPrices({ data: data.data, meta: data.meta });
    } catch (e) {
      console.error('Error loading competitor prices:', e);
    } finally {
      setCompetitorPricesLoading(false);
    }
  }, [zoneForPrices, priceFrom, priceTo]);

  useEffect(() => {
    loadZone();
  }, [loadZone]);

  useEffect(() => {
    if (activeTab === 'prices' && zones.length === 0) loadZones();
  }, [activeTab, zones.length, loadZones]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadHolidays(), loadEvents(), loadAnalysis()])
      .finally(() => setLoading(false));
  }, [loadHolidays, loadEvents, loadAnalysis]);

  const handleSearchAddress = async () => {
    const q = addressInput.trim();
    if (q.length < 3) return;
    setGeocodeLoading(true);
    setGeocodeResults([]);
    setSelectedResult(null);
    try {
      const res = await fetch(`/api/market/geocode?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success && data.results?.length) {
        setGeocodeResults(data.results);
        const first = data.results[0];
        setSelectedResult(first);
        setCommunity(first.community);
      }
    } catch (e) {
      console.error('Geocode error:', e);
    } finally {
      setGeocodeLoading(false);
    }
  };

  const handleSelectResult = (r: GeocodeResult) => {
    setSelectedResult(r);
    setCommunity(r.community);
  };

  const handleSaveZone = async () => {
    if (!selectedResult) return;
    setZoneSaving(true);
    try {
      const res = await fetch('/api/market/zone', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: selectedResult.display_name,
          lat: selectedResult.lat,
          lon: selectedResult.lon,
          city: selectedResult.city,
          province: selectedResult.province,
          community: selectedResult.community,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedZone(data.zone);
      }
    } catch (e) {
      console.error('Save zone error:', e);
    } finally {
      setZoneSaving(false);
    }
  };

  const holidaysByDate = useMemo(() => {
    const map = new Map<string, Holiday[]>();
    for (const h of holidays) {
      const arr = map.get(h.date) || [];
      arr.push(h);
      map.set(h.date, arr);
    }
    return map;
  }, [holidays]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, LocalEvent[]>();
    for (const e of events) {
      const start = new Date(e.starts_at);
      const end = e.ends_at ? new Date(e.ends_at) : start;
      const cur = new Date(start);
      while (cur <= end) {
        const key = cur.toISOString().split('T')[0];
        const arr = map.get(key) || [];
        arr.push(e);
        map.set(key, arr);
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const days: { date: Date; inMonth: boolean }[] = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(calendarYear, calendarMonth, -i);
      days.push({ date: d, inMonth: false });
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(calendarYear, calendarMonth, i), inMonth: true });
    }
    while (days.length % 7 !== 0) {
      const d = new Date(calendarYear, calendarMonth + 1, days.length - startOffset - lastDay.getDate() + 1);
      days.push({ date: d, inMonth: false });
    }
    return days;
  }, [calendarYear, calendarMonth]);

  const handleSaveEvent = async () => {
    try {
      const method = editingEvent ? 'PUT' : 'POST';
      const body = editingEvent
        ? { id: editingEvent.id, ...eventForm }
        : eventForm;

      const res = await fetch('/api/market/events', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setShowEventModal(false);
        setEditingEvent(null);
        resetForm();
        loadEvents();
      }
    } catch (e) {
      console.error('Error saving event:', e);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await fetch(`/api/market/events?id=${id}`, { method: 'DELETE' });
      loadEvents();
    } catch (e) {
      console.error('Error deleting event:', e);
    }
  };

  const openEditEvent = (ev: LocalEvent) => {
    setEditingEvent(ev);
    setEventForm({
      title: ev.title,
      description: ev.description || '',
      startsAt: ev.starts_at?.slice(0, 16) || '',
      endsAt: ev.ends_at?.slice(0, 16) || '',
      venue: ev.venue || '',
      city: ev.city || '',
      category: ev.category || 'other',
      impactLevel: ev.impact_level || 3,
      url: ev.url || '',
    });
    setShowEventModal(true);
  };

  const resetForm = () => {
    setEventForm({
      title: '', description: '', startsAt: '', endsAt: '',
      venue: '', city: '', category: 'festival', impactLevel: 3, url: '',
    });
  };

  const prevMonth = () => {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
    else setCalendarMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
    else setCalendarMonth(m => m + 1);
  };

  const today = new Date().toISOString().split('T')[0];

  const maxMonthlyRevenue = analysis
    ? Math.max(...analysis.monthly.map(m => m.revenue), 1)
    : 1;

  const maxDayCount = analysis
    ? Math.max(...analysis.dayOfWeek.map(d => d.count), 1)
    : 1;

  const totalChannelRevenue = analysis
    ? analysis.channels.reduce((s, c) => s + c.revenue, 0) || 1
    : 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                  <p className="text-sm text-gray-600">{t('subtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">{t('community')}:</label>
                <select
                  value={community}
                  onChange={e => setCommunity(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(COMMUNITIES).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                <MapPin className="h-4 w-4 mr-1.5" />
                {t('yourLocation')}
              </h3>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={addressInput}
                    onChange={e => setAddressInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchAddress()}
                    placeholder={t('addressPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchAddress}
                  disabled={geocodeLoading || addressInput.trim().length < 3}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {geocodeLoading ? t('searching') : t('search')}
                </button>
              </div>
              {geocodeResults.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium text-blue-800">{t('selectResult')}</p>
                  {geocodeResults.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectResult(r)}
                      className={`block w-full text-left px-3 py-2 rounded-lg text-sm border transition-colors ${
                        selectedResult === r
                          ? 'border-blue-500 bg-blue-100 text-blue-900'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      {r.display_name}
                      <span className="ml-2 text-xs text-gray-500">
                        {COMMUNITIES[r.community] || r.community}
                      </span>
                    </button>
                  ))}
                  {selectedResult && (
                    <button
                      type="button"
                      onClick={handleSaveZone}
                      disabled={zoneSaving}
                      className="mt-2 text-sm text-blue-700 hover:underline font-medium"
                    >
                      {zoneSaving ? t('saving') : t('saveAsMyZone')}
                    </button>
                  )}
                </div>
              )}
              {(savedZone?.city || savedZone?.address) && (
                <p className="mt-2 text-sm text-blue-800">
                  <span className="font-medium">{t('yourZone')}:</span>{' '}
                  {savedZone.city && savedZone.province
                    ? `${savedZone.city}, ${savedZone.province}`
                    : savedZone.address}
                  {savedZone.community && (
                    <span className="text-blue-600"> · {COMMUNITIES[savedZone.community] || savedZone.community}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {(['calendar', 'analytics', 'events', 'prices'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'calendar' && <CalendarDays className="inline h-4 w-4 mr-1.5" />}
                {tab === 'analytics' && <TrendingUp className="inline h-4 w-4 mr-1.5" />}
                {tab === 'events' && <PartyPopper className="inline h-4 w-4 mr-1.5" />}
                {tab === 'prices' && <DollarSign className="inline h-4 w-4 mr-1.5" />}
                {t(`tabs.${tab}`)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ===================== CALENDAR TAB ===================== */}
        {activeTab === 'calendar' && (
          <div>
            {/* Calendar navigation */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {MONTH_NAMES_ES[calendarMonth]} {calendarYear}
              </h2>
              <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 mb-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-500" /> {t('legend.holiday')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-purple-500" /> {t('legend.event')}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-blue-500" /> {t('legend.today')}
              </span>
            </div>

            {/* Calendar grid */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="grid grid-cols-7">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                  <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                    {d}
                  </div>
                ))}
                {calendarDays.map(({ date, inMonth }, i) => {
                  const dateStr = date.toISOString().split('T')[0];
                  const dayHolidays = holidaysByDate.get(dateStr) || [];
                  const dayEvents = eventsByDate.get(dateStr) || [];
                  const isToday = dateStr === today;
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                  return (
                    <div
                      key={i}
                      className={`min-h-[80px] sm:min-h-[100px] p-1 border-b border-r text-xs ${
                        !inMonth ? 'bg-gray-50 text-gray-300' : isWeekend ? 'bg-amber-50/30' : 'bg-white'
                      } ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}
                    >
                      <div className={`font-medium mb-0.5 ${isToday ? 'text-blue-600 font-bold' : inMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                        {date.getDate()}
                      </div>
                      {dayHolidays.map((h, j) => (
                        <div
                          key={`h-${j}`}
                          className="bg-red-100 text-red-800 rounded px-1 py-0.5 mb-0.5 truncate text-[10px] leading-tight cursor-default"
                          title={`${h.localName} (${h.global ? 'Nacional' : 'Autonómico'})`}
                        >
                          {h.localName}
                        </div>
                      ))}
                      {dayEvents.slice(0, 2).map((ev, j) => (
                        <div
                          key={`e-${j}`}
                          className={`${getCategoryColor(ev.category)} text-white rounded px-1 py-0.5 mb-0.5 truncate text-[10px] leading-tight cursor-pointer`}
                          title={`${ev.title} - ${ev.venue || ''} (Impacto: ${ev.impact_level}/5)`}
                          onClick={() => openEditEvent(ev)}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-gray-400">+{dayEvents.length - 2} {t('more')}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming holidays & events */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Star className="h-5 w-5 text-red-500 mr-2" />
                  {t('upcomingHolidays')}
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {holidays
                    .filter(h => h.date >= today)
                    .slice(0, 10)
                    .map((h, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{h.localName}</p>
                          <p className="text-xs text-gray-500">
                            {h.global ? t('national') : t('regional')}
                          </p>
                        </div>
                        <span className="text-sm text-gray-600 whitespace-nowrap ml-4">
                          {new Date(h.date + 'T00:00:00').toLocaleDateString(locale === 'es' ? 'es-ES' : locale, {
                            day: 'numeric', month: 'short',
                          })}
                        </span>
                      </div>
                    ))}
                  {holidays.filter(h => h.date >= today).length === 0 && (
                    <p className="text-sm text-gray-400">{t('noHolidays')}</p>
                  )}
                <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">
                  {t('holidaysClarification')}
                </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow p-5">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <PartyPopper className="h-5 w-5 text-purple-500 mr-2" />
                    {t('upcomingEvents')}
                  </h3>
                  <button
                    onClick={() => { resetForm(); setEditingEvent(null); setShowEventModal(true); }}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" /> {t('addEvent')}
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {events
                    .filter(e => new Date(e.starts_at) >= new Date())
                    .slice(0, 10)
                    .map(ev => (
                      <div key={ev.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getCategoryColor(ev.category)}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                            <p className="text-xs text-gray-500">{ev.venue || ev.city}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-xs text-gray-600 whitespace-nowrap">
                            {new Date(ev.starts_at).toLocaleDateString(locale === 'es' ? 'es-ES' : locale, {
                              day: 'numeric', month: 'short',
                            })}
                          </span>
                          <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-medium">
                            {ev.impact_level}/5
                          </span>
                        </div>
                      </div>
                    ))}
                  {events.filter(e => new Date(e.starts_at) >= new Date()).length === 0 && (
                    <p className="text-sm text-gray-400">{t('noEvents')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== PRECIOS POR ZONA TAB ===================== */}
        {activeTab === 'prices' && (
          <div>
            <div className="bg-white rounded-xl shadow p-5 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                {t('pricesTab.title')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">{t('pricesTab.description')}</p>
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('pricesTab.zone')}</label>
                  <select
                    value={zoneForPrices}
                    onChange={e => setZoneForPrices(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 min-w-[180px]"
                  >
                    <option value="">{t('pricesTab.selectZone')}</option>
                    {zones.map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('pricesTab.from')}</label>
                  <input
                    type="date"
                    value={priceFrom}
                    onChange={e => setPriceFrom(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('pricesTab.to')}</label>
                  <input
                    type="date"
                    value={priceTo}
                    onChange={e => setPriceTo(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadCompetitorPrices}
                  disabled={competitorPricesLoading || !zoneForPrices.trim() || !priceFrom || !priceTo}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {competitorPricesLoading ? t('pricesTab.loading') : t('pricesTab.showPrices')}
                </button>
              </div>
              {zones.length === 0 && !competitorPricesLoading && (
                <p className="text-sm text-amber-700 mt-3">{t('pricesTab.noZones')}</p>
              )}
            </div>
            {competitorPrices && (
              <div className="bg-white rounded-xl shadow overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <h4 className="font-semibold text-gray-900">{t('pricesTab.resultsFor')} {competitorPrices.meta.zone}</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('pricesTab.avgP40')}: {competitorPrices.meta.avgP40 != null ? formatCurrency(competitorPrices.meta.avgP40) : '-'} · 
                    {t('pricesTab.avgP50')}: {competitorPrices.meta.avgP50 != null ? formatCurrency(competitorPrices.meta.avgP50) : '-'} · 
                    {competitorPrices.meta.totalDays} {t('pricesTab.days')} · 
                    {t('pricesTab.sampleSize')} ~{competitorPrices.meta.avgSampleSize}
                  </p>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">{t('pricesTab.date')}</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-700">P25</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-700">P40</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-700">P50</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-700">P75</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-700">{t('pricesTab.n')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {competitorPrices.data.map((row, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-900">
                            {new Date(row.date + 'T00:00:00').toLocaleDateString(locale === 'es' ? 'es-ES' : locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                          </td>
                          <td className="px-4 py-2 text-right">{row.p25 != null ? formatCurrency(row.p25) : '-'}</td>
                          <td className="px-4 py-2 text-right font-medium">{row.p40 != null ? formatCurrency(row.p40) : '-'}</td>
                          <td className="px-4 py-2 text-right">{row.p50 != null ? formatCurrency(row.p50) : '-'}</td>
                          <td className="px-4 py-2 text-right">{row.p75 != null ? formatCurrency(row.p75) : '-'}</td>
                          <td className="px-4 py-2 text-right text-gray-500">{row.sampleSize ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 p-4 border-t bg-gray-50">
                  {t('holidaysClarification')}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ===================== ANALYTICS TAB ===================== */}
        {activeTab === 'analytics' && analysis && (
          <div>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('kpi.revenue')}</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(analysis.summary.totalRevenue)}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('kpi.reservations')}</p>
                    <p className="text-lg font-bold text-gray-900">{analysis.summary.totalReservations}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Percent className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('kpi.occupancy')}</p>
                    <p className="text-lg font-bold text-gray-900">{analysis.summary.occupancyRate}%</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <BedDouble className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{t('kpi.avgPrice')}</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(analysis.summary.avgPricePerNight)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{analysis.summary.avgNights}</p>
                <p className="text-xs text-gray-500">{t('kpi.avgNights')}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{analysis.summary.roomCount}</p>
                <p className="text-xs text-gray-500">{t('kpi.rooms')}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{analysis.summary.cancelledCount}</p>
                <p className="text-xs text-gray-500">{t('kpi.cancelled')}</p>
              </div>
            </div>

            {/* Monthly Revenue Chart */}
            <div className="bg-white rounded-xl shadow p-5 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('monthlyRevenue')}</h3>
              <div className="flex items-end gap-2 h-48">
                {analysis.monthly.map((m, i) => {
                  const pct = (m.revenue / maxMonthlyRevenue) * 100;
                  const monthLabel = new Date(m.month + '-01').toLocaleDateString(locale === 'es' ? 'es-ES' : locale, { month: 'short' });
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                      <div className="relative w-full flex justify-center">
                        <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-gray-700 bg-white shadow px-2 py-1 rounded whitespace-nowrap z-10">
                          {formatCurrency(m.revenue)} · {m.reservations} res.
                        </div>
                      </div>
                      <div
                        className="w-full max-w-[40px] bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                        style={{ height: `${Math.max(pct, 2)}%` }}
                      />
                      <span className="text-[10px] text-gray-500 mt-1 capitalize">{monthLabel}</span>
                    </div>
                  );
                })}
                {analysis.monthly.length === 0 && (
                  <p className="text-sm text-gray-400 m-auto">{t('noData')}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Channel Breakdown */}
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('channelBreakdown')}</h3>
                <div className="space-y-3">
                  {analysis.channels.map((ch, i) => {
                    const pct = (ch.revenue / totalChannelRevenue) * 100;
                    const colors = ['bg-blue-500', 'bg-orange-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'];
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700 capitalize">{ch.channel}</span>
                          <span className="text-gray-500">{formatCurrency(ch.revenue)} ({ch.count})</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`${colors[i % colors.length]} h-2 rounded-full transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {analysis.channels.length === 0 && (
                    <p className="text-sm text-gray-400">{t('noData')}</p>
                  )}
                </div>
              </div>

              {/* Day of Week */}
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('dayOfWeek')}</h3>
                <div className="flex items-end gap-3 h-40">
                  {analysis.dayOfWeek.map((d, i) => {
                    const pct = (d.count / maxDayCount) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                        <span className="text-xs font-medium text-gray-700 mb-1">{d.count}</span>
                        <div
                          className={`w-full rounded-t transition-all ${
                            d.dayIndex === 5 || d.dayIndex === 6 ? 'bg-orange-400' : 'bg-teal-500'
                          }`}
                          style={{ height: `${Math.max(pct, 4)}%` }}
                        />
                        <span className="text-[10px] text-gray-500 mt-1">{d.day}</span>
                      </div>
                    );
                  })}
                  {analysis.dayOfWeek.length === 0 && (
                    <p className="text-sm text-gray-400 m-auto">{t('noData')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Room Performance */}
            {analysis.roomPerformance.length > 0 && (
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('roomPerformance')}</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-medium text-gray-500 uppercase">
                        <th className="pb-3">{t('room')}</th>
                        <th className="pb-3 text-right">{t('reservationsCol')}</th>
                        <th className="pb-3 text-right">{t('revenueCol')}</th>
                        <th className="pb-3 text-right">{t('avgPriceCol')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {analysis.roomPerformance.map((r, i) => (
                        <tr key={i}>
                          <td className="py-2 font-medium text-gray-900">{r.roomName || '-'}</td>
                          <td className="py-2 text-right text-gray-600">{r.reservations}</td>
                          <td className="py-2 text-right text-gray-600">{formatCurrency(r.revenue)}</td>
                          <td className="py-2 text-right text-gray-600">{formatCurrency(r.avgPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && !analysis && (
          <div className="text-center py-16">
            <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('noData')}</p>
          </div>
        )}

        {/* ===================== EVENTS TAB ===================== */}
        {activeTab === 'events' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">{t('manageEvents')}</h2>
              <button
                onClick={() => { resetForm(); setEditingEvent(null); setShowEventModal(true); }}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <Plus className="h-4 w-4 mr-2" /> {t('addEvent')}
              </button>
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap gap-2 mb-4">
              {EVENT_CATEGORIES.map(cat => {
                const count = events.filter(e => e.category === cat.value).length;
                return (
                  <span
                    key={cat.value}
                    className={`text-xs px-2.5 py-1 rounded-full text-white ${cat.color} ${count === 0 ? 'opacity-40' : ''}`}
                  >
                    {cat.label} ({count})
                  </span>
                );
              })}
            </div>

            {/* Events list */}
            <div className="space-y-3">
              {events.length === 0 && (
                <div className="text-center py-16 bg-white rounded-xl shadow">
                  <PartyPopper className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">{t('noEventsYet')}</p>
                  <p className="text-sm text-gray-400">{t('addEventsHelp')}</p>
                </div>
              )}
              {events.map(ev => (
                <div key={ev.id} className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
                  <div className={`w-1.5 h-14 rounded-full flex-shrink-0 ${getCategoryColor(ev.category)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 truncate">{ev.title}</h4>
                      <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                        {t('impact')} {ev.impact_level}/5
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(ev.starts_at).toLocaleDateString(locale === 'es' ? 'es-ES' : locale, {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                        {ev.ends_at && ` - ${new Date(ev.ends_at).toLocaleDateString(locale === 'es' ? 'es-ES' : locale, {
                          day: 'numeric', month: 'short',
                        })}`}
                      </span>
                      {ev.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {ev.venue}
                        </span>
                      )}
                      {ev.city && (
                        <span>{ev.city}</span>
                      )}
                    </div>
                    {ev.description && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{ev.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEditEvent(ev)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tip section */}
            <div className="mt-8 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <strong>{t('pricesNoteTitle')}</strong> {t('pricesNoteBody')}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <h4 className="font-medium text-blue-900 mb-2">{t('tipTitle')}</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• {t('tip1')}</li>
                  <li>• {t('tip2')}</li>
                  <li>• {t('tip3')}</li>
                  <li>• {t('tip4')}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===================== EVENT MODAL ===================== */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingEvent ? t('editEvent') : t('newEvent')}
              </h3>
              <button onClick={() => { setShowEventModal(false); setEditingEvent(null); }} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.title')} *</label>
                <input
                  type="text"
                  value={eventForm.title}
                  onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={t('form.titlePlaceholder')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.startDate')} *</label>
                  <input
                    type="datetime-local"
                    value={eventForm.startsAt}
                    onChange={e => setEventForm(f => ({ ...f, startsAt: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.endDate')}</label>
                  <input
                    type="datetime-local"
                    value={eventForm.endsAt}
                    onChange={e => setEventForm(f => ({ ...f, endsAt: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.category')}</label>
                  <select
                    value={eventForm.category}
                    onChange={e => setEventForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {EVENT_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.impact')}</label>
                  <select
                    value={eventForm.impactLevel}
                    onChange={e => setEventForm(f => ({ ...f, impactLevel: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {IMPACT_LEVELS.map(l => (
                      <option key={l.value} value={l.value}>{l.value}/5 - {l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.venue')}</label>
                  <input
                    type="text"
                    value={eventForm.venue}
                    onChange={e => setEventForm(f => ({ ...f, venue: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('form.venuePlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.city')}</label>
                  <input
                    type="text"
                    value={eventForm.city}
                    onChange={e => setEventForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('form.cityPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.description')}</label>
                <textarea
                  value={eventForm.description}
                  onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder={t('form.descriptionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.url')}</label>
                <input
                  type="url"
                  value={eventForm.url}
                  onChange={e => setEventForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button
                onClick={() => { setShowEventModal(false); setEditingEvent(null); }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={!eventForm.title || !eventForm.startsAt}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {editingEvent ? t('saveChanges') : t('createEvent')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
