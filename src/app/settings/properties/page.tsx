'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { defaultLocale } from '@/i18n/config';

/**
 * Ruta legacy sin prefijo de idioma. El middleware suele redirigir a /{locale}/settings/properties;
 * este componente asegura la misma URL con locale si se llegara a montar.
 */
export default function PropertiesLegacyRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const search = typeof window !== 'undefined' ? window.location.search || '' : '';
    router.replace(`/${defaultLocale}${pathname}${search}`);
  }, [router, pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
      <p className="text-gray-600 text-sm">Redirigiendo a propiedades…</p>
    </div>
  );
}
