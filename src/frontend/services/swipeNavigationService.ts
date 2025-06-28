import { NavigationProp } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';

// Service to handle directional navigation for swipe gestures
class SwipeNavigationService {
  private navigationRef: NavigationProp<any> | null = null;

  setNavigationRef(ref: NavigationProp<any>) {
    this.navigationRef = ref;
  }

  // Navigate with custom animation direction
  navigateWithDirection(screenName: string, direction: 'left' | 'right', params: any = {}) {
    if (!this.navigationRef) {
      console.warn('Navigation ref not set in SwipeNavigationService');
      return;
    }

    // Add direction information to params
    const navigationParams = {
      ...params,
      __swipeDirection: direction,
    };

    // Use CommonActions to navigate with the direction parameter
    const navigateAction = CommonActions.navigate({
      name: screenName,
      params: navigationParams,
    });

    this.navigationRef.dispatch(navigateAction);
  }

  // Navigate to previous screen with left slide animation
  navigateToPrevious(screenName: string, params: any = {}) {
    this.navigateWithDirection(screenName, 'left', params);
  }

  // Navigate to next screen with right slide animation  
  navigateToNext(screenName: string, params: any = {}) {
    this.navigateWithDirection(screenName, 'right', params);
  }
}

export default new SwipeNavigationService(); 