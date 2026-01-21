// ========================================
// 🌍 SERVER-SIDE I18N REQUEST
// ========================================
//
// Este archivo configura next-intl para Server Components

import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from './config';

export default getRequestConfig(async ({ locale }) => {
  // Validar que el locale sea soportado
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  return {
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
