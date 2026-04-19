import { useEffect, useRef } from 'react';
import { isGoogleMobileAdsNativeAvailable } from '@/lib/admob-native-available';
import { useIsOnboardingRoute } from '@/lib/use-onboarding-ads-block';

/**
 * Inicializa el SDK cuando el usuario ya no está en el onboarding de primera vez.
 * Omitido en Expo Go / sin módulo nativo.
 */
export function AdMobInitializer() {
  const done = useRef(false);
  const onOnboarding = useIsOnboardingRoute();

  useEffect(() => {
    if (onOnboarding || done.current || !isGoogleMobileAdsNativeAvailable()) return;
    done.current = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const MobileAds = require('react-native-google-mobile-ads').default;
      void MobileAds()
        .initialize()
        .catch(() => {
          done.current = false;
        });
    } catch {
      done.current = false;
    }
  }, [onOnboarding]);

  return null;
}
