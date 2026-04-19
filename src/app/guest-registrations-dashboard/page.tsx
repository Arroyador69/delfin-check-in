'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isValidLocale } from '@/i18n/config';

/**
 * Redirige /guest-registrations-dashboard → /[locale]/guest-registrations-dashboard
 * para que siempre se use la ruta con idioma y next-intl (evita "t is not defined").
 */
export default function GuestRegistrationsRedirect() {
  const router = useRouter();

  useEffect(() => {
    const locale = typeof window !== 'undefined'
      ? (localStorage.getItem('preferred-locale') || navigator.language?.slice(0, 2) || 'es')
      : 'es';
    const valid = isValidLocale(locale) ? locale : 'es';
    router.replace(`/${valid}/guest-registrations-dashboard`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600">Redirigiendo a registros de formularios...</p>
    </div>
  );
}
