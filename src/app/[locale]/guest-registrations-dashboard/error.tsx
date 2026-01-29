'use client';

import { useTranslations } from 'next-intl';

export default function Error({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('guestRegistrations.errorPage');
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🐬</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {t('title')}
          </h1>
          <p className="text-gray-600 mb-6">
            {t('description')}
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-red-800 mb-2">{t('details')}</h3>
            <p className="text-sm text-red-700 break-words">
              {error?.message || t('unknownError')}
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => reset()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {t('retry')}
            </button>
            <button
              onClick={() => window.location.href = '/admin-login'}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              {t('backToLogin')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
