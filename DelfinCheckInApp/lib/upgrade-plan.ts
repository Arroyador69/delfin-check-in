// =====================================================
// Abrir flujo "mejorar plan" en el panel web (locale + origen móvil)
// =====================================================

import { Linking } from 'react-native';
import Constants from 'expo-constants';

import { getLocale, type SupportedLocale } from './i18n';

const ADMIN_ORIGIN =
  Constants.expoConfig?.extra?.API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://admin.delfincheckin.com';

function adminBaseUrl(): string {
  return String(ADMIN_ORIGIN).replace(/\/$/, '');
}

/** URL localizada al checkout de planes en Next (`/[locale]/upgrade-plan`). */
export function getUpgradePlanUrl(locale?: SupportedLocale): string {
  const loc = locale ?? getLocale();
  const q = new URLSearchParams({ from: 'mobile' });
  return `${adminBaseUrl()}/${loc}/upgrade-plan?${q.toString()}`;
}

export async function openUpgradePlanInBrowser(locale?: SupportedLocale): Promise<void> {
  await Linking.openURL(getUpgradePlanUrl(locale));
}
