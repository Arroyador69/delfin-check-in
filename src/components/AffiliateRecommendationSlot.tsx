'use client';

import { useTranslations } from 'next-intl';

type AffiliateRecommendationSlotProps = {
  placement: 'banner' | 'menu' | 'sidebar' | 'footer';
};

function placementStyles(placement: AffiliateRecommendationSlotProps['placement']) {
  if (placement === 'menu') {
    return 'mx-2 my-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-3';
  }
  if (placement === 'sidebar') {
    return 'mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4';
  }
  if (placement === 'footer') {
    return 'mt-8 rounded-lg border border-blue-200 bg-blue-50 px-4 py-4';
  }
  return 'border-b border-blue-200 bg-blue-50 px-4 py-4';
}

export default function AffiliateRecommendationSlot({ placement }: AffiliateRecommendationSlotProps) {
  const t = useTranslations('pwa');

  return (
    <div className={placementStyles(placement)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            {t('affiliateLabel')}
          </p>
          <p className="mt-1 text-sm font-bold text-slate-900">{t('affiliateTitle')}</p>
          <p className="mt-1 text-sm text-slate-700">{t('affiliateBody')}</p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-2 py-1 text-xs text-slate-700">
            <span>⭐ 4.8</span>
            <span aria-hidden="true">•</span>
            <span>{t('affiliateCardHint')}</span>
          </div>
          <button
            type="button"
            className="mt-3 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white opacity-90"
          >
            {t('affiliateCta')}
          </button>
        </div>
      </div>
    </div>
  );
}
