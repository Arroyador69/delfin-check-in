'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { type BookGuestLang, bookFmt, getBookStrings } from '@/lib/book-guest-i18n';
import { useBookGuestLang } from '@/lib/use-book-guest-lang';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type PaymentLinkRow = {
  link_code: string;
  link_name?: string | null;
  check_in_date: string;
  check_out_date: string;
  total_price: string | number;
  expected_guests?: number | null;
  resource_name?: string | null;
  nights?: number;
  guest_locale?: string | null;
};

function formatDate(iso: string, localeStr: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(localeStr, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function PayForm({
  linkCode,
  link,
  s,
  lang,
  localeStr,
  onSuccess,
}: {
  linkCode: string;
  link: PaymentLinkRow;
  s: ReturnType<typeof getBookStrings>;
  lang: BookGuestLang;
  localeStr: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const maxGuests = Math.max(1, Number(link.expected_guests) || 1);
  const [guests, setGuests] = useState(maxGuests);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestDocumentType, setGuestDocumentType] = useState('NIF');
  const [guestDocumentNumber, setGuestDocumentNumber] = useState('');
  const [guestNationality, setGuestNationality] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (!guestName.trim() || !guestEmail.trim() || !guestPhone.trim()) {
      setError(s.payLinkErrRequired);
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const card = elements.getElement(CardElement);
      if (!card) {
        throw new Error(s.errCardNotFound);
      }

      const res = await fetch(`/api/payment-links/${linkCode}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: guestName.trim(),
          guest_email: guestEmail.trim(),
          guest_phone: guestPhone.trim(),
          guest_document_type: guestDocumentType,
          guest_document_number: guestDocumentNumber,
          guest_nationality: guestNationality,
          guests,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || s.errCreatePayment);
      }

      const { error: confirmError } = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: {
          card,
          billing_details: {
            name: guestName.trim(),
            email: guestEmail.trim(),
          },
        },
      });

      if (confirmError) {
        throw new Error(confirmError.message || s.errProcessPayment);
      }

      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : s.errProcessPayment);
    } finally {
      setProcessing(false);
    }
  };

  const totalStr = String(link.total_price ?? '');

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm space-y-2">
        <div className="flex justify-between gap-2">
          <span className="text-gray-600">{s.payLinkResource}</span>
          <span className="font-medium text-right">
            {link.resource_name || link.link_name || '—'}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-600">{s.payLinkDates}</span>
          <span className="font-medium text-right">
            {formatDate(String(link.check_in_date), localeStr)} —{' '}
            {formatDate(String(link.check_out_date), localeStr)}
            {link.nights != null ? (
              <span className="text-gray-500">
                {' '}
                {bookFmt(s.payLinkNightsShort, { n: link.nights })}
              </span>
            ) : null}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-gray-600">{s.payLinkGuests}</span>
          <span className="font-medium">{guests}</span>
        </div>
        <div className="flex justify-between gap-2 border-t border-gray-200 pt-2 font-semibold">
          <span>{s.payLinkTotal}</span>
          <span>{totalStr}€</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{s.guestsLabel}</label>
        <select
          value={guests}
          onChange={(e) => setGuests(parseInt(e.target.value, 10))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {Array.from({ length: maxGuests }, (_, i) => {
            const n = i + 1;
            const pl = n > 1 ? (lang === 'es' ? 'es' : 's') : '';
            return (
              <option key={n} value={n}>
                {bookFmt(s.guestOption, { n, pl })}
              </option>
            );
          })}
        </select>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">{s.payLinkYourDetails}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{s.fullName}</label>
            <input
              required
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{s.email}</label>
            <input
              type="email"
              required
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{s.phone}</label>
            <input
              type="tel"
              required
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{s.nationality}</label>
            <input
              value={guestNationality}
              onChange={(e) => setGuestNationality(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{s.payLinkDocType}</label>
            <input
              value={guestDocumentType}
              onChange={(e) => setGuestDocumentType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {s.payLinkDocNumber}
            </label>
            <input
              value={guestDocumentNumber}
              onChange={(e) => setGuestDocumentNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="border border-gray-300 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">{s.cardLabel}</label>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': { color: '#aab7c4' },
              },
              invalid: { color: '#9e2146' },
            },
          }}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={processing || !stripe}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            {s.processing}
          </>
        ) : (
          s.payLinkPayNow
        )}
      </button>
    </form>
  );
}

function PayPageInner({ params }: { params: Promise<{ linkCode: string }> }) {
  const { linkCode } = use(params);
  const [link, setLink] = useState<PaymentLinkRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paid, setPaid] = useState(false);

  const { lang, setLang } = useBookGuestLang(link?.guest_locale ?? null);
  const s = getBookStrings(lang);
  const localeStr = lang === 'en' ? 'en-GB' : 'es-ES';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/payment-links/${linkCode}`);
        const data = await res.json();
        if (cancelled) return;
        if (!data.success || !data.link) {
          setLoadError(typeof data.error === 'string' ? data.error : 'invalid');
        } else {
          setLink(data.link as PaymentLinkRow);
        }
      } catch {
        if (!cancelled) setLoadError('invalid');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-gray-600">{s.payLinkLoading}</p>
      </div>
    );
  }

  if (loadError || !link) {
    const message = loadError === 'invalid' ? s.payLinkInvalid : loadError || s.payLinkInvalid;
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">{s.payLinkTitle}</h1>
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3 bg-white rounded-xl shadow-md p-8">
          <h1 className="text-2xl font-semibold text-gray-900">{s.payLinkSuccessTitle}</h1>
          <p className="text-gray-600">{s.payLinkSuccessBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex justify-end mb-4">
          <div className="inline-flex flex-col items-end gap-1" role="group" aria-label={s.langSwitchAria}>
            <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setLang('es')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  lang === 'es' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s.langEs}
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  lang === 'en' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s.langEn}
              </button>
            </div>
            <p className="text-xs text-gray-500 max-w-xs text-right">{s.langHint}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">{s.payLinkTitle}</h1>
          <p className="text-sm text-gray-600">{s.payLinkSubtitle}</p>
        </div>

        <div className="mt-6 bg-white rounded-xl shadow-md p-6">
          <Elements stripe={stripePromise}>
            <PayForm
              linkCode={linkCode}
              link={link}
              s={s}
              lang={lang}
              localeStr={localeStr}
              onSuccess={() => setPaid(true)}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}

function PayFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
    </div>
  );
}

export default function BookPaymentLinkPage({
  params,
}: {
  params: Promise<{ linkCode: string }>;
}) {
  return (
    <Suspense fallback={<PayFallback />}>
      <PayPageInner params={params} />
    </Suspense>
  );
}
