'use client';

import { locales, localeNames, localeFlags, type Locale, defaultLocale } from '@/i18n/config';
import { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';

/**
 * Obtiene el locale actual desde localStorage
 */
function getCurrentLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;
  
  const stored = localStorage.getItem('preferred-locale');
  if (stored && locales.includes(stored as Locale)) {
    return stored as Locale;
  }
  
  return defaultLocale;
}

/**
 * 🌍 SELECTOR DE IDIOMAS SIMPLE
 * 
 * Permite al usuario cambiar el idioma del PMS.
 * Guarda la preferencia en localStorage y recarga la página.
 * 
 * NO requiere next-intl provider, funciona en cualquier página.
 * NO cambia las URLs - todo permanece igual.
 */
export default function LanguageSwitcher() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocale(getCurrentLocale());
  }, []);

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
    // Guardar en localStorage
    localStorage.setItem('preferred-locale', newLocale);
    
    // Cerrar dropdown
    setIsOpen(false);
    
    // Guardar también en BD (API call) - no bloqueante
    fetch('/api/user/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ locale: newLocale }),
    }).catch((error) => {
      console.error('Error guardando preferencia de idioma:', error);
      // No bloqueante - continuar aunque falle
    });
    
    // Recargar la página para aplicar el nuevo idioma
    window.location.reload();
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
