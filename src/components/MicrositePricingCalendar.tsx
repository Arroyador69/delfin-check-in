'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toIntlDateLocale, type Locale as AppLocale } from '@/i18n/config';
import { formatDateYmdLocal } from '@/lib/date-ymd';
import { ChevronLeft, ChevronRight, Euro, RefreshCw } from 'lucide-react';

type DayRow = {
  date: string;
  price: number | null;
  effective_price: number;
  is_override: boolean;
};

function formatYmd(d: Date): string {
  return formatDateYmdLocal(d);
}

function monthBounds(view: Date): { from: string; to: string } {
  const start = new Date(view.getFullYear(), view.getMonth(), 1);
  const end = new Date(view.getFullYear(), view.getMonth() + 1, 0);
  return { from: formatYmd(start), to: formatYmd(end) };
}

interface MicrositePricingCalendarProps {
  propertyId: number;
  tenantId: string;
  basePrice: number;
}

export default function MicrositePricingCalendar({
  propertyId,
  tenantId,
  basePrice,
}: MicrositePricingCalendarProps) {
  const t = useTranslations('settings.properties.micrositePricing');
  const locale = useLocale();
  const [viewMonth, setViewMonth] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [days, setDays] = useState<DayRow[]>([]);
  const [loadedBase, setLoadedBase] = useState(basePrice);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayPriceInput, setDayPriceInput] = useState('');

  const [ruleFrom, setRuleFrom] = useState('');
  const [ruleTo, setRuleTo] = useState('');
  const [weekdayPrice, setWeekdayPrice] = useState('');
  const [weekendPrice, setWeekendPrice] = useState('');
  const [seasonPrice, setSeasonPrice] = useState('');

  const headers = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

  const loadPrices = useCallback(async () => {
    const { from, to } = monthBounds(viewMonth);
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/tenant/property-prices?property_id=${propertyId}&from=${from}&to=${to}`,
        { headers: tenantId ? { 'x-tenant-id': tenantId } : undefined }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al cargar precios');
      }
      setDays(data.days || []);
      setLoadedBase(Number(data.base_price) || basePrice);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de red');
    } finally {
      setLoading(false);
    }
  }, [viewMonth, propertyId, tenantId, basePrice]);

  useEffect(() => {
    void loadPrices();
  }, [loadPrices]);

  const priceByDate = useMemo(() => {
    const m = new Map<string, DayRow>();
    days.forEach((d) => m.set(d.date, d));
    return m;
  }, [days]);

  const calendarCells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = (first.getDay() + 6) % 7;
    const cells: Array<{ date: string | null; inMonth: boolean }> = [];
    for (let i = 0; i < startPad; i++) cells.push({ date: null, inMonth: false });
    for (let d = 1; d <= last.getDate(); d++) {
      const dt = new Date(year, month, d);
      cells.push({ date: formatYmd(dt), inMonth: true });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, inMonth: false });
    return cells;
  }, [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString(toIntlDateLocale(locale as AppLocale), {
    month: 'long',
    year: 'numeric',
  });

  const postPrices = async (body: Record<string, unknown>) => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/tenant/property-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tenantId ? { 'x-tenant-id': tenantId } : {}),
        },
        body: JSON.stringify({ property_id: propertyId, ...body }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al guardar');
      }
      await loadPrices();
      setMessage(t('saved'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const applyWeekdayWeekend = () => {
    const from = ruleFrom.trim();
    const to = ruleTo.trim();
    const wd = parseFloat(weekdayPrice);
    const we = parseFloat(weekendPrice);
    if (!from || !to || from > to || !Number.isFinite(wd) || wd <= 0 || !Number.isFinite(we) || we <= 0) {
      setError(t('invalidRule'));
      return;
    }
    void postPrices({
      action: 'weekday_weekend',
      from,
      to,
      weekday_price: wd,
      weekend_price: we,
    });
  };

  const applySeason = () => {
    const from = ruleFrom.trim();
    const to = ruleTo.trim();
    const p = parseFloat(seasonPrice);
    if (!from || !to || from > to || !Number.isFinite(p) || p <= 0) {
      setError(t('invalidRule'));
      return;
    }
    void postPrices({ action: 'range', from, to, price: p });
  };

  const clearSeason = () => {
    const from = ruleFrom.trim();
    const to = ruleTo.trim();
    if (!from || !to || from > to) {
      setError(t('invalidRule'));
      return;
    }
    if (!confirm(t('clearConfirm'))) return;
    void postPrices({ action: 'range', from, to, price: null });
  };

  const saveSelectedDay = () => {
    if (!selectedDate) return;
    const p = parseFloat(dayPriceInput);
    if (!Number.isFinite(p) || p <= 0) {
      setError(t('invalidDayPrice'));
      return;
    }
    void postPrices({ action: 'single_day', date: selectedDate, price: p });
    setSelectedDate(null);
  };

  const resetSelectedDay = () => {
    if (!selectedDate) return;
    void postPrices({ action: 'single_day', date: selectedDate, price: null });
    setSelectedDate(null);
  };

  const openDay = (date: string) => {
    const row = priceByDate.get(date);
    setSelectedDate(date);
    setDayPriceInput(
      row?.is_override ? String(row.effective_price) : String(loadedBase || basePrice)
    );
    setMessage('');
    setError('');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-blue-200 bg-blue-50/80 p-3 text-sm text-blue-900">
        {t('notice')}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          {t('basePriceHint')}{' '}
          <strong className="text-gray-900">{loadedBase || basePrice} €</strong> / {t('perNight')}
        </p>
        <button
          type="button"
          onClick={() => void loadPrices()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </button>
      </div>

      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() =>
            setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
          }
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          aria-label={t('prevMonth')}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-gray-900 capitalize min-w-[10rem] text-center">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() =>
            setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
          }
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
          aria-label={t('nextMonth')}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-600 mb-1">
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-white border border-gray-300" />
          {t('legendBase')}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-100 border border-blue-400" />
          {t('legendCustom')}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white p-2 sm:p-3">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[280px]">
          {headers.map((h) => (
            <div key={h} className="text-center text-xs font-bold text-gray-500 py-1">
              {t(`weekday.${h}`)}
            </div>
          ))}
          {calendarCells.map((cell, idx) => {
            if (!cell.date) {
              return <div key={`empty-${idx}`} className="min-h-[52px] rounded-lg bg-gray-50" />;
            }
            const row = priceByDate.get(cell.date);
            const isCustom = row?.is_override;
            const price = row?.effective_price ?? loadedBase ?? basePrice;
            const isSelected = selectedDate === cell.date;
            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => openDay(cell.date!)}
                className={`min-h-[52px] rounded-lg border p-1 text-left transition-all hover:ring-2 hover:ring-blue-300 ${
                  isSelected
                    ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50'
                    : isCustom
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-gray-200'
                }`}
              >
                <div className="text-[10px] sm:text-xs font-semibold text-gray-600">
                  {parseInt(cell.date.slice(8), 10)}
                </div>
                <div
                  className={`text-[10px] sm:text-xs font-bold mt-0.5 ${
                    isCustom ? 'text-blue-800' : 'text-gray-500'
                  }`}
                >
                  {price}€
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="rounded-xl border border-blue-300 bg-blue-50/50 p-4 space-y-3">
          <p className="font-semibold text-gray-900">
            {t('editDay')}: {selectedDate}
          </p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {t('priceEuro')}
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={dayPriceInput}
                onChange={(e) => setDayPriceInput(e.target.value)}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={saveSelectedDay}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? t('saving') : t('saveDay')}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={resetSelectedDay}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              {t('useBasePrice')}
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-sm text-gray-500 hover:underline"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/50">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <Euro className="w-4 h-4 text-blue-600" />
            {t('weekdayWeekendTitle')}
          </h4>
          <p className="text-xs text-gray-600">{t('weekdayWeekendHint')}</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-medium text-gray-700">{t('weekdayPrice')}</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={weekdayPrice}
                onChange={(e) => setWeekdayPrice(e.target.value)}
                className="w-full mt-1 px-2 py-2 border rounded-lg text-sm"
                placeholder="80"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">{t('weekendPrice')}</label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={weekendPrice}
                onChange={(e) => setWeekendPrice(e.target.value)}
                className="w-full mt-1 px-2 py-2 border rounded-lg text-sm"
                placeholder="120"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={applyWeekdayWeekend}
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {t('applyWeekdayWeekend')}
          </button>
        </div>

        <div className="rounded-xl border border-gray-200 p-4 space-y-3 bg-gray-50/50">
          <h4 className="font-semibold text-gray-900">{t('seasonTitle')}</h4>
          <p className="text-xs text-gray-600">{t('seasonHint')}</p>
          <div>
            <label className="text-xs font-medium text-gray-700">{t('samePriceAllDays')}</label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={seasonPrice}
              onChange={(e) => setSeasonPrice(e.target.value)}
              className="w-full mt-1 px-2 py-2 border rounded-lg text-sm"
            />
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={applySeason}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {t('applySeason')}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 space-y-3">
        <h4 className="font-semibold text-gray-900">{t('rangeTitle')}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700">{t('from')}</label>
            <input
              type="date"
              value={ruleFrom}
              onChange={(e) => setRuleFrom(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">{t('to')}</label>
            <input
              type="date"
              value={ruleTo}
              onChange={(e) => setRuleTo(e.target.value)}
              className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">{t('rangeHint')}</p>
        <button
          type="button"
          disabled={saving}
          onClick={clearSeason}
          className="text-sm text-red-700 hover:underline disabled:opacity-50"
        >
          {t('clearRangeOverrides')}
        </button>
      </div>

      {message && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
