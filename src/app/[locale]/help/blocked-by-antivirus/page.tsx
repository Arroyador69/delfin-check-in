'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

export default function HelpBlockedByAntivirusPage() {
  const t = useTranslations('helpAntivirus');
  const locale = useLocale();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <p className="text-sm font-semibold text-blue-700 mb-2">🐬 Delfín Check-in</p>
        <h1 className="text-2xl sm:text-3xl font-bold mb-4">{t('title')}</h1>
        <p className="text-slate-700 leading-relaxed mb-6">{t('intro')}</p>

        <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6 shadow-sm">
          <p className="text-sm text-slate-600 mb-1">{t('officialDomain')}</p>
          <p className="font-mono text-sm font-semibold text-slate-900">admin.delfincheckin.com</p>
        </div>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">{t('stepAvastTitle')}</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-700 text-sm leading-relaxed">
            <li>{t('stepAvast1')}</li>
            <li>{t('stepAvast2')}</li>
            <li>{t('stepAvast3')}</li>
          </ol>
        </section>

        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">{t('stepGenericTitle')}</h2>
          <ol className="list-decimal list-inside space-y-2 text-slate-700 text-sm leading-relaxed">
            <li>{t('stepGeneric1')}</li>
            <li>{t('stepGeneric2')}</li>
            <li>{t('stepGeneric3')}</li>
          </ol>
        </section>

        <section className="rounded-xl border border-blue-100 bg-blue-50/80 p-5 mb-8">
          <h2 className="text-base font-semibold text-blue-900 mb-2">{t('reportTitle')}</h2>
          <p className="text-sm text-blue-900/90 leading-relaxed">{t('reportBody')}</p>
        </section>

        <p className="text-sm text-slate-600 mb-4">
          {t('contact')}{' '}
          <a href="mailto:contacto@delfincheckin.com" className="text-blue-600 hover:underline">
            contacto@delfincheckin.com
          </a>
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/${locale}/onboarding`}
            className="inline-flex justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {t('backOnboarding')}
          </Link>
          <Link
            href="/admin-login"
            className="inline-flex justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
          >
            {t('login')}
          </Link>
        </div>
      </div>
    </div>
  );
}
