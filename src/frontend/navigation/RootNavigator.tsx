import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppState, View, Text } from 'react-native';
import supabase from '../../lib/supabase';
import navigationService from '../services/navigationService';
import globalTimerService from '../services/globalTimerService';
import appBlockerService from '../services/appBlockerService';
import swipeNavigationService from '../services/swipeNavigationService';
import { GlobalModalProvider } from '../contexts/GlobalModalContext';
import { IntroScreen } from '../screens/IntroScreen';
import { AuthNavigator } from './AuthNavigator';
import { CreateProfileScreen } from '../screens/CreateProfileScreen';
import { OpponentOfTheDay } from '../screens/OpponentOfTheDay';
import { StatsScreen } from '../screens/StatsScreen';
import { UserStatsScreen } from '../screens/UserStatsScreen';
import { TimerDistractionScreen } from '../screens/TimerDistractionScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { GroupScreen } from '../screens/GroupScreen';
import { CreateGroupScreen } from '../screens/CreateGroupScreen';
import { GroupInvitesScreen } from '../screens/GroupInvitesScreen';
import { GroupMembersScreen } from '../screens/GroupMembersScreen';
import { SettingsPrivacyScreen } from '../screens/SettingsPrivacyScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';

type RootStackParamList = {
  Intro: undefined;
  Auth: { screen?: string } | undefined;
  CreateProfile: undefined;
  OpponentOfTheDay: undefined;
  Stats: {
    opponentName: string;
    opponentId: string;
  };
  UserStats: undefined;
  OpponentStats: {
    opponentId: string;
    opponentName: string;
  };
  Timer: undefined;
  Profile: undefined;
  GroupScreen: undefined; // Renamed from Community for groups feature
  CreateGroup: undefined; // New screen for creating groups
  GroupInvites: undefined; // New screen for viewing/accepting group invitations
  GroupMembers: { // New screen for viewing group members and details
    groupId: string;
    groupName: string;
  };
  SettingsPrivacy: undefined; // New screen for task 1.31
  EditProfile: undefined; // New screen for editing profile
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Temporary loading component
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Loading...</Text>
  </View>
);

// Create a context to force session refresh
export const SessionContext = React.createContext<{
  refreshSession: () => Promise<void>;
}>({
  refreshSession: async () => {},
});

export const RootNavigator = () => {
  const [session, setSession] = useState<any>(null);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigationRef = useRef<any>(null);

  const checkSessionAndProfile = async () => {
    try {
      const { data: { session } } = await supabase.getSession();
      console.log('🔍 Session check - Got session:', session ? 'Yes' : 'No');
      console.log('🔍 Session user ID:', session?.user?.id);
      setSession(session);

      // If user is logged in, check if they have a profile
      if (session?.user) {
        console.log('🔍 Checking profile for user:', session.user.id);
        
        const { data: profileData, error } = await supabase
          .from('users')
          .select('university, major, profile_completed')
          .eq('id', session.user.id);

        console.log('🔍 Profile query result:', { profileData, error });

        if (!error && profileData && Array.isArray(profileData) && profileData.length > 0) {
          const profile = profileData[0];
          // Check if user has completed their profile (has university and major)
          const profileComplete = profile.university && profile.major;
          console.log('🔍 Profile complete:', profileComplete);
          console.log('🔍 Profile data:', profile);
          setHasProfile(profileComplete);
        } else {
          console.log('🔍 No profile found or error:', error);
          setHasProfile(false);
        }
      } else {
        console.log('🔍 No session user, setting hasProfile to false');
        setHasProfile(false);
      }
    } catch (error) {
      console.error('🔍 Error getting session:', error);
      setSession(null);
      setHasProfile(false);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSession = async () => {
    setIsLoading(true);
    await checkSessionAndProfile();
  };

  // Handle app state changes for timer auto-navigation
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active' && session && hasProfile) {
        // App came to foreground and user is logged in with profile
        // Check if there's an active focus session
        setTimeout(async () => {
          await navigationService.checkForActiveSession();
        }, 500); // Small delay to ensure navigation is ready
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [session, hasProfile]);

  // Initialize app blocker service
  useEffect(() => {
    if (session && hasProfile) {
      appBlockerService.initialize();
      return () => {
        appBlockerService.cleanup();
      };
    }
  }, [session, hasProfile]);

  useEffect(() => {
    console.log('RootNavigator mounted');
    checkSessionAndProfile();
  }, []);

  // Set navigation reference when ready
  const onNavigationReady = () => {
    if (navigationRef.current) {
      navigationService.setNavigationRef(navigationRef.current);
      swipeNavigationService.setNavigationRef(navigationRef.current);
      
      // Check for active session on initial load
      if (session && hasProfile) {
        setTimeout(async () => {
          await navigationService.checkForActiveSession();
        }, 1000); // Delay to ensure everything is loaded
      }
    }
  };

  // Add navigation state change listener to refresh when needed
  const handleNavigationStateChange = () => {
    // If we're logged in but profile status might have changed, recheck
    if (session && !hasProfile) {
      console.log('Navigation state changed, rechecking profile...');
      checkSessionAndProfile();
    }
  };

  if (isLoading) {
    console.log('🔍 Rendering: LoadingScreen (isLoading=true)');
    return <LoadingScreen />;
  }

  console.log('🔍 Navigation Decision:');
  console.log('🔍 - session:', session ? 'EXISTS' : 'NULL');
  console.log('🔍 - hasProfile:', hasProfile);
  console.log('🔍 - isLoading:', isLoading);

  if (!session) {
    console.log('🔍 Rendering: Intro Screen (no session)');
  } else if (!hasProfile) {
    console.log('🔍 Rendering: CreateProfile Screen (session exists, no profile)');
  } else {
    console.log('🔍 Rendering: OpponentOfTheDay Screen (session exists, profile complete)');
  }

  return (
    <SessionContext.Provider value={{ refreshSession }}>
      <NavigationContainer 
        ref={navigationRef}
        onReady={onNavigationReady}
        onStateChange={handleNavigationStateChange}
      >
        <GlobalModalProvider>
          <Stack.Navigator 
            screenOptions={{ 
              headerShown: false,
              // Add smooth transition animations
              animation: 'slide_from_right',
              animationDuration: 300,
              animationTypeForReplace: 'push',
              gestureEnabled: true,
              gestureDirection: 'horizontal',
            }}
          >
            {!session ? (
              <>
                <Stack.Screen 
                  name="Intro" 
                  component={IntroScreen}
                  options={{
                    animation: 'fade',
                    animationDuration: 250,
                  }}
                />
                <Stack.Screen 
                  name="Auth" 
                  component={AuthNavigator}
                  options={{
                    animation: 'slide_from_right',
                    animationDuration: 300,
                  }}
                />
              </>
            ) : !hasProfile ? (
              <Stack.Screen 
                name="CreateProfile" 
                component={CreateProfileScreen}
                options={{
                  animation: 'slide_from_bottom',
                  animationDuration: 350,
                }}
              />
            ) : (
              <>
                <Stack.Screen 
                  name="OpponentOfTheDay" 
                  component={OpponentOfTheDay}
                  options={({ route }) => ({
                    animation: (route.params as any)?.__swipeDirection === 'left' ? 'slide_from_left' : 'slide_from_right',
                    animationDuration: 300,
                  })}
                />
                <Stack.Screen 
                  name="Stats" 
                  component={StatsScreen}
                  options={({ route }) => ({
                    animation: (route.params as any)?.__swipeDirection === 'left' ? 'slide_from_left' : 'slide_from_right',
                    animationDuration: 300,
                  })}
                />
                <Stack.Screen 
                  name="UserStats" 
                  component={UserStatsScreen}
                  options={{
                    animation: 'slide_from_right',
                    animationDuration: 300,
                  }}
                />
                <Stack.Screen 
                  name="OpponentStats" 
                  component={UserStatsScreen}
                  options={{
                    animation: 'slide_from_right',
                    animationDuration: 300,
                  }}
                />
                <Stack.Screen 
                  name="Timer" 
                  component={TimerDistractionScreen}
                  options={{
                    animation: 'slide_from_bottom',
                    animationDuration: 350,
                    gestureEnabled: false, // Disable swipe gesture for timer screen
                  }}
                />
                <Stack.Screen 
                  name="Profile" 
                  component={ProfileScreen}
                  options={({ route }) => ({
                    animation: (route.params as any)?.__swipeDirection === 'left' ? 'slide_from_left' : 'slide_from_right',
                    animationDuration: 300,
                  })}
                />
                <Stack.Screen 
                  name="GroupScreen" 
                  component={GroupScreen}
                  options={({ route }) => ({
                    animation: (route.params as any)?.__swipeDirection === 'left' ? 'slide_from_left' : 'slide_from_right',
                    animationDuration: 300,
                  })}
                />
                <Stack.Screen 
                  name="CreateGroup" 
                  component={CreateGroupScreen}
                  options={{
                    animation: 'slide_from_right',
                    animationDuration: 300,
                  }}
                />
                <Stack.Screen 
                  name="GroupInvites" 
                  component={GroupInvitesScreen}
                  options={{
                    animation: 'slide_from_right',
                    animationDuration: 300,
                  }}
                />
                <Stack.Screen 
                  name="GroupMembers" 
                  component={GroupMembersScreen}
                  options={{
                    animation: 'slide_from_right',
                    animationDuration: 300,
                  }}
                />
                <Stack.Screen 
                  name="SettingsPrivacy" 
                  component={SettingsPrivacyScreen}
                  options={{
                    animation: 'slide_from_right',
                    animationDuration: 300,
                  }}
                />
                <Stack.Screen 
                  name="EditProfile" 
                  component={EditProfileScreen}
                  options={{
                    animation: 'slide_from_right',
                    animationDuration: 300,
                  }}
                />
              </>
            )}
          </Stack.Navigator>
        </GlobalModalProvider>
      </NavigationContainer>
    </SessionContext.Provider>
  );
}; 