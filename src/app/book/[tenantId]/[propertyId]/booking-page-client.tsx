'use client';

import { useState, useEffect, use } from 'react';
import { Users, Euro, CreditCard, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { TenantProperty } from '@/lib/direct-reservations-types';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { type BookGuestStrings, bookFmt, getBookStrings } from '@/lib/book-guest-i18n';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface BookingPageClientProps {
  params: Promise<{
    tenantId: string;
    propertyId: string;
  }>;
}

function PaymentForm({
  tenantId,
  propertyId,
  formData,
  pricing,
  property,
  s,
  onBack,
  onSuccess,
}: {
  tenantId: string;
  propertyId: string;
  formData: Record<string, unknown>;
  pricing: { nights?: number; total_amount?: number; reservation_code?: string } | null;
  property: TenantProperty;
  s: BookGuestStrings;
  onBack: () => void;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error(s.errCardNotFound);
      }

      const response = await fetch('/api/direct-reservations/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: parseInt(propertyId, 10),
          ...formData,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || s.errCreatePayment);
      }

      const { error: confirmError } = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: String(formData.guest_name ?? ''),
            email: String(formData.guest_email ?? ''),
          },
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message || s.errProcessPayment);
      }

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : s.errProcessPayment;
      setError(msg);
    } finally {
      setProcessing(false);
    }
  };

  const totalStr =
    pricing?.total_amount != null ? String(pricing.total_amount) : '—';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">{s.payTitle}</h2>

      {pricing && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">{s.bookingSummary}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{s.property}</span>
              <span>{property.property_name}</span>
            </div>
            <div className="flex justify-between">
              <span>{s.dates}</span>
              <span>
                {String(formData.check_in_date)} — {String(formData.check_out_date)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{s.guests}</span>
              <span>{String(formData.guests)}</span>
            </div>
            <div className="flex justify-between">
              <span>{s.nights}</span>
              <span>{pricing.nights}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>{s.total}</span>
              <span>{totalStr}€</span>
            </div>
          </div>
        </div>
      )}

      <div className="border border-gray-300 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">{s.cardLabel}</label>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
        >
          {s.back}
        </button>
        <button
          type="submit"
          disabled={processing || !stripe}
          className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              {s.processing}
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              {bookFmt(s.payWith, { amount: totalStr })}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function MonthGrid({
  month,
  blocked,
  selectedStart,
  selectedEnd,
  onSelect,
  s,
}: {
  month: Date;
  blocked: Set<string>;
  selectedStart?: string;
  selectedEnd?: string;
  onSelect: (iso: string) => void;
  s: BookGuestStrings;
}) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startWeekday = (start.getDay() + 6) % 7;
  const daysInMonth = end.getDate();
  const cells: Array<{
    d: Date | null;
    iso?: string;
    disabled?: boolean;
    inRange?: boolean;
    isStart?: boolean;
    isEnd?: boolean;
  }> = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ d: null });
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(month.getFullYear(), month.getMonth(), day);
    const iso = d.toISOString().split('T')[0];
    const disabled = blocked.has(iso) || iso < new Date().toISOString().split('T')[0];
    const inRange = selectedStart && selectedEnd && iso > selectedStart && iso < selectedEnd;
    const isStart = selectedStart === iso;
    const isEnd = selectedEnd === iso;
    cells.push({ d, iso, disabled, inRange, isStart, isEnd });
  }
  return (
    <div className="border rounded-lg p-3">
      <div className="grid grid-cols-7 text-center text-xs text-gray-500 mb-2">
        {s.weekdays.map((w, idx) => (
          <div key={`${month.getFullYear()}-${month.getMonth()}-w${idx}`}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <button
            key={i}
            type="button"
            disabled={!c.d || c.disabled}
            onClick={() => c.iso && onSelect(c.iso)}
            className={[
              'h-9 rounded-md text-sm',
              !c.d ? 'invisible' : '',
              c.disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'hover:bg-blue-50',
              c.isStart || c.isEnd ? 'bg-blue-600 text-white' : '',
              c.inRange ? 'bg-blue-100' : '',
            ].join(' ')}
          >
            {c.d?.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
}

function DateRangePicker({
  blockedDates,
  onChange,
  initialCheckIn,
  initialCheckOut,
  s,
  localeStr,
}: {
  blockedDates: Set<string>;
  onChange: (checkIn: string, checkOut: string) => void;
  initialCheckIn?: string;
  initialCheckOut?: string;
  s: BookGuestStrings;
  localeStr: string;
}) {
  const [monthLeft, setMonthLeft] = useState<Date>(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [monthRight, setMonthRight] = useState<Date>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    return d;
  });
  const [checkIn, setCheckIn] = useState<string>(initialCheckIn || '');
  const [checkOut, setCheckOut] = useState<string>(initialCheckOut || '');

  const hasBlockedInRange = (a: string, b: string) => {
    if (!a || !b) return false;
    const start = new Date(a);
    const end = new Date(b);
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().split('T')[0];
      if (blockedDates.has(iso)) return true;
    }
    return false;
  };

  const handleSelect = (iso: string) => {
    if (!checkIn || (checkIn && checkOut)) {
      if (blockedDates.has(iso)) return;
      setCheckIn(iso);
      setCheckOut('');
      onChange(iso, '');
      return;
    }
    if (iso <= checkIn) return;
    if (hasBlockedInRange(checkIn, iso)) {
      alert(s.blockedInRange);
      return;
    }
    setCheckOut(iso);
    onChange(checkIn, iso);
  };

  const prev = () => {
    const l = new Date(monthLeft);
    l.setMonth(l.getMonth() - 1);
    const r = new Date(monthRight);
    r.setMonth(r.getMonth() - 1);
    setMonthLeft(l);
    setMonthRight(r);
  };
  const next = () => {
    const l = new Date(monthLeft);
    l.setMonth(l.getMonth() + 1);
    const r = new Date(monthRight);
    r.setMonth(r.getMonth() + 1);
    setMonthLeft(l);
    setMonthRight(r);
  };

  const m1 = monthLeft.toLocaleString(localeStr, { month: 'long', year: 'numeric' });
  const m2 = monthRight.toLocaleString(localeStr, { month: 'long', year: 'numeric' });
  const monthTitle = bookFmt(s.monthTitle, { m1, m2 });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={prev} className="p-2 rounded hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-sm font-medium text-gray-700 capitalize">{monthTitle}</div>
        <button type="button" onClick={next} className="p-2 rounded hover:bg-gray-100">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <MonthGrid
          month={monthLeft}
          blocked={blockedDates}
          selectedStart={checkIn}
          selectedEnd={checkOut}
          onSelect={handleSelect}
          s={s}
        />
        <MonthGrid
          month={monthRight}
          blocked={blockedDates}
          selectedStart={checkIn}
          selectedEnd={checkOut}
          onSelect={handleSelect}
          s={s}
        />
      </div>
      <div className="mt-3 text-sm text-gray-600">
        {checkIn ? (
          <div>
            {s.selectedRange}{' '}
            <span className="font-medium">{checkIn}</span>
            {checkOut && (
              <>
                {' '}
                → <span className="font-medium">{checkOut}</span>
              </>
            )}
          </div>
        ) : (
          <div>{s.selectCheckIn}</div>
        )}
      </div>
    </div>
  );
}

export default function BookingPageClient({ params }: BookingPageClientProps) {
  const resolvedParams = use(params);
  const { tenantId, propertyId } = resolvedParams;
  const s = getBookStrings();
  const localeStr = 'es-ES';

  const [property, setProperty] = useState<TenantProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    check_in_date: '',
    check_out_date: '',
    guests: 1,
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guest_document_type: 'NIF',
    guest_document_number: '',
    guest_nationality: 'España',
    special_requests: '',
  });
  const [pricing, setPricing] = useState<{
    nights?: number;
    total_amount?: number;
    extra_guests?: number;
    extra_guest_fee?: number;
    extra_guests_amount?: number;
    reservation_code?: string;
  } | null>(null);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [availabilityInfo, setAvailabilityInfo] = useState<{ from: string; to: string } | null>(
    null
  );

  useEffect(() => {
    if (propertyId && tenantId) {
      loadProperty();
    }
  }, [propertyId, tenantId]);

  const loadProperty = async () => {
    try {
      const response = await fetch(
        `/api/public/properties/${propertyId}?tenant_id=${tenantId}`
      );
      const data = await response.json();

      if (data.success) {
        setProperty(data.property);
        const from = new Date();
        const to = new Date();
        to.setMonth(to.getMonth() + 12);
        const fromStr = from.toISOString().split('T')[0];
        const toStr = to.toISOString().split('T')[0];
        try {
          const calRes = await fetch(
            `/api/public/availability-calendar?property_id=${propertyId}&from=${fromStr}&to=${toStr}`
          );
          const cal = await calRes.json();
          if (cal.success && Array.isArray(cal.blockedDates)) {
            setBlockedDates(new Set(cal.blockedDates));
            setAvailabilityInfo({ from: fromStr, to: toStr });
          }
        } catch {
          /* ignore */
        }
      } else {
        console.error('Error cargando propiedad:', data.error);
      }
    } catch (error) {
      console.error('Error cargando propiedad:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePricing = async () => {
    if (!formData.check_in_date || !formData.check_out_date) return;

    try {
      const response = await fetch('/api/public/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: parseInt(propertyId, 10),
          check_in_date: formData.check_in_date,
          check_out_date: formData.check_out_date,
          guests: formData.guests,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPricing(data.pricing);
      }
    } catch (error) {
      console.error('Error calculando precios:', error);
    }
  };

  useEffect(() => {
    if (formData.check_in_date && formData.check_out_date) {
      calculatePricing();
    }
  }, [formData.check_in_date, formData.check_out_date, formData.guests]);

  const handlePaymentSuccess = () => {
    setStep(5);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{s.notFoundTitle}</h1>
          <p className="text-gray-600">{s.notFoundBody}</p>
        </div>
      </div>
    );
  }

  const included = property.included_guests ?? Math.min(2, property.max_guests);
  const guestPlEs = included > 1 ? 'es' : '';
  const includesLine = bookFmt(s.includesGuests, {
    n: included,
    pl: guestPlEs,
    fee: property.extra_guest_fee ?? 0,
  });

  const stepClass = (n: number) =>
    `w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
      step >= n ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.property_name}</h1>
          {property.description && <p className="text-gray-600 mb-4">{property.description}</p>}

          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {property.max_guests} {s.maxGuests}
            </div>
            <div className="flex items-center gap-1">
              <Euro className="w-4 h-4" />
              {property.base_price}
              {s.perNight}
            </div>
          </div>
          {(property.extra_guest_fee ?? 0) > 0 && (
            <div className="mt-2 text-xs text-gray-500">{includesLine}</div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-wrap items-center gap-2 mb-6 text-sm md:text-base">
            <div className={stepClass(1)}>1</div>
            <span className="font-medium">{s.stepDates}</span>
            <div className={`${stepClass(2)} ml-2 md:ml-4`}>2</div>
            <span className="font-medium">{s.stepGuests}</span>
            <div className={`${stepClass(3)} ml-2 md:ml-4`}>3</div>
            <span className="font-medium">{s.stepDetails}</span>
            <div className={`${stepClass(4)} ml-2 md:ml-4`}>4</div>
            <span className="font-medium">{s.stepPayment}</span>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">{s.selectDates}</h2>

              <DateRangePicker
                blockedDates={blockedDates}
                onChange={(ci, co) =>
                  setFormData({ ...formData, check_in_date: ci, check_out_date: co })
                }
                initialCheckIn={formData.check_in_date}
                initialCheckOut={formData.check_out_date}
                s={s}
                localeStr={localeStr}
              />

              {availabilityInfo && (
                <p className="text-xs text-gray-500">
                  {bookFmt(s.availabilityHint, {
                    from: availabilityInfo.from,
                    to: availabilityInfo.to,
                  })}
                </p>
              )}

              {pricing && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">{s.priceSummary}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>
                        {bookFmt(s.nightsX, {
                          n: pricing.nights ?? 0,
                          price: property.base_price,
                        })}
                      </span>
                      <span>
                        {((pricing.nights ?? 0) * Number(property.base_price)).toFixed(2)}€
                      </span>
                    </div>
                    {pricing.extra_guests && Number(pricing.extra_guests) > 0 && (
                      <div className="flex justify-between">
                        <span>
                          {bookFmt(s.extraPersonLine, {
                            n: pricing.extra_guests,
                            pl: Number(pricing.extra_guests) > 1 ? 's' : '',
                            nights: pricing.nights ?? 0,
                            fee: pricing.extra_guest_fee ?? property.extra_guest_fee ?? 0,
                          })}
                        </span>
                        <span>{pricing.extra_guests_amount}€</span>
                      </div>
                    )}
                    {property.cleaning_fee > 0 && (
                      <div className="flex justify-between">
                        <span>{s.cleaningFee}</span>
                        <span>{property.cleaning_fee}€</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>{s.total}</span>
                      <span>{pricing.total_amount}€</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!formData.check_in_date || !formData.check_out_date}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {s.continue}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">{s.guestCountTitle}</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {s.guestsLabel}
                </label>
                <select
                  value={formData.guests}
                  onChange={(e) =>
                    setFormData({ ...formData, guests: parseInt(e.target.value, 10) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: property.max_guests }, (_, i) => {
                    const n = i + 1;
                    const pl = n > 1 ? 'es' : '';
                    return (
                      <option key={n} value={n}>
                        {bookFmt(s.guestOption, { n, pl })}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
                >
                  {s.back}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
                >
                  {s.continue}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">{s.guestDetailsTitle}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {s.fullName}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.guest_name}
                    onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{s.email}</label>
                  <input
                    type="email"
                    required
                    value={formData.guest_email}
                    onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{s.phone}</label>
                  <input
                    type="tel"
                    value={formData.guest_phone}
                    onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {s.nationality}
                  </label>
                  <input
                    type="text"
                    value={formData.guest_nationality}
                    onChange={(e) =>
                      setFormData({ ...formData, guest_nationality: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {s.specialRequests}
                </label>
                <textarea
                  value={formData.special_requests}
                  onChange={(e) =>
                    setFormData({ ...formData, special_requests: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={s.specialPlaceholder}
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400"
                >
                  {s.back}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  disabled={!formData.guest_name || !formData.guest_email}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {s.continueToPay}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <Elements stripe={stripePromise}>
              <PaymentForm
                tenantId={tenantId}
                propertyId={propertyId}
                formData={formData}
                pricing={pricing}
                property={property}
                s={s}
                onBack={() => setStep(3)}
                onSuccess={handlePaymentSuccess}
              />
            </Elements>
          )}

          {step === 5 && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
              <h2 className="text-2xl font-semibold text-gray-900">{s.confirmedTitle}</h2>
              <p className="text-gray-600">{s.confirmedBody}</p>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>{s.reservationCode}</strong> {pricing?.reservation_code}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

