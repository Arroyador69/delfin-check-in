import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useAuth } from '@/lib/auth';
import { shouldShowMobileAds } from '@/lib/plan-ads';
import { getBannerAdUnitId } from '@/lib/admob-units';

type Props = {
  /** Margen inferior extra (p. ej. safe area) */
  bottomInset?: number;
};

/**
 * Banner fijo en la parte inferior. Solo si el plan del tenant lleva anuncios.
 */
export function FixedBannerAd({ bottomInset = 0 }: Props) {
  const { session } = useAuth();
  const planId = session?.user?.tenant?.planId;
  const show = shouldShowMobileAds(planId);
  const { width } = useWindowDimensions();

  if (!show) return null;

  return (
    <View style={[styles.wrap, { paddingBottom: bottomInset }]}>
      <BannerAd
        unitId={getBannerAdUnitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        width={width}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
});
