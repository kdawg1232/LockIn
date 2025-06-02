import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
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
  extra: {
    eas: {
      projectId: "6da8d060-89f0-4ad4-8cf1-0dc8505b6c75"
    }
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.karthikdigavalli.lockin',
    associatedDomains: [
      'applinks:lockin.app'
    ],
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#ffffff',
    },
    package: 'com.karthikdigavalli.lockin',
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
}); 