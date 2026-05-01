import { View, Text, Pressable, StyleSheet, Linking, Image } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useAuth } from '@/lib/auth';
import { shouldShowMobileAds } from '@/lib/plan-ads';
import { t, useLocaleListener } from '@/lib/i18n';
import { getAffiliateTrackClickUrl } from '@/lib/affiliate-go-url';
import type { MobileAffiliatePlacement } from '@/lib/affiliate-go-url';
import { getAmazonAffiliateProductUrl } from '@/lib/amazon-affiliate-product-url';

const PRODUCT_IMAGE = require('../assets/affiliate-recommendation-product.png');

type Props = {
  placement: MobileAffiliatePlacement;
  /** `compact`: menú lateral u zonas estrechas */
  variant?: 'full' | 'compact';
  style?: ViewStyle;
};

/**
 * Recomendación Amazon (afiliado), alineada con la web: mismas claves bajo "pwa" en messages
 * Tracking vía POST /api/public/affiliate-click; enlace directo a Amazon con tag de afiliado.
 */
export function AffiliateRecommendationCard({ placement, variant = 'full', style }: Props) {
  useLocaleListener();
  const { session } = useAuth();
  if (!shouldShowMobileAds(session?.user?.tenant?.planId)) {
    return null;
  }

  const amazonUrl = getAmazonAffiliateProductUrl();

  const open = () => {
    const trackUrl = getAffiliateTrackClickUrl();
    void fetch(trackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      },
      body: JSON.stringify({ placement }),
    }).catch(() => {});
    void Linking.openURL(amazonUrl);
  };

  if (variant === 'compact') {
    return (
      <View style={[styles.compactWrap, style]}>
        <Text style={styles.compactLabel}>{t('pwa.affiliateLabel')}</Text>
        <Text style={styles.compactTitle} numberOfLines={2}>
          {t('pwa.affiliateTitle')}
        </Text>
        <Pressable onPress={open} style={styles.compactCta} accessibilityRole="link">
          <Text style={styles.compactCtaText}>{t('pwa.affiliateCta')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.row}>
        <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={t('pwa.affiliateCta')}>
          <Image source={PRODUCT_IMAGE} style={styles.thumb} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Pressable>
        <View style={styles.textCol}>
          <Text style={styles.badge}>{t('pwa.affiliateLabel')}</Text>
          <Text style={styles.title}>{t('pwa.affiliateTitle')}</Text>
          <Text style={styles.body}>{t('pwa.affiliateBody')}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>⭐ {t('pwa.affiliateRating')}</Text>
        <Text style={styles.metaDot}> · </Text>
        <Text style={styles.metaText}>{t('pwa.affiliateCardHint')}</Text>
      </View>
      <Pressable onPress={open} style={styles.cta} accessibilityRole="link">
        <Text style={styles.ctaText}>{t('pwa.affiliateCta')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#fff',
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
    color: '#1e40af',
  },
  title: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  body: {
    marginTop: 8,
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#fff',
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  metaDot: {
    fontSize: 12,
    color: '#94a3b8',
  },
  cta: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  compactWrap: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
    color: '#1e40af',
  },
  compactTitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  compactCta: {
    marginTop: 10,
    alignSelf: 'stretch',
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  compactCtaText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
