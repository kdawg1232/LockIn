import { useNavigation } from '@react-navigation/native';
import { PanResponder, Dimensions } from 'react-native';
import { useRef } from 'react';
import swipeNavigationService from '../services/swipeNavigationService';

// Define the main navigation screens in order (left to right in navigation bar)
const MAIN_SCREENS = [
  'OpponentOfTheDay',
  'Stats', 
  'Profile',
  'GroupScreen'
] as const;

type MainScreen = typeof MAIN_SCREENS[number];

export const useSwipeNavigation = (currentScreen: MainScreen) => {
  const navigation = useNavigation();
  const screenWidth = Dimensions.get('window').width;
  
  // Track if we're in the middle of a swipe to prevent multiple navigations
  const isSwipingRef = useRef(false);
  
  // Find current screen index and adjacent screens
  const currentIndex = MAIN_SCREENS.indexOf(currentScreen);
  const previousScreen = currentIndex > 0 ? MAIN_SCREENS[currentIndex - 1] : null;
  const nextScreen = currentIndex < MAIN_SCREENS.length - 1 ? MAIN_SCREENS[currentIndex + 1] : null;
  
  const panResponder = PanResponder.create({
    // Allow gesture to be recognized
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Only respond to horizontal swipes that are significant enough
      const { dx, dy } = gestureState;
      const horizontalDistance = Math.abs(dx);
      const verticalDistance = Math.abs(dy);
      
      // Must be a mostly horizontal gesture with enough distance
      return horizontalDistance > 20 && horizontalDistance > verticalDistance * 2;
    },
    
    // Handle the swipe gesture
    onPanResponderRelease: (evt, gestureState) => {
      // Prevent multiple rapid swipes
      if (isSwipingRef.current) {
        return;
      }
      
      const { dx } = gestureState;
      const swipeThreshold = screenWidth * 0.15; // 15% of screen width
      
      // Determine swipe direction and navigate accordingly
      if (dx > swipeThreshold) {
        // Swipe right - go to previous screen (left in navigation bar)
        if (previousScreen) {
          isSwipingRef.current = true;
          
          // For swipe right, we want the screen to slide in from the left
          swipeNavigationService.navigateToPrevious(previousScreen);
          
          // Reset swipe flag after navigation completes
          setTimeout(() => {
            isSwipingRef.current = false;
          }, 300);
        }
      } else if (dx < -swipeThreshold) {
        // Swipe left - go to next screen (right in navigation bar)  
        if (nextScreen) {
          isSwipingRef.current = true;
          
          // For swipe left, we want the screen to slide in from the right
          swipeNavigationService.navigateToNext(nextScreen);
          
          // Reset swipe flag after navigation completes
          setTimeout(() => {
            isSwipingRef.current = false;
          }, 300);
        }
      }
    },
  });
  
  return {
    panHandlers: panResponder.panHandlers,
    canSwipeLeft: !!nextScreen,
    canSwipeRight: !!previousScreen,
    previousScreen,
    nextScreen,
  };
}; 