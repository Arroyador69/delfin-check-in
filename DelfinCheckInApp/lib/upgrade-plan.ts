// =====================================================
// Abrir flujo "mejorar plan" en el panel web (locale + query persistente tras login)
// =====================================================

import { Linking } from 'react-native';
import Constants from 'expo-constants';

import { getLocale, type SupportedLocale } from './i18n';

const ADMIN_ORIGIN =
  Constants.expoConfig?.extra?.API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://admin.delfincheckin.com';

function adminBaseUrl(): string {
  return String(ADMIN_ORIGIN).replace(/\/$/, '');
}

export type UpgradePlanId = 'checkin' | 'standard' | 'pro';
export type UpgradeBillingInterval = 'month' | 'year';

export type UpgradePlanUrlOptions = {
  /** Plan objetivo en la página web (query `plan`). */
  planId?: UpgradePlanId;
  /** Número de habitaciones/unidades para la calculadora (query `rooms`). */
  roomCount?: number;
  /** Periodicidad de facturación (query `interval`). */
  billingInterval?: UpgradeBillingInterval;
};

/** Siguiente plan recomendado según el plan actual del tenant (para preselección en web). */
export function suggestedUpgradeTargetPlan(planId?: string | null): UpgradePlanId | undefined {
  const p = String(planId || '').toLowerCase();
  if (p === 'free') return 'standard';
  if (p === 'checkin') return 'pro';
  if (p === 'standard') return 'pro';
  return undefined;
}

/** URL localizada al checkout de planes en Next (`/[locale]/upgrade-plan`). */
export function getUpgradePlanUrl(locale?: SupportedLocale, opts?: UpgradePlanUrlOptions): string {
  const loc = locale ?? getLocale();
  const q = new URLSearchParams({ from: 'mobile' });
  if (opts?.planId && ['checkin', 'standard', 'pro'].includes(opts.planId)) {
    q.set('plan', opts.planId);
  }
  if (opts?.roomCount != null && Number.isFinite(opts.roomCount) && opts.roomCount >= 1) {
    q.set('rooms', String(Math.min(999, Math.floor(opts.roomCount))));
  }
  if (opts?.billingInterval === 'month' || opts?.billingInterval === 'year') {
    q.set('interval', opts.billingInterval);
  }
  return `${adminBaseUrl()}/${loc}/upgrade-plan?${q.toString()}`;
}

export async function openUpgradePlanInBrowser(
  locale?: SupportedLocale,
  opts?: UpgradePlanUrlOptions
): Promise<void> {
  await Linking.openURL(getUpgradePlanUrl(locale, opts));
}
