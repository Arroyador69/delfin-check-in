'use client';

import { locales, localeNames, localeFlags, type Locale, defaultLocale, isValidLocale } from '@/i18n/config';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';

/**
 * Extrae el locale actual desde la URL (primer segmento: /es/..., /en/...).
 * El idioma que ve el usuario viene de la URL, no de localStorage.
 */
function getLocaleFromPathname(pathname: string): Locale {
  const segment = pathname.split('/').filter(Boolean)[0];
  if (segment && isValidLocale(segment)) return segment;
  return defaultLocale;
}

/**
 * 🌍 SELECTOR DE IDIOMAS
 *
 * Cambia el idioma navegando a la misma ruta con el nuevo locale en la URL.
 * El layout usa el segmento [locale] de la URL para cargar los mensajes correctos.
 */
export default function LanguageSwitcher() {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname ?? '');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar el dropdown cuando se hace clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleChangeLanguage = (newLocale: Locale) => {
    if (newLocale === locale) {
      setIsOpen(false);
      return;
    }

    localStorage.setItem('preferred-locale', newLocale);
    setIsOpen(false);

    fetch('/api/user/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: newLocale }),
    }).catch((err) => console.error('Error guardando preferencia de idioma:', err));

    // Navegar a la misma ruta con el nuevo locale en la URL (ej: /es/dashboard → /en/dashboard).
    // El layout lee [locale] de la URL y carga los mensajes de ese idioma.
    const segments = (pathname ?? '').split('/').filter(Boolean);
    const currentPathLocale = segments[0];
    const rest = isValidLocale(currentPathLocale) ? segments.slice(1) : segments;
    const newPath = '/' + [newLocale, ...rest].join('/');
    window.location.href = newPath;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón de selector */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Cambiar idioma"
        title="Cambiar idioma"
      >
        <Globe className="w-5 h-5 text-gray-600" />
        <span className="hidden sm:inline text-sm font-medium text-gray-700">
          {localeFlags[locale]} {localeNames[locale]}
        </span>
        <span className="sm:hidden text-lg">
          {localeFlags[locale]}
        </span>
        <svg
          className={`w-4 h-4 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown de idiomas */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-fadeIn">
          {locales.map((loc) => (
            <button
              key={loc}
              onClick={() => handleChangeLanguage(loc)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center space-x-3 ${
                loc === locale ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
              }`}
            >
              <span className="text-xl">{localeFlags[loc]}</span>
              <span>{localeNames[loc]}</span>
              {loc === locale && (
                <svg className="w-4 h-4 ml-auto text-blue-700" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
