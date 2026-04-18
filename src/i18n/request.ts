// ========================================
// 🌍 SERVER-SIDE I18N REQUEST
// ========================================
//
// Este archivo configura next-intl para Server Components

import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale, type Locale } from './config';

export default getRequestConfig(async (opts) => {
  // next-intl puede pasar requestLocale (4.x) como Promise; rutas sin prefijo pueden no tener locale.
  const o = opts as {
    requestLocale?: string | Promise<string | undefined>;
    locale?: string;
  };
  const reqLoc = o.requestLocale;
  const raw =
    (typeof reqLoc === 'object' && reqLoc !== null && 'then' in reqLoc
      ? await reqLoc
      : reqLoc) ??
    o.locale;
  let locale: Locale =
    typeof raw === 'string' && locales.includes(raw as Locale)
      ? (raw as Locale)
      : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
