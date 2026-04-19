// ========================================
// 🌍 CONFIGURACIÓN DE INTERNACIONALIZACIÓN
// ========================================
//
// Este archivo configura los idiomas soportados por el PMS
// de Delfín Check-in.
//
// Idiomas soportados:
// - 🇪🇸 Español (es) - Por defecto
// - 🇬🇧 Inglés (en)
// - 🇮🇹 Italiano (it)
// - 🇵🇹 Portugués (pt)
// - 🇫🇷 Francés (fr)
// - 🇫🇮 Finés (fi)

export const locales = ['es', 'en', 'it', 'pt', 'fr', 'fi'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'es';

// Nombres de idiomas para el selector
export const localeNames: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  it: 'Italiano',
  pt: 'Português',
  fr: 'Français',
  fi: 'Suomi',
};

// Banderas (emojis) para el selector
export const localeFlags: Record<Locale, string> = {
  es: '🇪🇸',
  en: '🇬🇧',
  it: '🇮🇹',
  pt: '🇵🇹',
  fr: '🇫🇷',
  fi: '🇫🇮',
};

// Validar si un locale es soportado
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

/** BCP-47 para formatear fechas (p. ej. etiquetas de reinicio de uso del asistente). */
export function toIntlDateLocale(locale: Locale): string {
  const map: Record<Locale, string> = {
    es: 'es-ES',
    en: 'en-GB',
    it: 'it-IT',
    pt: 'pt-PT',
    fr: 'fr-FR',
    fi: 'fi-FI',
  };
  return map[locale];
}

// Obtener locale desde request header o defaultLocale
export function getLocaleFromRequest(acceptLanguage?: string): Locale {
  if (!acceptLanguage) return defaultLocale;
  
  // Parsear Accept-Language header (ej: "en-US,en;q=0.9,es;q=0.8")
  const languages = acceptLanguage
    .split(',')
    .map(lang => lang.split(';')[0].trim().split('-')[0].toLowerCase());
  
  // Buscar el primer idioma soportado
  for (const lang of languages) {
    if (isValidLocale(lang)) {
      return lang;
    }
  }
  
  return defaultLocale;
}
