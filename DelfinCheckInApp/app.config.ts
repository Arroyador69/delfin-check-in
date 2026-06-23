import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://admin.delfincheckin.com';
  /** Base pública (landing). La app iOS no expone registro/planes dentro (App Store 3.1.1). */
  const webPublicBaseUrl =
    process.env.EXPO_PUBLIC_WEB_PUBLIC_BASE_URL?.trim().replace(/\/$/, '') ||
    'https://delfincheckin.com';
  const cleaningPublicBase =
    process.env.EXPO_PUBLIC_CLEANING_PUBLIC_BASE_URL?.trim().replace(/\/$/, '') || '';

  return {
    name: 'Delfín Check-in',
    slug: 'delfin-owner',
    scheme: 'delfin',
    version: '1.1.3',
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
      buildNumber: '7',
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
      versionCode: 4,
      softwareKeyboardLayoutMode: 'resize'
    },
    web: {
      favicon: './assets/favicon.png'
    },
    extra: {
      API_URL: apiUrl,
      WEB_PUBLIC_BASE_URL: webPublicBaseUrl,
      CLEANING_PUBLIC_BASE_URL: cleaningPublicBase,
      /** Amazon afiliado (misma lógica que web; override con EXPO_PUBLIC_AMAZON_*). */
      AMAZON_MARKETPLACE_HOST: process.env.EXPO_PUBLIC_AMAZON_MARKETPLACE_HOST?.trim() || '',
      AMAZON_DEFAULT_ASIN: process.env.EXPO_PUBLIC_AMAZON_DEFAULT_ASIN?.trim() || '',
      AMAZON_ASSOCIATE_TAG: process.env.EXPO_PUBLIC_AMAZON_ASSOCIATE_TAG?.trim() || '',
      eas: {
        projectId: '1408210e-72cc-49ab-b045-f91d89452a4e'
      }
    },
    plugins: [
      'expo-router',
      'expo-web-browser',
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
      ]
    ]
  };
};

