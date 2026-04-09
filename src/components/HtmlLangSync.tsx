'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  defaultLocale,
  isValidLocale,
  toIntlDateLocale,
  type Locale,
} from '@/i18n/config';

/**
 * Alinea `document.documentElement.lang` con el idioma activo (segmento /es/, /it/… o preferred-locale en /).
 * Mejora accesibilidad y el comportamiento de controles nativos de fecha en varios navegadores.
 */
export default function HtmlLangSync() {
  const pathname = usePathname() ?? '';

  useEffect(() => {
    const segment = pathname.split('/').filter(Boolean)[0];
    let appLocale: Locale = defaultLocale;
    if (segment && isValidLocale(segment)) {
      appLocale = segment;
    } else if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('preferred-locale');
      if (stored && isValidLocale(stored)) appLocale = stored as Locale;
    }
    document.documentElement.lang = toIntlDateLocale(appLocale);
  }, [pathname]);

  return null;
}
