'use client';

import type { ComponentProps } from 'react';
import { useLocale } from 'next-intl';
import { toIntlDateLocale, type Locale } from '@/i18n/config';

type LocalizedDateInputProps = Omit<ComponentProps<'input'>, 'type' | 'lang'> & {
  type?: 'date' | 'month' | 'week' | 'time' | 'datetime-local';
  /** BCP-47 (ej. it-IT). Para rutas sin [locale] en la URL (p. ej. /) con idioma desde localStorage. */
  localeBcp47?: string;
};

/**
 * Input de fecha con `lang` BCP-47 para que meses y UI del selector sigan el idioma de la app
 * cuando el navegador lo respeta (Safari/Firefox suelen mejor que Chrome, que a veces usa solo el SO).
 */
export default function LocalizedDateInput({
  localeBcp47,
  type = 'date',
  ...rest
}: LocalizedDateInputProps) {
  const loc = useLocale() as Locale;
  const lang = localeBcp47 ?? toIntlDateLocale(loc);
  return <input {...rest} type={type} lang={lang} />;
}
