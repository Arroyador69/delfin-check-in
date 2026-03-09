'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirige /reservations → /[locale]/reservations para que siempre se use
 * la ruta con idioma y next-intl cargue las traducciones correctamente.
 */
export default function ReservationsRedirect() {
  const router = useRouter();

  useEffect(() => {
    const locale = typeof window !== 'undefined'
      ? (localStorage.getItem('preferred-locale') || navigator.language?.slice(0, 2) || 'es')
      : 'es';
    const valid = ['es', 'en', 'it', 'pt', 'fr'].includes(locale) ? locale : 'es';
    router.replace(`/${valid}/reservations`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-600">Redirigiendo a reservas...</p>
    </div>
  );
}
