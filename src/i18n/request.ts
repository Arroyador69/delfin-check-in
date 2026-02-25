// ========================================
// 🌍 SERVER-SIDE I18N REQUEST
// ========================================
//
// Este archivo configura next-intl para Server Components

import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from './config';

export default getRequestConfig(async (opts) => {
  // next-intl puede pasar requestLocale (4.x) o locale; rutas sin prefijo (/admin-login, /)
  // pueden llegar sin locale y provocar notFound() → 404. Usar defaultLocale en ese caso.
  const raw =
    (opts as { requestLocale?: string }).requestLocale ??
    (opts as { locale?: string }).locale;
  let locale: Locale =
    typeof raw === 'string' && locales.includes(raw as Locale)
      ? (raw as Locale)
      : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
