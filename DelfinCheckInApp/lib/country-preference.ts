import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';

const COUNTRY_STORAGE_KEY = 'delfin.app_country_code.v1';

export const APP_COUNTRY_CHANGED_EVENT = 'delfin_app_country_changed';

export async function getAppCountryCode(): Promise<string | null> {
  try {
    const raw = await SecureStore.getItemAsync(COUNTRY_STORAGE_KEY);
    if (raw && /^[A-Z]{2}$/i.test(raw)) return raw.toUpperCase();
    return null;
  } catch {
    return null;
  }
}

export async function setAppCountryCode(code: string): Promise<void> {
  await SecureStore.setItemAsync(COUNTRY_STORAGE_KEY, code.toUpperCase());
  DeviceEventEmitter.emit(APP_COUNTRY_CHANGED_EVENT);
}

export async function clearAppCountryCode(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(COUNTRY_STORAGE_KEY);
  } catch {
    /* no key */
  }
  DeviceEventEmitter.emit(APP_COUNTRY_CHANGED_EVENT);
}
