import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'LockIn',
  slug: 'lockin',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  assetBundlePatterns: ['**/*'],
  plugins: [
    "expo-secure-store"
  ],
  scheme: 'lockin',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.lockin.app',
    associatedDomains: [
      'applinks:lockin.app'
    ],
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#ffffff',
    },
    package: 'com.lockin.app',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'lockin',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: {
    favicon: undefined,
  },
};

export default config; 