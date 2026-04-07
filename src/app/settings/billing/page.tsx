'use client';

import { useEffect } from 'react';
import { defaultLocale } from '@/i18n/config';

/**
 * Rutas con prefijo de locale (/es/, /en/, …) son la fuente de verdad.
 * Redirige accesos legacy a /settings/billing.
 */
export default function BillingRedirectPage() {
  useEffect(() => {
    window.location.replace(`/${defaultLocale}/settings/billing`);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600 text-sm">Redirigiendo…</p>
    </div>
  );
}
