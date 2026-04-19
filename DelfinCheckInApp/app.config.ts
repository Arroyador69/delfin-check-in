import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://admin.delfincheckin.com';
  const cleaningPublicBase =
    process.env.EXPO_PUBLIC_CLEANING_PUBLIC_BASE_URL?.trim().replace(/\/$/, '') || '';

  /**
   * AdMob App ID (incluye ~): distinto por app iOS/Android en la consola.
   * iOS: perfil Delfín Check-in. Android: sustituir cuando exista el perfil en AdMob.
   */
  const admobIosAppId =
    process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID?.trim() ||
    'ca-app-pub-6039298229774115~4354523068';
  const admobAndroidAppId =
    process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID?.trim() ||
    'ca-app-pub-3940256099942544~3347511711';

  return {
    name: 'Delfín Check-in',
    slug: 'delfin-owner',
    scheme: 'delfin',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#0D9488' // Teal del logo de Delfín Check-in
    },
    updates: {
      fallbackToCacheTimeout: 0
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      bundleIdentifier: 'com.desarroyo.delfinowner',
      supportsTablet: false,
      buildNumber: '1',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // Deshabilitar Mac Catalyst para evitar crashes en macOS
        'UIApplicationSupportsIndirectInputEvents': false,
        /** iOS 14+: sin esto, Metro (192.168.x.x:8081) queda bloqueado (“Local network prohibited”). */
        NSLocalNetworkUsageDescription:
          'Conectar con tu Mac en la misma Wi‑Fi para cargar la app en modo desarrollo (Metro).'
      },
      // Deshabilitar Mac Catalyst explícitamente
      requireFullScreen: true
    },
    android: {
      package: 'com.desarroyo.delfinowner',
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#0D9488' // Teal del logo de Delfín Check-in
      },
      versionCode: 1,
      softwareKeyboardLayoutMode: 'resize'
    },
    web: {
      favicon: './assets/favicon.png'
    },
    extra: {
      API_URL: apiUrl,
      CLEANING_PUBLIC_BASE_URL: cleaningPublicBase,
      /** IDs de unidad (banner / intersticial). iOS intersticial creado en AdMob; banner iOS al crear el bloque. */
      ADMOB_IOS_BANNER_ID: process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID || '',
      ADMOB_ANDROID_BANNER_ID: process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID || '',
      ADMOB_IOS_INTERSTITIAL_ID:
        process.env.EXPO_PUBLIC_ADMOB_IOS_INTERSTITIAL_ID?.trim() ||
        'ca-app-pub-6039298229774115/7074688196',
      ADMOB_ANDROID_INTERSTITIAL_ID: process.env.EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_ID || '',
      eas: {
        projectId: '1408210e-72cc-49ab-b045-f91d89452a4e'
      }
    },
    plugins: [
      'expo-router',
      'expo-secure-store',
      'expo-notifications',
      './plugins/withNoMacCatalyst',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
            deploymentTarget: '15.1'
          },
          android: {
            kotlinVersion: '1.9.0'
          }
        }
      ],
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: admobAndroidAppId,
          iosAppId: admobIosAppId,
          userTrackingUsageDescription:
            'Delfín Check-in puede usar este identificador para mostrar anuncios más relevantes. Puedes cambiarlo en Privacidad del iPhone.'
        }
      ]
    ]
  };
};

