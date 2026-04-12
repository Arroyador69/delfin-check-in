'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';

export function PlanFreePreviewOverlay({
  title,
  body,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaLabel: string;
}) {
  const locale = useLocale();
  return (
    <div
      className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-white/75 backdrop-blur-[2px] p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-paywall-title"
    >
      <div className="max-w-md rounded-xl border border-blue-200 bg-white p-6 shadow-xl text-center">
        <h3 id="plan-paywall-title" className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-5 leading-relaxed">{body}</p>
        <Link
          href={`/${locale}/plans`}
          className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:from-blue-700 hover:to-indigo-700"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
