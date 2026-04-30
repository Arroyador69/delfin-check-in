'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useTenant, hasAds } from '@/hooks/useTenant';

/**
 * Detecta extensiones tipo AdBlock que ocultan la franja de recomendaciones (afiliado).
 * Solo aplica a planes con franja comercial (p. ej. free / checkin).
 * No usa adsbygoogle: sin AdSense, esa comprobación generaba falsos positivos.
 */
export default function AdBlockDetector() {
  const locale = useLocale();
  const t = useTranslations('adBlockCurated');
  const { tenant, loading } = useTenant();
  const [blocked, setBlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading || !tenant || !hasAds(tenant)) {
      setChecking(false);
      return;
    }

    const testAd = document.createElement('div');
    testAd.innerHTML = '&nbsp;';
    testAd.className = 'adsbox';
    testAd.style.position = 'absolute';
    testAd.style.left = '-9999px';
    testAd.style.height = '1px';
    testAd.style.width = '1px';

    document.body.appendChild(testAd);

    const timer = window.setTimeout(() => {
      const hidden =
        testAd.offsetHeight === 0 ||
        testAd.offsetWidth === 0 ||
        testAd.style.display === 'none' ||
        testAd.style.visibility === 'hidden';
      if (testAd.parentNode) {
        testAd.parentNode.removeChild(testAd);
      }
      setBlocked(hidden);
      setChecking(false);
    }, 180);

    return () => {
      window.clearTimeout(timer);
      if (testAd.parentNode) {
        testAd.parentNode.removeChild(testAd);
      }
    };
  }, [loading, tenant]);

  if (loading || checking || !tenant || !hasAds(tenant) || !blocked) {
    return null;
  }

  const planKey = (tenant.plan_type || 'free').toUpperCase();

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mb-4 text-5xl" aria-hidden>
            🛡️
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900 sm:text-3xl">{t('title')}</h1>
          <p className="text-lg text-slate-600">{t('subtitle')}</p>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-6 text-left">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">{t('whyTitle')}</h2>
          <p className="mb-3 text-slate-700">
            {t('whyLeadPlan', { plan: planKey })}
          </p>
          <p className="mb-3 text-slate-700">{t('whyBodyCurated')}</p>
          <p className="text-slate-700">{t('whyBodyFair')}</p>
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">{t('upgradeTitle')}</p>
            <p className="mt-2 text-sm text-blue-900">{t('upgradeBody')}</p>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="mb-3 text-base font-semibold text-amber-950">{t('stepsTitle')}</h3>
          <ol className="list-decimal space-y-2 pl-5 text-left text-amber-950">
            <li>{t('step1')}</li>
            <li>{t('step2')}</li>
            <li>{t('step3')}</li>
          </ol>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-slate-800 px-6 py-3 font-semibold text-white transition hover:bg-slate-900"
          >
            {t('reload')}
          </button>
          <a
            href={`/${locale}/upgrade-plan`}
            className="rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-center font-semibold text-white shadow-md transition hover:from-blue-700 hover:to-indigo-700"
          >
            {t('upgradeCta')}
          </a>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">{t('footerHint')}</p>
      </div>
    </div>
  );
}
