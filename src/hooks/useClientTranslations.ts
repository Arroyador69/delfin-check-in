'use client';

import { useState, useEffect } from 'react';
import { type Locale, defaultLocale, isValidLocale } from '@/i18n/config';

/**
 * 🌍 HOOK DE TRADUCCIONES DEL CLIENTE
 * 
 * Este hook lee el idioma preferido del usuario desde localStorage
 * y carga las traducciones correspondientes desde los archivos JSON.
 * 
 * NO requiere next-intl provider, funciona en cualquier componente cliente.
 * 
 * USO:
 * const t = useClientTranslations('reservations');
 * return <h1>{t('title')}</h1>;
 */

type TranslationMessages = Record<string, any>;

const messagesCache: Record<string, TranslationMessages> = {};

/**
 * Carga las traducciones para un locale específico
 */
async function loadMessages(locale: Locale): Promise<TranslationMessages> {
  if (messagesCache[locale]) {
    return messagesCache[locale];
  }

  try {
    const messages = await import(`../../messages/${locale}.json`);
    messagesCache[locale] = messages.default;
    return messages.default;
  } catch (error) {
    console.error(`Error cargando traducciones para ${locale}:`, error);
    // Fallback a español
    if (locale !== defaultLocale) {
      return loadMessages(defaultLocale);
    }
    return {};
  }
}

/**
 * Obtiene el locale actual del usuario (p. ej. rutas sin prefijo /superadmin).
 */
export function getCurrentLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  
  const stored = localStorage.getItem('preferred-locale');
  if (stored && isValidLocale(stored)) {
    return stored;
  }
  
  return defaultLocale;
}

/**
 * Hook que retorna una función de traducción para un namespace específico
 */
export function useClientTranslations(namespace: string) {
  const [messages, setMessages] = useState<TranslationMessages>({});
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const currentLocale = getCurrentLocale();
    setLocale(currentLocale);
    
    loadMessages(currentLocale).then((loadedMessages) => {
      setMessages(loadedMessages);
    });
  }, []);

  /**
   * Función de traducción que busca en el namespace
   */
  const t = (key: string): string => {
    if (!messages || Object.keys(messages).length === 0) {
      // Mientras carga, retornar key
      return key;
    }

    // Buscar en el namespace (estructura anidada: form.roomLabel → ns.form.roomLabel)
    const keys = key.split('.');
    let value: any = messages[namespace];
    for (const k of keys) {
      value = value?.[k];
    }
    if (value && typeof value === 'string') return value;

    // Claves planas en el JSON (ej. "form.roomLabel" dentro de reservations)
    value = messages[namespace]?.[key];
    if (value && typeof value === 'string') return value;

    // Buscar en el objeto completo (para claves sin namespace)
    value = messages;
    for (const k of [namespace, ...keys]) {
      value = value?.[k];
    }
    if (value && typeof value === 'string') return value;

    return key; // Fallback a la key
  };

  return t;
}

/**
 * Función para cambiar el idioma (guarda en localStorage y recarga)
 */
export function changeLanguage(newLocale: Locale) {
  localStorage.setItem('preferred-locale', newLocale);
  window.location.reload();
}
