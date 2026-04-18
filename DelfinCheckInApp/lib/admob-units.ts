import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { TestIds } from 'react-native-google-mobile-ads';

/**
 * IDs de prueba de Google (solo desarrollo). En producción, define en .env / EAS:
 * EXPO_PUBLIC_ADMOB_IOS_BANNER_ID, EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID,
 * EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID, EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID
 */
function extraString(key: string): string | undefined {
  const v = Constants.expoConfig?.extra?.[key];
  return typeof v === 'string' && v.length > 0 ? v : undefined;
}

export function getBannerAdUnitId(): string {
  if (__DEV__) return TestIds.ADAPTIVE_BANNER;
  const ios = extraString('ADMOB_IOS_BANNER_ID');
  const android = extraString('ADMOB_ANDROID_BANNER_ID');
  if (Platform.OS === 'ios' && ios) return ios;
  if (Platform.OS === 'android' && android) return android;
  return TestIds.ADAPTIVE_BANNER;
}

export function getInterstitialAdUnitId(): string {
  if (__DEV__) return TestIds.INTERSTITIAL;
  const ios = extraString('ADMOB_IOS_INTERSTITIAL_ID');
  const android = extraString('ADMOB_ANDROID_INTERSTITIAL_ID');
  if (Platform.OS === 'ios' && ios) return ios;
  if (Platform.OS === 'android' && android) return android;
  return TestIds.INTERSTITIAL;
}
