import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';
import { getInterstitialAdUnitId } from './admob-units';

let shownThisSession = false;

/**
 * Tras una acción importante (guardar configuración, etc.): como mucho un intersticial por sesión de app.
 */
export function notifyMajorActionCompleted(adsEnabledForPlan: boolean): void {
  if (!adsEnabledForPlan || shownThisSession) return;

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
}
