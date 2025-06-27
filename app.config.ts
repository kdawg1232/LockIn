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
    "expo-secure-store",
    "expo-dev-client" // Add this for bare workflow
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
    // Add entitlements for Family Controls
    entitlements: {
      "com.apple.developer.family-controls": true
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      // Add required usage descriptions
      NSFamilyControlsUsageDescription: "LockIn needs access to Screen Time to help you focus by temporarily blocking distracting apps during your focus sessions.",
      NSScreenTimeUsageDescription: "LockIn uses Screen Time to track your app usage and provide focus session rewards based on your productivity."
    },
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