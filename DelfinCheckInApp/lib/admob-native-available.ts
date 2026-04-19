import Constants from 'expo-constants';
import { NativeModules } from 'react-native';

/**
 * Expo Go no incluye binarios nativos de terceros (p. ej. Google Mobile Ads).
 * En dev client / release, el módulo debe estar enlazado (pods / Gradle).
 */
export function isGoogleMobileAdsNativeAvailable(): boolean {
  if (Constants.appOwnership === 'expo') {
    return false;
  }
  return NativeModules.RNGoogleMobileAdsModule != null;
}
