import countries from 'i18n-iso-countries';
import type { LocaleData } from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import es from 'i18n-iso-countries/langs/es.json';
import fr from 'i18n-iso-countries/langs/fr.json';
import it from 'i18n-iso-countries/langs/it.json';
import pt from 'i18n-iso-countries/langs/pt.json';
import type { SupportedLocale } from '@/lib/i18n';

let registered = false;

function ensureLocalesRegistered(): void {
  if (registered) return;
  for (const data of [en, es, fr, it, pt] as LocaleData[]) {
    countries.registerLocale(data);
  }
  registered = true;
}

/**
 * Nombre del país en el idioma de la UI (Hermes no rellena bien Intl.DisplayNames).
 */
export function getLocalizedCountryName(alpha2: string, uiLang: SupportedLocale): string {
  ensureLocalesRegistered();
  const code = String(alpha2 || '').toUpperCase();
  const primary = countries.getName(code, uiLang);
  if (primary) return primary;
  const enFallback = countries.getName(code, 'en');
  if (enFallback) return enFallback;
  return code;
}
