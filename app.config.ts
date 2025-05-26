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
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#ffffff',
    },
  },
  web: {
    favicon: undefined,
  },
};

export default config; 