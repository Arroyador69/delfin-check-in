import { getInterstitialAdUnitId } from './admob-units';
import { isGoogleMobileAdsNativeAvailable } from './admob-native-available';

let shownThisSession = false;

/**
 * Tras una acción importante (guardar configuración, etc.): como mucho un intersticial por sesión de app.
 */
export function notifyMajorActionCompleted(adsEnabledForPlan: boolean): void {
  if (!adsEnabledForPlan || shownThisSession) return;
  if (!isGoogleMobileAdsNativeAvailable()) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AdEventType, InterstitialAd } = require('react-native-google-mobile-ads') as typeof import('react-native-google-mobile-ads');

    const interstitial = InterstitialAd.createForAdRequest(getInterstitialAdUnitId(), {
      requestNonPersonalizedAdsOnly: true,
    });

    const unsubClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      unsubClosed();
      shownThisSession = true;
    });

    const unsubError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
      unsubError();
    });

    const unsubLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      unsubLoaded();
      void interstitial.show();
    });

    interstitial.load();
  } catch {
    /* sin módulo nativo */
  }
}
