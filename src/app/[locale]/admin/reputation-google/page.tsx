'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useTenant, isProPlanTenant } from '@/hooks/useTenant';
import { Star, Lock } from 'lucide-react';

export default function ReputationGooglePage() {
  const t = useTranslations('reputationGoogle');
  const locale = useLocale();
  const { tenant, loading: tenantLoading } = useTenant();
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [meLoaded, setMeLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data?.isPlatformAdmin) {
          setIsPlatformAdmin(true);
        }
      })
      .catch(() => {})
      .finally(() => setMeLoaded(true));
  }, []);

  const loading = tenantLoading || !meLoaded;
  const unlocked = Boolean(tenant && (isProPlanTenant(tenant) || isPlatformAdmin));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pb-20">
      <div className="flex items-start gap-3 mb-6">
        <div className="rounded-lg bg-amber-50 p-2 border border-amber-200">
          <Star className="h-7 w-7 text-amber-600" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base leading-relaxed">{t('subtitle')}</p>
        </div>
      </div>

      {!loading && unlocked && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {t('bannerPro')}
        </div>
      )}

      {!loading && !unlocked && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-medium">{t('bannerLockedTitle')}</p>
          <p className="mt-1 text-amber-900/90 leading-relaxed">{t('bannerLockedBody')}</p>
          <Link
            href={`/${locale}/plans`}
            className="inline-flex mt-3 text-sm font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
          >
            {t('ctaUpgrade')}
          </Link>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <article className="prose prose-gray max-w-none text-gray-800 space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">{t('sectionMapsTitle')}</h2>
            <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionMapsP1')}</p>
            <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionMapsP2')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">{t('sectionDelfinTitle')}</h2>
            <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionDelfinP1')}</p>
            <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionDelfinP2')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">{t('sectionNoApiTitle')}</h2>
            <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionNoApiP1')}</p>
            <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionNoApiP2')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">{t('sectionSurveyTitle')}</h2>
            <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionSurveyP1')}</p>
            <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionSurveyP2')}</p>
            <p className="mt-2 text-sm sm:text-base leading-relaxed text-gray-600">{t('sectionSurveyPolicy')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">{t('sectionNameTitle')}</h2>
            <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionNameP1')}</p>
            <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionNameP2')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">{t('sectionMicrositeTitle')}</h2>
            <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionMicrositeP1')}</p>
            <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionMicrositeP2')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">{t('sectionApiCostTitle')}</h2>
            <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionApiCostP1')}</p>
            <p className="mt-2 text-sm sm:text-base leading-relaxed">{t('sectionApiCostP2')}</p>
          </section>

          <div className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm not-prose">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              {unlocked ? (
                <Star className="h-5 w-5 text-blue-600" />
              ) : (
                <Lock className="h-5 w-5 text-gray-500" />
              )}
              {t('cardTitle')}
            </h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {unlocked ? t('cardBodyPro') : t('cardBodyLocked')}
            </p>
            {!unlocked && (
              <div
                className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-[1px] px-4"
                aria-hidden
              >
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm text-sm font-medium text-gray-700">
                  <Lock className="h-4 w-4" />
                  {t('cardLockedLabel')}
                </div>
              </div>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
