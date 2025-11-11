'use client';

import { useEffect, useMemo, useState } from 'react';

type CookiePreferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

const STORAGE_KEY = 'dci-cookie-consent';

function getInitialPreferences(): CookiePreferences {
  if (typeof window === 'undefined') {
    return { necessary: true, analytics: false, marketing: false };
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as CookiePreferences;
      return {
        necessary: true,
        analytics: !!parsed.analytics,
        marketing: !!parsed.marketing,
      };
    }
  } catch (error) {
    console.warn('No se pudieron leer las preferencias de cookies:', error);
  }

  return { necessary: true, analytics: false, marketing: false };
}

export default function CookieConsentModal() {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(() => getInitialPreferences());

  const isConsented = useMemo(() => {
    if (typeof window === 'undefined') return true;
    return !!window.localStorage.getItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!isConsented) {
      setShowBanner(true);
    }

    const handler = () => {
      setShowBanner(false);
      setShowModal(true);
    };

    window.addEventListener('open-cookie-consent', handler as EventListener);
    return () => {
      window.removeEventListener('open-cookie-consent', handler as EventListener);
    };
  }, [isConsented]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowModal(false);
      }
    };

    if (showModal) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('overflow-hidden');
    };
  }, [showModal]);

  const persistPreferences = (prefs: CookiePreferences) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(
      new CustomEvent('cookie-consent-updated', {
        detail: prefs,
      })
    );
  };

  const handleAcceptAll = () => {
    const consent: CookiePreferences = { necessary: true, analytics: true, marketing: true };
    persistPreferences(consent);
    setPreferences(consent);
    setShowBanner(false);
    setShowModal(false);
  };

  const handleRejectAll = () => {
    const consent: CookiePreferences = { necessary: true, analytics: false, marketing: false };
    persistPreferences(consent);
    setPreferences(consent);
    setShowBanner(false);
    setShowModal(false);
  };

  const handleSavePreferences = () => {
    persistPreferences(preferences);
    setShowBanner(false);
    setShowModal(false);
  };

  const handleOpenAdvanced = () => {
    setShowBanner(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    if (!isConsented) {
      setShowBanner(true);
    }
  };

  return (
    <>
      {showBanner && (
        <div className="fixed inset-x-0 bottom-0 z-[9998] border-t border-blue-100 bg-white/95 backdrop-blur shadow-[0_-6px_30px_rgba(37,99,235,0.12)]">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="text-2xl" role="img" aria-hidden="true">
                🍪
              </span>
              <div className="text-sm text-gray-700">
                <p className="font-semibold text-gray-900">Utilizamos cookies</p>
                <p>
                  Para mejorar tu experiencia, analizar el tráfico y personalizar contenido.{' '}
                  <a href="/legal/privacy" className="text-blue-600 underline hover:text-blue-800">
                    Privacidad
                  </a>{' '}
                  ·{' '}
                  <a href="/legal/cookies" className="text-blue-600 underline hover:text-blue-800">
                    Política de Cookies
                  </a>
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleRejectAll}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              >
                Solo necesarias
              </button>
              <button
                type="button"
                onClick={handleOpenAdvanced}
                className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
              >
                Personalizar
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg hover:brightness-110"
              >
                Aceptar todas
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-600"
              aria-label="Cerrar gestor de cookies"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-3 pb-4">
              <span className="text-3xl" role="img" aria-hidden="true">
                🍪
              </span>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Gestiona tus preferencias de cookies</h2>
                <p className="text-sm text-gray-600">
                  Utilizamos cookies para mejorar tu experiencia, analizar el tráfico y ofrecer contenido personalizado. Puedes aceptar todas, rechazarlas o
                  personalizar tu selección.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <h3 className="text-sm font-semibold text-blue-700">Cookies necesarias</h3>
                <p className="text-sm text-blue-700/80">
                  Permiten funciones básicas como iniciar sesión o recordar tu idioma. Siempre activas.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex cursor-pointer flex-col rounded-xl border border-purple-100 bg-purple-50/60 p-4 shadow-sm transition hover:shadow-md">
                  <span className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-purple-700">Cookies analíticas</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-purple-600"
                      checked={preferences.analytics}
                      onChange={(event) =>
                        setPreferences((prev) => ({
                          ...prev,
                          analytics: event.target.checked,
                        }))
                      }
                    />
                  </span>
                  <span className="mt-2 text-sm text-purple-700/80">
                    Nos ayudan a entender cómo utilizas la aplicación para seguir mejorándola.
                  </span>
                </label>

                <label className="flex cursor-pointer flex-col rounded-xl border border-pink-100 bg-pink-50/60 p-4 shadow-sm transition hover:shadow-md">
                  <span className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-pink-700">Cookies de marketing</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-pink-600"
                      checked={preferences.marketing}
                      onChange={(event) =>
                        setPreferences((prev) => ({
                          ...prev,
                          marketing: event.target.checked,
                        }))
                      }
                    />
                  </span>
                  <span className="mt-2 text-sm text-pink-700/80">
                    Permiten mostrar campañas y promociones relevantes para ti.
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleRejectAll}
                className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
              >
                Rechazar no esenciales
              </button>
              <button
                type="button"
                onClick={handleSavePreferences}
                className="rounded-lg border border-blue-200 px-5 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
              >
                Guardar preferencias
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:shadow-lg hover:brightness-110"
              >
                Aceptar todas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

