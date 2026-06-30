'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ListChecks, X } from 'lucide-react';

type ProgressResponse = {
  success?: boolean;
  onboarding_status?: string;
  pending_count?: number;
  pending_steps?: Array<{ id: string; done: boolean }>;
};

const DISMISS_KEY = 'onboarding_banner_dismissed_v1';

export default function OnboardingIncompleteBanner() {
  const t = useTranslations('dashboard');
  const locale = useLocale();
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DISMISS_KEY);
      if (raw === '1') setDismissed(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/onboarding/progress', { credentials: 'include' });
        const json = (await res.json()) as ProgressResponse;
        if (!cancelled && json?.success) setData(json);
      } catch {
        if (!cancelled) setData(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (dismissed || !data || data.onboarding_status === 'completed') return null;
  const pendingCount = data.pending_count ?? 0;
  if (pendingCount <= 0) return null;

  const stepLabels = (data.pending_steps || [])
    .slice(0, 4)
    .map((s) => t(`onboardingBanner.steps.${s.id}` as 'onboardingBanner.steps.password'))
    .join(' · ');

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
  };

  return (
    <div className="mb-4 rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <ListChecks className="w-6 h-6 text-blue-700 shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-blue-950 text-sm sm:text-base leading-snug">
            {t('onboardingBanner.title', { count: pendingCount })}
          </h3>
          <p className="text-xs sm:text-sm text-blue-900/90 mt-1 leading-relaxed">
            {t('onboardingBanner.body')}
          </p>
          {stepLabels ? (
            <p className="text-xs text-blue-800 mt-2 font-medium break-words">{stepLabels}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/${locale}/onboarding`}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 min-h-[44px]"
            >
              {t('onboardingBanner.cta')}
            </Link>
            <a
              href="https://www.youtube.com/watch?v=-bcIKsL1vsM"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-blue-300 text-blue-800 text-sm font-medium hover:bg-blue-100/80 min-h-[44px]"
            >
              {t('onboardingBanner.video')}
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="p-2 rounded-lg text-blue-700 hover:bg-blue-100 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label={t('onboardingBanner.dismiss')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
