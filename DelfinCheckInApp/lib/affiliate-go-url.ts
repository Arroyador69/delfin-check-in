import Constants from 'expo-constants';

/** Debe coincidir con `AFFILIATE_PLACEMENTS` en la API (src/lib/amazon-affiliate.ts). */
export type MobileAffiliatePlacement =
  | 'mobile_dashboard'
  | 'mobile_menu'
  | 'mobile_settings'
  | 'mobile_reservations'
  | 'mobile_calendar';

export function getApiBaseUrl(): string {
  const raw =
    (Constants.expoConfig?.extra as { API_URL?: string } | undefined)?.API_URL ||
    process.env.EXPO_PUBLIC_API_URL ||
    'https://admin.delfincheckin.com';
  return String(raw).replace(/\/$/, '');
}

/** POST público: registra clic en audit (superadmin); la app abre Amazon con `getAmazonAffiliateProductUrl`. */
export function getAffiliateTrackClickUrl(): string {
  return `${getApiBaseUrl()}/api/public/affiliate-click`;
}
