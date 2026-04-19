import { useAuth } from '@/lib/auth';
import { shouldShowMobileAds } from '@/lib/plan-ads';
import { isGoogleMobileAdsNativeAvailable } from '@/lib/admob-native-available';

type Props = {
  /** Margen inferior extra (p. ej. safe area) */
  bottomInset?: number;
};

/**
 * Banner fijo en la parte inferior. Solo si el plan del tenant lleva anuncios.
 * En Expo Go o sin módulo nativo enlazado, no renderiza (no importa google-mobile-ads).
 */
export function FixedBannerAd({ bottomInset = 0 }: Props) {
  const { session } = useAuth();
  const planId = session?.user?.tenant?.planId;
  const show = shouldShowMobileAds(planId);

  if (!show || !isGoogleMobileAdsNativeAvailable()) return null;

  const { FixedBannerAdInner } = require('./FixedBannerAdInner') as typeof import('./FixedBannerAdInner');
  return <FixedBannerAdInner bottomInset={bottomInset} />;
}
