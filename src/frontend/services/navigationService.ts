import { NavigationContainerRef } from '@react-navigation/native';
import globalTimerService from './globalTimerService';

// Navigation reference for global navigation
let navigationRef: NavigationContainerRef<any> | null = null;

/**
 * Navigation Service
 * Handles global navigation, especially for timer-related auto-navigation
 */
class NavigationService {
  // Set the navigation reference
  setNavigationRef(ref: NavigationContainerRef<any>) {
    navigationRef = ref;
  }

  // Navigate to a screen
  navigate(screenName: string, params?: any) {
    if (navigationRef?.isReady()) {
      navigationRef.navigate(screenName, params);
    }
  }

  // Check if we need to auto-navigate to timer screen
  async checkForActiveSession() {
    const activeSession = globalTimerService.getActiveFocusSession();
    
    if (activeSession) {
      const remaining = globalTimerService.getFocusSessionTimeRemaining();
      
      if (remaining > 0) {
        // There's an active session - navigate to timer screen
        console.log('Active focus session detected, navigating to timer screen');
        this.navigate('Timer');
        return true;
      } else {
        // Session completed while app was closed - DON'T auto-complete here
        // Let the TimerDistractionScreen handle completion when it detects this
        console.log('Expired focus session detected - will let TimerDistractionScreen handle completion');
        this.navigate('Timer'); // Still navigate to timer screen to handle completion
        return true;
      }
    }
    
    return false;
  }

  // Get current route name
  getCurrentRouteName(): string | undefined {
    if (navigationRef?.isReady()) {
      return navigationRef.getCurrentRoute()?.name;
    }
    return undefined;
  }
}

// Create singleton instance
const navigationService = new NavigationService();

export default navigationService; 