import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { getBannerAdUnitId } from '@/lib/admob-units';

type Props = {
  bottomInset?: number;
};

/**
 * Solo importado cuando `isGoogleMobileAdsNativeAvailable()` es true
 * (evita TurboModuleRegistry en Expo Go).
 */
export function FixedBannerAdInner({ bottomInset = 0 }: Props) {
  const { width } = useWindowDimensions();

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
