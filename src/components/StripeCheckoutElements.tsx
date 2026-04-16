'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getStripePromise } from '@/lib/stripe-client';

export function StripeCheckoutElements({ children }: { children: ReactNode }) {
  const t = useTranslations('plans');
  const [stripe, setStripe] = useState<Stripe | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getStripePromise().then((s) => {
      if (!cancelled) setStripe(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (stripe === undefined) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-blue-600" size={28} />
      </div>
    );
  }

  if (stripe === null) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {t('stripeLoadFailed')}
      </div>
    );
  }

  return <Elements stripe={stripe}>{children}</Elements>;
}
