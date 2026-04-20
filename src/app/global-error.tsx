'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
          <div className="rounded-2xl border border-white/50 bg-white/90 p-6 shadow-xl backdrop-blur-sm">
            <div className="text-3xl">⚠️</div>
            <h1 className="mt-3 text-xl font-bold text-gray-900">Ha ocurrido un error</h1>
            <p className="mt-2 text-sm text-gray-700">
              Se ha producido un fallo inesperado. Puedes recargar esta pantalla para intentarlo de nuevo.
            </p>
            {error?.digest ? (
              <p className="mt-3 text-xs text-gray-500">
                Referencia: <span className="font-mono">{error.digest}</span>
              </p>
            ) : null}
            <button
              onClick={() => reset()}
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow hover:from-blue-700 hover:to-purple-700"
            >
              Recargar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

