import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://admin.delfincheckin.com';
  const cleaningPublicBase =
    process.env.EXPO_PUBLIC_CLEANING_PUBLIC_BASE_URL?.trim().replace(/\/$/, '') || '';

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
        'UIApplicationSupportsIndirectInputEvents': false
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
      ]
    ]
  };
};

