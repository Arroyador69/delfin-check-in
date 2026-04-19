import { useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { shouldShowMobileAds } from '@/lib/plan-ads';
import { notifyMajorActionCompleted } from '@/lib/admob-interstitial';
import { useIsOnboardingRoute } from '@/lib/use-onboarding-ads-block';

/**
 * Tras acciones importantes: como mucho un intersticial por sesión (ver admob-interstitial).
 * Nunca en el onboarding de primera vez.
 */
export function useMajorActionAd() {
  const { session } = useAuth();
  const onOnboarding = useIsOnboardingRoute();

  return useCallback(() => {
    if (onOnboarding) return;
    notifyMajorActionCompleted(shouldShowMobileAds(session?.user?.tenant?.planId));
  }, [session?.user?.tenant?.planId, onOnboarding]);
}
