'use client';

import { useTranslations } from 'next-intl';
import type { AffiliatePlacement } from '@/lib/amazon-affiliate';

type AffiliateRecommendationSlotProps = {
  placement: AffiliatePlacement;
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

function affiliateGoHref(placement: AffiliateRecommendationSlotProps['placement']): string {
  const q = new URLSearchParams({ placement });
  return `/api/affiliate/go?${q.toString()}`;
}

export default function AffiliateRecommendationSlot({ placement }: AffiliateRecommendationSlotProps) {
  const t = useTranslations('pwa');
  const href = affiliateGoHref(placement);
  const productImage = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_PRODUCT_IMAGE?.trim();

  return (
    <div className={placementStyles(placement)}>
      <div className="flex items-start gap-3">
        {productImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa opcional (env); sin optimización para evitar dominios en build.
          <a href={href} target="_blank" rel="noopener noreferrer sponsored" className="shrink-0">
            <img
              src={productImage}
              alt=""
              className="h-20 w-20 rounded-md border border-blue-100 bg-white object-contain p-1"
              width={80}
              height={80}
            />
          </a>
        ) : (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-blue-100 bg-white text-3xl"
            aria-hidden
          >
            🧴
          </a>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold leading-snug text-blue-800">{t('affiliateLabel')}</p>
          <a href={href} target="_blank" rel="noopener noreferrer sponsored" className="group block">
            <p className="mt-1 text-sm font-bold text-slate-900 group-hover:underline">{t('affiliateTitle')}</p>
            <p className="mt-1 text-sm text-slate-700">{t('affiliateBody')}</p>
          </a>
          <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-2 py-1 text-xs text-slate-700">
            <span aria-hidden="true">⭐</span>
            <span>{t('affiliateRating')}</span>
            <span aria-hidden="true">•</span>
            <span>{t('affiliateCardHint')}</span>
          </div>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="mt-3 inline-block rounded-md bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {t('affiliateCta')}
          </a>
        </div>
      </div>
    </div>
  );
}
