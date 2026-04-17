import Constants from 'expo-constants';

/** Origen del panel (misma base que la API) para enlaces públicos del producto (Guest Hub, etc.). */
export function getSiteOrigin(): string {
  const raw =
    Constants.expoConfig?.extra?.API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://admin.delfincheckin.com';
  return String(raw).replace(/\/$/, '');
}
