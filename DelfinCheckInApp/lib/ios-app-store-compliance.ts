import { Platform } from 'react-native';

/** Reglas App Store 3.1.1 / 5.1.2 — solo aplica al binario iOS. */
export function isIosAppStoreBuild(): boolean {
  return Platform.OS === 'ios';
}

/** Sin CTAs de suscripción/checkout web dentro de la app iOS. */
export function canShowSubscriptionUpgradeInApp(): boolean {
  return !isIosAppStoreBuild();
}

/** Sin afiliado Amazon ni monetización tipo ads en iOS. */
export function canShowAffiliateMonetizationInApp(): boolean {
  return !isIosAppStoreBuild();
}

/** Sin abrir onboarding/alta de cuenta en navegador desde la app iOS. */
export function canOpenWebAccountOnboardingFromApp(): boolean {
  return !isIosAppStoreBuild();
}
