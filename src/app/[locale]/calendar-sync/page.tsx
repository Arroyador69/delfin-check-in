'use client';

import { useState } from 'react';
import { Copy, RefreshCw, Smartphone, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function CalendarSyncPage() {
  const t = useTranslations('calendarSync');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const calendarUrl = 'https://admin.delfincheckin.com/api/ical/reservations';

  const copyToClipboard = async (url: string, label: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(label);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Error copying URL:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header compacto */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              📅 {t('title')}
            </h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-lg p-6 transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-2xl">
          <div className="mb-6">
            <p className="text-gray-600">
              {t('intro')}
            </p>
          </div>

          {/* URL de Calendario */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-6 h-6 mr-2" />
              {t('ical.title')}
            </h2>
            
            <div className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="font-medium text-gray-900 mb-3 text-lg">
                📊 {t('ical.allReservationsTitle')}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {t('ical.allReservationsDescription')}
              </p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={calendarUrl}
                  readOnly
                  className="flex-1 px-4 py-3 border-2 border-blue-300 rounded-lg bg-white text-sm font-mono"
                />
                <button
                  onClick={() => copyToClipboard(calendarUrl, 'calendar')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
                >
                  {copiedUrl === 'calendar' ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">{t('ical.copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-5 h-5" />
                      <span className="font-medium">{t('ical.copyButton')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Instrucciones por dispositivo */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <Smartphone className="w-6 h-6 mr-2" />
              {t('instructions.title')}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* iPhone/iOS */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  📱 {t('instructions.ios.title')}
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>{t('instructions.ios.step1')}</li>
                  <li>{t('instructions.ios.step2')}</li>
                  <li>{t('instructions.ios.step3')}</li>
                  <li>{t('instructions.ios.step4')}</li>
                  <li>{t('instructions.ios.step5')}</li>
                  <li>{t('instructions.ios.step6')}</li>
                </ol>
              </div>

              {/* Android/Google */}
              <div className="border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  🤖 {t('instructions.android.title')}
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>{t('instructions.android.step1')}</li>
                  <li>{t('instructions.android.step2')}</li>
                  <li>{t('instructions.android.step3')}</li>
                  <li>{t('instructions.android.step4')}</li>
                  <li>{t('instructions.android.step5')}</li>
                  <li>{t('instructions.android.step6')}</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Problemas de Sincronización */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center">
              <RefreshCw className="w-6 h-6 mr-2" />
              {t('syncIssues.title')}
            </h2>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start">
                <AlertCircle className="w-6 h-6 text-yellow-600 mt-1 mr-3" />
                <div>
                  <h3 className="font-semibold text-yellow-800 mb-2">
                    {t('syncIssues.commonTitle')}
                  </h3>
                  <p className="text-yellow-700 mb-4">
                    {t('syncIssues.commonDescription')}
                  </p>
                  
                  <h4 className="font-semibold text-yellow-800 mb-2">
                    {t('syncIssues.solutionsTitle')}
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-yellow-700">
                    <li>{t('syncIssues.solution1')}</li>
                    <li>{t('syncIssues.solution2')}</li>
                    <li>{t('syncIssues.solution3')}</li>
                    <li>{t('syncIssues.solution4')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Información Técnica */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-800 mb-2">
              ℹ️ {t('technical.title')}
            </h3>
            <ul className="list-disc list-inside space-y-1 text-blue-700 text-sm">
              <li>{t('technical.item1')}</li>
              <li>{t('technical.item2')}</li>
              <li>{t('technical.item3')}</li>
              <li>{t('technical.item4')}</li>
              <li>{t('technical.item5')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
