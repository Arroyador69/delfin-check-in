import { useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { shouldShowMobileAds } from '@/lib/plan-ads';
import { notifyMajorActionCompleted } from '@/lib/admob-interstitial';

/**
 * Tras acciones importantes: como mucho un intersticial por sesión (ver admob-interstitial).
 */
export function useMajorActionAd() {
  const { session } = useAuth();

  return useCallback(() => {
    notifyMajorActionCompleted(shouldShowMobileAds(session?.user?.tenant?.planId));
  }, [session?.user?.tenant?.planId]);
}
