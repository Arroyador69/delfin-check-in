'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { ArrowUpCircle, Loader2 } from 'lucide-react';

type PlanId = 'checkin' | 'standard' | 'pro';

const PAID_PLANS: PlanId[] = ['checkin', 'standard', 'pro'];

export interface PriceQuotePayload {
  planId: PlanId;
  roomCount: number;
  isYearly: boolean;
  subtotalExVat: number;
  totalWithVat: number;
}

interface DynamicPriceCalculatorProps {
  /** Habitaciones/unidades (misma lógica que «Mejorar plan»). */
  currentRoomCount?: number;
  /** Plan preseleccionado en la calculadora. */
  defaultPlanId?: PlanId;
  className?: string;
  /** Si es false, se oculta el enlace a «Mejorar plan» (p. ej. en checkout-rooms). */
  showGoToUpgrade?: boolean;
  /** Recibe la cotización cuando cambia plan, unidades o período. */
  onQuoteChange?: (quote: PriceQuotePayload) => void;
}

export default function DynamicPriceCalculator({
  currentRoomCount = 2,
  defaultPlanId = 'standard',
  className = '',
  showGoToUpgrade = true,
  onQuoteChange,
}: DynamicPriceCalculatorProps) {
  const t = useTranslations('settings.billing.calculator');
  const tPlans = useTranslations('plans');
  const locale = useLocale();

  const [planId, setPlanId] = useState<PlanId>(() =>
    PAID_PLANS.includes(defaultPlanId) ? defaultPlanId : 'standard'
  );
  const [roomCount, setRoomCount] = useState(() => Math.max(1, currentRoomCount));
  const [isYearly, setIsYearly] = useState(false);
  const [pricing, setPricing] = useState<{
    base_price: number;
    extra_rooms?: number;
    extra_rooms_price?: number;
    subtotal: number;
    vat?: { vat_rate?: number; vat_amount?: number };
    vat_rate?: number;
    vat_amount?: number;
    total: number;
    interval?: string;
    yearly_discount_rate?: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRoomCount(Math.max(1, currentRoomCount));
  }, [currentRoomCount]);

  useEffect(() => {
    if (PAID_PLANS.includes(defaultPlanId)) {
      setPlanId(defaultPlanId);
    }
  }, [defaultPlanId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const interval = isYearly ? 'year' : 'month';
        const res = await fetch(
          `/api/plans/calculate-price?planId=${planId}&roomCount=${roomCount}&interval=${interval}`
        );
        const data = await res.json();
        if (!cancelled && data.success) {
          setPricing(data.pricing);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planId, roomCount, isYearly]);

  const money = (v: unknown) => Number(v ?? 0);

  useEffect(() => {
    if (!pricing || !onQuoteChange) {
      return;
    }
    onQuoteChange({
      planId,
      roomCount,
      isYearly,
      subtotalExVat: money(pricing.subtotal),
      totalWithVat: money(pricing.total),
    });
  }, [pricing, planId, roomCount, isYearly, onQuoteChange]);

  const planButtonClass = (id: PlanId) =>
    `px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
      planId === id
        ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
    }`;

  const planName = (id: PlanId) => {
    if (id === 'checkin') return tPlans('checkinPlanName');
    if (id === 'standard') return tPlans('standardPlanName');
    return tPlans('proPlanName');
  };

  const vatRate = pricing
    ? money(pricing.vat?.vat_rate ?? pricing.vat_rate ?? 21)
    : 21;
  const vatAmount = pricing
    ? money(pricing.vat?.vat_amount ?? pricing.vat_amount)
    : 0;

  return (
    <div
      className={`bg-white rounded-xl shadow-lg p-6 border border-gray-200 ${className}`}
    >
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          {t('choosePlan')}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PAID_PLANS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setPlanId(id)}
              className={planButtonClass(id)}
            >
              {planName(id)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          🏠 {tPlans('numberOfRooms')}
        </label>
        <div className="relative flex items-center justify-center space-x-4">
          <button
            type="button"
            onClick={() => setRoomCount(Math.max(1, roomCount - 1))}
            disabled={roomCount <= 1}
            className="w-12 h-12 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center font-bold text-xl shadow-md"
          >
            −
          </button>
          <input
            type="number"
            value={roomCount}
            onChange={(e) =>
              setRoomCount(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            min={1}
            className="w-24 h-16 text-center text-2xl font-bold text-blue-600 border-2 border-blue-500 rounded-xl focus:ring-4 focus:ring-blue-300 focus:outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => setRoomCount(roomCount + 1)}
            className="w-12 h-12 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center font-bold text-xl shadow-md"
          >
            +
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center max-w-md mx-auto">
          {tPlans('roomsIncludedHint', { count: 1 })}{' '}
          {tPlans('extraPerRoom', { price: 2 })}
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-900 mb-3">
          📅 {t('planType')}
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsYearly(false)}
            className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
              !isYearly
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-md'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            💳 {t('monthly')}
          </button>
          <button
            type="button"
            onClick={() => setIsYearly(true)}
            className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 ${
              isYearly
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold shadow-md'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            🎯 {t('yearly')}
          </button>
        </div>
        {isYearly && pricing?.yearly_discount_rate != null && (
          <p className="text-xs text-green-600 mt-2 font-medium">
            ✓{' '}
            {t('annualDiscountHint', {
              percent: Math.round(money(pricing.yearly_discount_rate) * 100),
            })}
          </p>
        )}
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
        {!loading && pricing && (
          <div className="text-center">
            <div className="text-4xl font-black text-blue-600 mb-2">
              {money(pricing.total).toFixed(2)}€
            </div>
            <div className="text-sm text-gray-600 mb-4">
              {isYearly ? t('perYear') : t('perMonth')}{' '}
              <span className="text-xs text-gray-500">{t('vatIncluded')}</span>
            </div>
            <div className="text-sm text-gray-700 space-y-2 text-left max-w-sm mx-auto border-t border-blue-200 pt-4">
              <div className="flex justify-between">
                <span>{tPlans('basePrice')}</span>
                <span className="font-medium">{money(pricing.base_price).toFixed(2)}€</span>
              </div>
              {money(pricing.extra_rooms_price) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>
                    {tPlans('extraRooms', { count: pricing.extra_rooms || 0 })}
                  </span>
                  <span>+{money(pricing.extra_rooms_price).toFixed(2)}€</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{tPlans('subtotal')}</span>
                <span className="font-medium">{money(pricing.subtotal).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>{tPlans('vat', { rate: vatRate })}</span>
                <span>+{vatAmount.toFixed(2)}€</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {showGoToUpgrade && (
        <Link
          href={`/${locale}/upgrade-plan`}
          className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 px-6 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
        >
          <ArrowUpCircle className="w-6 h-6" />
          <span>{t('goToUpgrade')}</span>
        </Link>
      )}
    </div>
  );
}
