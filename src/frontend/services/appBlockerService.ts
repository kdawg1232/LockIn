import { Linking, Platform, Alert } from 'react-native';
import globalTimerService from './globalTimerService';

// List of blocked app URL schemes
const BLOCKED_APPS = {
  instagram: ['instagram://', 'instagram://app'],
  twitter: ['twitter://', 'x://', 'twitter://app'],
  reddit: ['reddit://', 'reddit://app'],
  snapchat: ['snapchat://', 'snapchat://app'],
  tiktok: ['tiktok://', 'tiktok://app', 'snssdk1233://']
};

class AppBlockerService {
  private static instance: AppBlockerService;
  private isInitialized: boolean = false;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): AppBlockerService {
    if (!AppBlockerService.instance) {
      AppBlockerService.instance = new AppBlockerService();
    }
    return AppBlockerService.instance;
  }

  /**
   * Initialize the app blocker service
   * Sets up URL handling to intercept blocked apps
   */
  public initialize() {
    if (this.isInitialized) return;

    // Set up URL event listener
    Linking.addEventListener('url', this.handleDeepLink);

    this.isInitialized = true;
  }

  /**
   * Handle deep link attempts
   */
  private handleDeepLink = async (event: { url: string }) => {
    const url = event.url.toLowerCase();
    
    // Check if focus session is active
    const activeSession = globalTimerService.getActiveFocusSession();
    if (!activeSession) return;

    // Check if URL matches any blocked apps
    for (const [appName, schemes] of Object.entries(BLOCKED_APPS)) {
      if (schemes.some(scheme => url.startsWith(scheme))) {
        // Block the app launch
        const remaining = globalTimerService.getFocusSessionTimeRemaining();
        Alert.alert(
          'App Blocked',
          `${appName} is blocked during focus time. ${Math.ceil(remaining / 60)} minutes remaining.`,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
    }
  };

  /**
   * Check if an app is currently blocked
   */
  public isAppBlocked = async (appScheme: string): Promise<boolean> => {
    const activeSession = globalTimerService.getActiveFocusSession();
    if (!activeSession) return false;

    // Check if URL matches any blocked apps
    for (const schemes of Object.values(BLOCKED_APPS)) {
      if (schemes.some(scheme => appScheme.startsWith(scheme))) {
        return true;
      }
    }
    return false;
  };

  /**
   * Get remaining block time in minutes
   */
  public getBlockTimeRemaining = (): number => {
    const remaining = globalTimerService.getFocusSessionTimeRemaining();
    return Math.ceil(remaining / 60);
  };

  /**
   * Clean up when service is no longer needed
   */
  public cleanup() {
    // Remove URL event listener
    Linking.removeAllListeners('url');
    this.isInitialized = false;
  }
}

export default AppBlockerService.getInstance(); 