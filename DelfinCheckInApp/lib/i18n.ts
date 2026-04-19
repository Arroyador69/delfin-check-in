import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';

type Messages = Record<string, any>;

import esMessages from '../../messages/es.json';
import enMessages from '../../messages/en.json';
import frMessages from '../../messages/fr.json';
import itMessages from '../../messages/it.json';
import ptMessages from '../../messages/pt.json';
import fiMessages from '../../messages/fi.json';

// Reutilizamos los mismos diccionarios del software web (Next-intl).
// Ruta desde DelfinCheckInApp/lib → raíz/messages
const messages = {
  es: esMessages as Messages,
  en: enMessages as Messages,
  fr: frMessages as Messages,
  it: itMessages as Messages,
  pt: ptMessages as Messages,
  fi: fiMessages as Messages,
} as const;

export type SupportedLocale = keyof typeof messages;

const LOCALE_STORAGE_KEY = 'delfin.app_locale.v1';

/** Emite al cambiar idioma guardado (re-montar árbol de navegación). */
export const LOCALE_CHANGED_EVENT = 'delfin_app_locale_changed';

let persistedLocale: SupportedLocale | null = null;

export async function hydrateAppLocale(): Promise<void> {
  try {
    const raw = await SecureStore.getItemAsync(LOCALE_STORAGE_KEY);
    if (raw && raw in messages) {
      persistedLocale = raw as SupportedLocale;
    } else {
      persistedLocale = null;
    }
  } catch {
    persistedLocale = null;
  }
}

export async function setAppLocale(locale: SupportedLocale): Promise<void> {
  await SecureStore.setItemAsync(LOCALE_STORAGE_KEY, locale);
  persistedLocale = locale;
  DeviceEventEmitter.emit(LOCALE_CHANGED_EVENT);
}

export async function clearAppLocale(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(LOCALE_STORAGE_KEY);
  } catch {
    /* no key */
  }
  persistedLocale = null;
  DeviceEventEmitter.emit(LOCALE_CHANGED_EVENT);
}

/** True si el usuario eligió un idioma explícito (no solo el del teléfono). */
export async function hasPersistedAppLocale(): Promise<boolean> {
  try {
    const raw = await SecureStore.getItemAsync(LOCALE_STORAGE_KEY);
    return Boolean(raw && raw in messages);
  } catch {
    return false;
  }
}

function resolveLocale(): SupportedLocale {
  if (persistedLocale && persistedLocale in messages) {
    return persistedLocale;
  }
  const locales = Localization.getLocales?.() || [];
  for (const loc of locales) {
    const lang = loc?.languageCode?.toLowerCase();
    if (lang && lang in messages) return lang as SupportedLocale;
  }
  // Si el idioma del teléfono no está soportado, usamos inglés.
  return 'en';
}

export function getLocale(): SupportedLocale {
  return resolveLocale();
}

const localeTagByCode: Record<SupportedLocale, string> = {
  es: 'es-ES',
  en: 'en-GB',
  fr: 'fr-FR',
  it: 'it-IT',
  pt: 'pt-PT',
  fi: 'fi-FI',
};

export function getLocaleTag(): string {
  const locales = Localization.getLocales?.() || [];
  const deviceTag = locales[0]?.languageTag;
  if (!persistedLocale && deviceTag) {
    return deviceTag;
  }
  const code = resolveLocale();
  return localeTagByCode[code] || `${code}-ES`;
}

function getPath(obj: any, path: string): unknown {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object' || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : `{${k}}`
  );
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const locale = resolveLocale();
  const dict = messages[locale];
  const fallback = messages.en;

  const raw = getPath(dict, key) ?? getPath(fallback, key);
  if (typeof raw === 'string') return interpolate(raw, vars);
  return key;
}

/** Suscripción ligera para re-renderizar pantallas cuando cambia el idioma guardado. */
export function useLocaleListener(): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(LOCALE_CHANGED_EVENT, () => {
      setTick((x) => x + 1);
    });
    return () => sub.remove();
  }, []);
}
